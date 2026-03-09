from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud.crud_competitor import competitor as crud_competitor
from app.crud.crud_business import business as crud_business
from app.models.user import User
from app.schemas.competitor import (
    CompetitorCreate,
    CompetitorSuggestion,
    CompetitorUpdate,
    CompetitorResponse,
)

router = APIRouter()


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


@router.get("/suggestions", response_model=List[CompetitorSuggestion])
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

    # TODO: Implement real discovery logic (Google search, SimilarWeb, Clearbit).
    # This is a placeholder returning a small set of fake suggestions.
    return [
        {
            "name": "Example Competitor",
            "domain_url": "https://example.com",
            "score": 0.7,
        }
    ]


@router.post("/approve", response_model=CompetitorResponse)
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
