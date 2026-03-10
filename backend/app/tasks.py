from datetime import datetime

import httpx

from app.core.celery_app import celery
from app.core.config import settings
from app.crud.crud_competitor import competitor as crud_competitor
from app.crud.crud_raw_scraped_data import raw_scraped_data as crud_raw
from app.db.session import SessionLocal


@celery.task(name="app.tasks.scrape_competitor")
def scrape_competitor(competitor_id: int) -> dict:
    """Fetch the competitor domain using enhanced e-commerce scraper."""
    db = SessionLocal()
    try:
        comp = crud_competitor.get(db, id=competitor_id)
        if not comp:
            return {"error": "competitor_not_found", "competitor_id": competitor_id}

        from app.services.ecommerce_scraper import EcommerceScraper
        
        # Initialize scraper
        scraper = EcommerceScraper(comp.domain_url)
        
        # Fetch HTML
        html = scraper.fetch_html(verify_ssl=settings.SCRAPER_VERIFY_SSL)
        
        if not html:
            return {"error": "fetch_failed", "message": "Could not fetch HTML"}

        # Store raw HTML
        payload = {
            "status_code": 200,
            "text": html,
            "platform": scraper.platform["name"] if scraper.platform else "unknown",
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

        # Update competitor's last_scraped_at timestamp
        comp.last_scraped_at = datetime.utcnow()
        db.commit()

        # Trigger normalization pipeline
        normalize_raw_data.delay(raw.id)
        return {"raw_id": raw.id, "competitor_id": competitor_id, "platform": payload["platform"]}
    finally:
        db.close()


@celery.task(name="app.tasks.normalize_raw_data")
def normalize_raw_data(raw_id: int) -> dict:
    """Normalize raw scraped data using enhanced e-commerce parser."""
    db = SessionLocal()
    try:
        raw = crud_raw.get(db, id=raw_id)
        if not raw:
            return {"error": "raw_not_found", "raw_id": raw_id}

        from app.services.ecommerce_scraper import EcommerceScraper
        from app.crud.crud_cleaned_data import cleaned_data as crud_cleaned
        from app.crud.crud_alert import alert as crud_alert
        
        # Get competitor for URL context
        comp = crud_competitor.get(db, id=raw.competitor_id)
        if not comp:
            return {"error": "competitor_not_found"}
        
        # Initialize scraper for parsing
        scraper = EcommerceScraper(raw.url)
        html = raw.payload.get("text", "")
        
        # Check if this is a listing page or single product
        is_listing, scraped_data = scraper.scrape(verify_ssl=False)
        
        # If we already have HTML, just parse it directly
        if html:
            products = scraper.extract_product_listing(html)
            if len(products) > 1:
                is_listing = True
                scraped_data = {"is_listing": True, "products": products}
            elif len(products) == 1:
                is_listing = False
                scraped_data = {"is_listing": False, **products[0]}
            else:
                # Fallback to single product extraction
                product_data = scraper.extract_product(html)
                is_listing = False
                scraped_data = {"is_listing": False, **product_data}
        
        cleaned_records = []
        alerts_created = 0
        
        # Handle listing page (multiple products)
        if is_listing and "products" in scraped_data:
            for product in scraped_data["products"]:
                # Skip products without meaningful data
                if not product.get("product_name") or (not product.get("price") and not product.get("image_url")):
                    continue
                    
                cleaned = {
                    "competitor_id": raw.competitor_id,
                    "url": product.get("url") or raw.url,
                    "product_name": product.get("product_name"),
                    "price": product.get("price"),
                    "metadata_json": {
                        "source": "ecommerce_scraper",
                        "is_listing": True,
                        "image_url": product.get("image_url"),
                    },
                    "scraped_at": raw.scraped_at,
                }
                
                # Create cleaned data record
                record = crud_cleaned.create(db, obj_in=cleaned)
                cleaned_records.append(record.id)
                    
                    # Check for price changes
                    previous_data = db.query(crud_cleaned.model).filter(
                        crud_cleaned.model.competitor_id == raw.competitor_id,
                        crud_cleaned.model.product_name == cleaned["product_name"]
                    ).order_by(crud_cleaned.model.scraped_at.desc()).offset(1).first()
                    
                    if previous_data and previous_data.price and cleaned["price"]:
                        if abs(previous_data.price - cleaned["price"]) > 0.01:
                            price_change = cleaned["price"] - previous_data.price
                            direction = "increased" if price_change > 0 else "decreased"
                            crud_alert.create(db, obj_in={
                                "competitor_id": raw.competitor_id,
                                "alert_type": "price_change",
                                "message": f"{cleaned['product_name']}: Price {direction} from ${previous_data.price:.2f} to ${cleaned['price']:.2f}",
                                "severity": "high" if abs(price_change) > (previous_data.price * 0.1) else "medium"
                            })
                            alerts_created += 1
        
        # Handle single product page
        else:
            # Skip if no meaningful product data found
            if not scraped_data.get("product_name") or (not scraped_data.get("price") and not scraped_data.get("image_url")):
                return {
                    "error": "no_product_data",
                    "message": "Could not extract product information. The URL may be a homepage, category page, or non-product page. Please use a specific product URL (e.g., amazon.com/dp/PRODUCTID) or search URL (e.g., amazon.com/s?k=query).",
                    "raw_id": raw_id,
                    "url": raw.url
                }
            
            cleaned = {
                "competitor_id": raw.competitor_id,
                "url": scraped_data.get("url") or raw.url,
                "product_name": scraped_data.get("product_name"),
                "price": scraped_data.get("price"),
                "metadata_json": {
                    "source": "ecommerce_scraper",
                    "is_listing": False,
                    "image_url": scraped_data.get("image_url"),
                    "description": scraped_data.get("description"),
                },
                "scraped_at": raw.scraped_at,
            }
            
            # Create cleaned data record
            record = crud_cleaned.create(db, obj_in=cleaned)
            cleaned_records.append(record.id)
            
            # Check for price changes
            previous_data = db.query(crud_cleaned.model).filter(
                crud_cleaned.model.competitor_id == raw.competitor_id
            ).order_by(crud_cleaned.model.scraped_at.desc()).offset(1).first()
            
            if previous_data and previous_data.price and cleaned["price"]:
                if abs(previous_data.price - cleaned["price"]) > 0.01:
                    price_change = cleaned["price"] - previous_data.price
                    direction = "increased" if price_change > 0 else "decreased"
                    crud_alert.create(db, obj_in={
                        "competitor_id": raw.competitor_id,
                        "alert_type": "price_change",
                        "message": f"Price {direction} from ${previous_data.price:.2f} to ${cleaned['price']:.2f} (change: ${price_change:+.2f})",
                        "severity": "high" if abs(price_change) > (previous_data.price * 0.1) else "medium"
                    })
                    alerts_created += 1
            
            # Trigger insight generation for the newly cleaned record
            if cleaned_records:
                generate_insight.delay(cleaned_records[0])
        
        # Auto-trigger product insights generation for the business
        if cleaned_records:
            comp = crud_competitor.get(db, id=raw.competitor_id)
            if comp and comp.business_id:
                generate_product_insights.delay(comp.business_id)
        
        return {
            "cleaned_ids": cleaned_records,
            "total_products": len(cleaned_records),
            "alerts_created": alerts_created,
            "is_listing": is_listing,
        }
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


@celery.task(name="app.tasks.generate_product_insights")
def generate_product_insights(business_id: int) -> dict:
    """
    Analyze all user products for a business and generate profit insights.
    Compares user products against competitor data using fuzzy matching.
    """
    db = SessionLocal()
    try:
        from app.services.profit_insights import bulk_analyze_products
        
        results = bulk_analyze_products(db=db, business_id=business_id)
        
        return {
            "business_id": business_id,
            "total_products": results["total_products"],
            "analyzed": results["analyzed"],
            "insights_generated": results["insights_generated"],
            "alerts_generated": results["alerts_generated"]
        }
    except Exception as e:
        return {
            "error": "insight_generation_failed",
            "message": str(e),
            "business_id": business_id
        }
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
