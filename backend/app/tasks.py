from datetime import datetime

import httpx

from app.core.celery_app import celery
from app.core.config import settings
from app.crud.crud_competitor import competitor as crud_competitor
from app.crud.crud_raw_scraped_data import raw_scraped_data as crud_raw
from app.db.session import SessionLocal


@celery.task(name="app.tasks.scrape_competitor")
def scrape_competitor(competitor_id: int) -> dict:
    """Fetch the competitor domain and store raw HTML payload."""
    db = SessionLocal()
    try:
        comp = crud_competitor.get(db, id=competitor_id)
        if not comp:
            return {"error": "competitor_not_found", "competitor_id": competitor_id}

        try:
            response = httpx.get(
                comp.domain_url,
                timeout=30,
                verify=settings.SCRAPER_VERIFY_SSL,
            )
            response.raise_for_status()
        except Exception as e:
            return {"error": "fetch_failed", "message": str(e)}

        payload = {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "text": response.text,
        }

        raw = crud_raw.create(
            db,
            obj_in={
                "competitor_id": competitor_id,
                "url": comp.domain_url,
                "payload": payload,
                "scraped_at": datetime.utcnow(),
            },
        )

        # Trigger normalization pipeline
        normalize_raw_data.delay(raw.id)
        return {"raw_id": raw.id, "competitor_id": competitor_id}
    finally:
        db.close()


@celery.task(name="app.tasks.normalize_raw_data")
def normalize_raw_data(raw_id: int) -> dict:
    """Normalize raw scraped data into structured output."""
    db = SessionLocal()
    try:
        raw = crud_raw.get(db, id=raw_id)
        if not raw:
            return {"error": "raw_not_found", "raw_id": raw_id}

        # Simple placeholder normalization
        cleaned = {
            "competitor_id": raw.competitor_id,
            "url": raw.url,
            "product_name": None,
            "price": None,
            "metadata_json": {"source": "raw_html"},
            "scraped_at": raw.scraped_at,
        }

        from app.crud.crud_cleaned_data import cleaned_data as crud_cleaned

        record = crud_cleaned.create(db, obj_in=cleaned)

        # Trigger insight generation for the newly cleaned record
        generate_insight.delay(record.id)
        return {"cleaned_id": record.id}
    finally:
        db.close()


@celery.task(name="app.tasks.generate_insight")
def generate_insight(cleaned_id: int) -> dict:
    """Generate a simple insight based on cleaned data."""
    db = SessionLocal()
    try:
        from app.crud.crud_cleaned_data import cleaned_data as crud_cleaned
        from app.crud.crud_strategy_insight import strategy_insight as crud_insight

        cleaned = crud_cleaned.get(db, id=cleaned_id)
        if not cleaned:
            return {"error": "cleaned_not_found", "cleaned_id": cleaned_id}

        # Placeholder insight: record that a scrape happened
        insight = crud_insight.create(
            db,
            obj_in={
                "competitor_id": cleaned.competitor_id,
                "insight_type": "scrape_complete",
                "insight_text": f"Scraped data for competitor {cleaned.competitor_id} at {cleaned.scraped_at}",
            },
        )
        return {"insight_id": insight.id}
    finally:
        db.close()


@celery.task(name="app.tasks.schedule_scraping")
def schedule_scraping() -> dict:
    """Schedule scraping jobs for all active competitors."""
    db = SessionLocal()
    try:
        comps = crud_competitor.get_multi(db)
        job_count = 0
        for comp in comps:
            scrape_competitor.delay(comp.id)
            job_count += 1
        return {"scheduled": job_count}
    finally:
        db.close()
