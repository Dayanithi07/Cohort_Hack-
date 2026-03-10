from fastapi import APIRouter

from app.api.endpoints import (
    auth,
    users,
    businesses,
    business_profile,
    competitors,
    scraper_configs,
    alerts,
    products,
    scraper_test,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(
    business_profile.router, prefix="/business", tags=["business"]
)
api_router.include_router(businesses.router, prefix="/businesses", tags=["businesses"])
api_router.include_router(competitors.router, prefix="/competitors", tags=["competitors"])
api_router.include_router(scraper_configs.router, prefix="/scraper-configs", tags=["scraper-configs"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(scraper_test.router, prefix="/scraper", tags=["scraper"])
