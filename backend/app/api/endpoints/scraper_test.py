"""
Scraper Testing Endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl

from app.api import deps
from app.models.user import User
from app.services.ecommerce_scraper import EcommerceScraper, PlatformConfig

router = APIRouter()


class ScrapeTestRequest(BaseModel):
    url: str
    max_products: Optional[int] = 20


class ScrapeTestResponse(BaseModel):
    success: bool
    platform: Optional[str] = None
    is_listing: bool
    products_found: int
    products: list
    error: Optional[str] = None


@router.post("/test-scrape", response_model=ScrapeTestResponse)
def test_scrape_url(
    *,
    db: Session = Depends(deps.get_db),
    request: ScrapeTestRequest,
    current_user: User = Depends(deps.get_current_user),
) -> ScrapeTestResponse:
    """
    Test scraping a URL to see what products can be extracted.
    This helps users verify competitor URLs before adding them.
    """
    try:
        # Initialize scraper
        scraper = EcommerceScraper(request.url)
        
        # Detect platform
        platform = PlatformConfig.get_platform(request.url)
        platform_name = platform["name"] if platform else "Unknown"
        
        # Fetch HTML
        html = scraper.fetch_html(verify_ssl=False)
        
        if not html:
            return ScrapeTestResponse(
                success=False,
                platform=platform_name,
                is_listing=False,
                products_found=0,
                products=[],
                error="Failed to fetch HTML from URL"
            )
        
        # Extract products
        products = scraper.extract_product_listing(html, max_products=request.max_products)
        
        is_listing = len(products) > 1
        
        # Format response
        formatted_products = []
        for product in products:
            formatted_products.append({
                "name": product.get("product_name"),
                "price": product.get("price"),
                "url": product.get("url"),
                "image": product.get("image_url"),
            })
        
        return ScrapeTestResponse(
            success=True,
            platform=platform_name,
            is_listing=is_listing,
            products_found=len(formatted_products),
            products=formatted_products,
        )
        
    except Exception as e:
        return ScrapeTestResponse(
            success=False,
            platform=None,
            is_listing=False,
            products_found=0,
            products=[],
            error=str(e)
        )


@router.get("/supported-platforms")
def get_supported_platforms(
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """
    Get list of supported e-commerce platforms with examples.
    """
    return {
        "platforms": [
            {
                "name": "Amazon",
                "domains": ["amazon.com", "amazon.in", "amazon.co.uk", "amazon.de"],
                "example_urls": [
                    "https://www.amazon.com/dp/B08N5WRWNW",
                    "https://www.amazon.in/s?k=laptop",
                ],
                "supports_listing": True,
                "supports_product": True,
            },
            {
                "name": "Flipkart",
                "domains": ["flipkart.com"],
                "example_urls": [
                    "https://www.flipkart.com/search?q=mobile",
                    "https://www.flipkart.com/product/p/itmxxxx",
                ],
                "supports_listing": True,
                "supports_product": True,
            },
            {
                "name": "Walmart",
                "domains": ["walmart.com"],
                "example_urls": [
                    "https://www.walmart.com/ip/12345",
                ],
                "supports_listing": False,
                "supports_product": True,
            },
            {
                "name": "eBay",
                "domains": ["ebay.com", "ebay.in", "ebay.co.uk"],
                "example_urls": [
                    "https://www.ebay.com/itm/12345",
                ],
                "supports_listing": False,
                "supports_product": True,
            },
            {
                "name": "Generic",
                "domains": ["*"],
                "example_urls": [],
                "supports_listing": False,
                "supports_product": True,
                "note": "We'll attempt to extract product information from any e-commerce site using common patterns"
            }
        ]
    }
