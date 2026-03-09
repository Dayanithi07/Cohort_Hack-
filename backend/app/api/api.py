from fastapi import APIRouter

from app.api.endpoints import (
    auth,
    users,
    businesses,
    business_profile,
    competitors,
    scraper_configs,
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
