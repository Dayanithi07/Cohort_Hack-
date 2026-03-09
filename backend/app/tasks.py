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


        # --- Real HTML parsing using BeautifulSoup ---
        from bs4 import BeautifulSoup
        html = raw.payload.get("text", "")
        soup = BeautifulSoup(html, "html.parser")

        # Try to extract product name and price heuristically
        product_name = None
        price = None

        # Try common product name selectors
        for selector in ["h1.product-title", "h1", "title", ".product-title", ".product_name"]:
            el = soup.select_one(selector)
            if el and el.get_text(strip=True):
                product_name = el.get_text(strip=True)
                break

        # Try common price selectors
        for selector in [".price", ".product-price", "[class*=price]", "[id*=price]"]:
            el = soup.select_one(selector)
            if el and el.get_text(strip=True):
                import re
                price_text = el.get_text(strip=True)
                match = re.search(r"[\$€₹£]?\s*([0-9]+(?:[.,][0-9]{2})?)", price_text)
                if match:
                    try:
                        price = float(match.group(1).replace(",", "").replace(" ", ""))
                    except Exception:
                        price = None
                break

        cleaned = {
            "competitor_id": raw.competitor_id,
            "url": raw.url,
            "product_name": product_name,
            "price": price,
            "metadata_json": {"source": "raw_html"},
            "scraped_at": raw.scraped_at,
        }

        from app.crud.crud_cleaned_data import cleaned_data as crud_cleaned

        # Check for previous data to detect changes
        from app.crud.crud_alert import alert as crud_alert
        
        # Get the most recent previous cleaned data for this competitor
        previous_data = db.query(crud_cleaned.model).filter(
            crud_cleaned.model.competitor_id == raw.competitor_id
        ).order_by(crud_cleaned.model.scraped_at.desc()).first()
        
        record = crud_cleaned.create(db, obj_in=cleaned)
        
        # --- Alert Detection Logic ---
        if previous_data:
            alerts_to_create = []
            
            # Check for price changes
            if previous_data.price is not None and record.price is not None:
                if abs(previous_data.price - record.price) > 0.01:  # Price changed
                    price_change = record.price - previous_data.price
                    direction = "increased" if price_change > 0 else "decreased"
                    alerts_to_create.append({
                        "competitor_id": record.competitor_id,
                        "alert_type": "price_change",
                        "message": f"Price {direction} from ${previous_data.price:.2f} to ${record.price:.2f} (change: ${price_change:+.2f})"
                    })
            
            # Check for product name changes
            if (previous_data.product_name and record.product_name and 
                previous_data.product_name.strip() != record.product_name.strip()):
                alerts_to_create.append({
                    "competitor_id": record.competitor_id,
                    "alert_type": "product_name_change",
                    "message": f"Product name changed from '{previous_data.product_name}' to '{record.product_name}'"
                })
            
            # Create alerts in database
            for alert_data in alerts_to_create:
                crud_alert.create(db, obj_in=alert_data)

        # Trigger insight generation for the newly cleaned record
        generate_insight.delay(record.id)
        return {"cleaned_id": record.id, "alerts_created": len(alerts_to_create) if previous_data else 0}
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
