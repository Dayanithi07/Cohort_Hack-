from typing import Any, List
from urllib.parse import parse_qs, unquote, urlparse
import re

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.crud.crud_competitor import competitor as crud_competitor
from app.crud.crud_business import business as crud_business
from app.crud.crud_strategy_insight import strategy_insight as crud_strategy_insight
from app.crud.crud_raw_scraped_data import raw_scraped_data as crud_raw_scraped_data
from app.crud.crud_cleaned_data import cleaned_data as crud_cleaned_data
from app.schemas.strategy_insight import StrategyInsightResponse
from app.schemas.raw_scraped_data import RawScrapedDataResponse
from app.schemas.cleaned_data import CleanedDataResponse
from app.models.user import User
from app.schemas.competitor import (
    CompetitorCreate,
    CompetitorSuggestion,
    CompetitorUpdate,
    CompetitorResponse,
)

router = APIRouter()


def _normalize_domain(url_or_domain: str) -> str:
    if not url_or_domain:
        return ""
    candidate = url_or_domain.strip()
    if not candidate:
        return ""
    if not candidate.startswith(("http://", "https://")):
        candidate = f"https://{candidate}"

    parsed = urlparse(candidate)
    domain = parsed.netloc.lower().strip()
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


def _domain_to_company_name(domain: str) -> str:
    base = domain.split(":")[0].split(".")[0]
    if not base:
        return "Competitor"
    return " ".join(chunk.capitalize() for chunk in base.replace("-", " ").split())


def _extract_target_url(raw_href: str) -> str:
    if not raw_href:
        return ""

    parsed = urlparse(raw_href)
    if parsed.netloc.endswith("duckduckgo.com") and parsed.path.startswith("/l/"):
        query = parse_qs(parsed.query)
        encoded_target = query.get("uddg", [""])[0]
        return unquote(encoded_target)
    return raw_href


def _discover_from_web(
    *,
    business_name: str,
    category: str,
    target_market: str,
    own_domain: str,
) -> List[dict]:
    search_terms = [business_name, "competitors"]
    if category:
        search_terms.append(category)
    if target_market:
        search_terms.append(target_market)
    query = " ".join(term for term in search_terms if term)

    response = httpx.get(
        "https://duckduckgo.com/html/",
        params={"q": query},
        timeout=12,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; CITBot/1.0)",
        },
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    anchors = soup.select("a.result__a")

    suggestions: List[dict] = []
    seen_domains = set()

    for index, anchor in enumerate(anchors[:25]):
        target = _extract_target_url(anchor.get("href", ""))
        domain = _normalize_domain(target)
        if not domain or domain in seen_domains:
            continue
        if own_domain and (domain == own_domain or domain.endswith(f".{own_domain}")):
            continue

        seen_domains.add(domain)
        title = anchor.get_text(" ", strip=True) or _domain_to_company_name(domain)
        score = max(0.45, 0.92 - (index * 0.06))
        suggestions.append(
            {
                "name": title[:80],
                "domain_url": f"https://{domain}",
                "score": round(score, 2),
            }
        )

        if len(suggestions) >= 6:
            break

    return suggestions


def _fallback_suggestions(*, category: str, own_domain: str) -> List[dict]:
    category_seed = (category or "software").strip().lower().replace(" ", "-")
    candidates = [
        f"{category_seed}hq.com",
        f"best{category_seed}.com",
        f"{category_seed}leader.io",
    ]
    suggestions: List[dict] = []
    for idx, domain in enumerate(candidates):
        normalized = _normalize_domain(domain)
        if own_domain and (normalized == own_domain or normalized.endswith(f".{own_domain}")):
            continue
        suggestions.append(
            {
                "name": _domain_to_company_name(normalized),
                "domain_url": f"https://{normalized}",
                "score": round(0.62 - (idx * 0.07), 2),
            }
        )
    return suggestions


@router.get("/", response_model=List[CompetitorResponse])
def read_competitors(
    *,
    db: Session = Depends(deps.get_db),
    business_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve competitors for a given business.
    """
    biz = crud_business.get(db=db, id=business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Business not found")
    return crud_competitor.get_by_business(db, business_id=business_id)


@router.post("/", response_model=CompetitorResponse)
def create_competitor(
    *,
    db: Session = Depends(deps.get_db),
    competitor_in: CompetitorCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Add a new competitor to track.
    """
    biz = crud_business.get(db=db, id=competitor_in.business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Validate URL format
    url = competitor_in.domain_url
    
    # Check if it's a homepage URL (not allowed for e-commerce)
    homepage_patterns = [
        r'^https?://[^/]+/?$',  # Just domain
        r'^https?://[^/]+/[?]?$',  # Domain with trailing slash/query
        r'^https?://www\.amazon\.[^/]+/?$',  # Amazon homepage
        r'^https?://www\.flipkart\.com/?$',  # Flipkart homepage
    ]
    
    if any(re.match(pattern, url) for pattern in homepage_patterns):
        raise HTTPException(
            status_code=400,
            detail="Homepage URLs are not supported. Please use a product page or search URL. Examples: amazon.com/dp/ASIN, flipkart.com/product-name/p/ID, or search URLs like amazon.com/s?k=laptop"
        )
    
    # Check for duplicate
    if crud_competitor.exists_by_domain(db, business_id=competitor_in.business_id, domain_url=url):
        raise HTTPException(
            status_code=400,
            detail="Competitor with this URL already exists for your business"
        )
    
    comp = crud_competitor.create_with_business(db=db, obj_in=competitor_in)
    return comp


@router.get("/{competitor_id}", response_model=CompetitorResponse)
def read_competitor(
    *,
    db: Session = Depends(deps.get_db),
    competitor_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get competitor by ID.
    """
    comp = crud_competitor.get(db=db, id=competitor_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    biz = crud_business.get(db=db, id=comp.business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return comp


@router.put("/{competitor_id}", response_model=CompetitorResponse)
def update_competitor(
    *,
    db: Session = Depends(deps.get_db),
    competitor_id: int,
    competitor_in: CompetitorUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update a competitor.
    """
    comp = crud_competitor.get(db=db, id=competitor_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    biz = crud_business.get(db=db, id=comp.business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    comp = crud_competitor.update(db=db, db_obj=comp, obj_in=competitor_in)
    return comp


@router.delete("/{competitor_id}", response_model=CompetitorResponse)
def delete_competitor(
    *,
    db: Session = Depends(deps.get_db),
    competitor_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a competitor.
    """
    comp = crud_competitor.get(db=db, id=competitor_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    biz = crud_business.get(db=db, id=comp.business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    comp = crud_competitor.remove(db=db, id=competitor_id)
    return comp


@router.get("/discover/suggestions", response_model=List[CompetitorSuggestion])
def suggest_competitors(
    *,
    db: Session = Depends(deps.get_db),
    business_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Return competitor suggestions for a given business."""
    biz = crud_business.get(db=db, id=business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Business not found")

    own_domain = _normalize_domain(biz.website or "")

    try:
        discovered = _discover_from_web(
            business_name=biz.name or "",
            category=biz.category or "",
            target_market=biz.target_market or "",
            own_domain=own_domain,
        )
    except Exception:
        discovered = []

    if discovered:
        return discovered

    return _fallback_suggestions(category=biz.category or "", own_domain=own_domain)


@router.post("/discover/run-pipeline")
def run_discovery_pipeline(
    *,
    db: Session = Depends(deps.get_db),
    business_id: int,
    max_competitors: int = Query(default=3, ge=1, le=10),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Discover competitors, add new ones, and queue scrape jobs in one call."""
    biz = crud_business.get(db=db, id=business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Business not found")

    own_domain = _normalize_domain(biz.website or "")
    existing = crud_competitor.get_by_business(db, business_id=business_id)
    existing_domains = {
        _normalize_domain(item.domain_url)
        for item in existing
        if item.domain_url
    }

    try:
        suggestions = _discover_from_web(
            business_name=biz.name or "",
            category=biz.category or "",
            target_market=biz.target_market or "",
            own_domain=own_domain,
        )
    except Exception:
        suggestions = []

    if not suggestions:
        suggestions = _fallback_suggestions(category=biz.category or "", own_domain=own_domain)

    created = []
    queued_task_ids = []

    from app.tasks import scrape_competitor

    for suggestion in suggestions[:max_competitors]:
        domain = _normalize_domain(suggestion["domain_url"])
        if not domain or domain in existing_domains:
            continue

        comp_in = CompetitorCreate(
            name=suggestion["name"],
            domain_url=suggestion["domain_url"],
            business_id=business_id,
            discovery_method="auto",
            priority_level="high",
        )
        comp = crud_competitor.create_with_business(db=db, obj_in=comp_in)
        existing_domains.add(domain)
        created.append({"id": comp.id, "name": comp.name, "domain_url": comp.domain_url})

        task = scrape_competitor.delay(comp.id)
        queued_task_ids.append(task.id)

    return {
        "business_id": business_id,
        "discovered_count": len(suggestions),
        "created_count": len(created),
        "created_competitors": created,
        "queued_scrape_tasks": queued_task_ids,
    }


@router.post("/discover/approve", response_model=CompetitorResponse)
def approve_competitor(
    *,
    db: Session = Depends(deps.get_db),
    business_id: int,
    name: str,
    domain_url: str,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Approve a suggested competitor and add it to tracking."""
    biz = crud_business.get(db=db, id=business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    comp_in = CompetitorCreate(
        name=name,
        domain_url=domain_url,
        business_id=business_id,
    )
    comp = crud_competitor.create_with_business(db=db, obj_in=comp_in)
    return comp


@router.post("/{competitor_id}/scrape")
def trigger_scrape(
    *,
    db: Session = Depends(deps.get_db),
    competitor_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Trigger a scraping job for a specific competitor."""
    comp = crud_competitor.get(db=db, id=competitor_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    biz = crud_business.get(db=db, id=comp.business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    from app.tasks import scrape_competitor

    task = scrape_competitor.delay(competitor_id)
    return {"task_id": task.id, "status": "queued"}


# --- Insights Endpoint ---
@router.get("/{competitor_id}/insights", response_model=List[StrategyInsightResponse])
def get_strategy_insights(
    *,
    db: Session = Depends(deps.get_db),
    competitor_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    comp = crud_competitor.get(db=db, id=competitor_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    biz = crud_business.get(db=db, id=comp.business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return crud_strategy_insight.get_by_competitor(db, competitor_id=competitor_id)

# --- Raw Data Endpoint ---
@router.get("/{competitor_id}/raw-data", response_model=List[RawScrapedDataResponse])
def get_raw_scraped_data(
    *,
    db: Session = Depends(deps.get_db),
    competitor_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    comp = crud_competitor.get(db=db, id=competitor_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    biz = crud_business.get(db=db, id=comp.business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return crud_raw_scraped_data.get_by_competitor(db, competitor_id=competitor_id)

# --- Cleaned Data Endpoint ---
@router.get("/{competitor_id}/cleaned-data", response_model=List[CleanedDataResponse])
def get_cleaned_data(
    *,
    db: Session = Depends(deps.get_db),
    competitor_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    comp = crud_competitor.get(db=db, id=competitor_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    biz = crud_business.get(db=db, id=comp.business_id)
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return crud_cleaned_data.get_by_competitor(db, competitor_id=competitor_id)

