from typing import Optional, List
from pydantic import BaseModel


class BusinessBase(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    category: Optional[str] = None
    target_market: Optional[str] = None
    account_full_name: Optional[str] = None
    account_email: Optional[str] = None
    phone_number: Optional[str] = None
    role_type: Optional[str] = None
    business_type: Optional[str] = None
    business_type_other: Optional[str] = None
    industry_sector: Optional[str] = None
    industry_sector_other: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    product_name: Optional[str] = None
    product_categories_json: Optional[List[str]] = None
    product_subcategories_json: Optional[List[str]] = None
    price_tier: Optional[str] = None
    target_market_geo: Optional[str] = None
    key_product_features: Optional[str] = None
    base_price: Optional[float] = None
    availability_status: Optional[str] = None
    preferred_competitor_platforms: Optional[str] = None


class BusinessCreate(BusinessBase):
    name: str


class BusinessUpdate(BusinessBase):
    pass


class BusinessInDBBase(BusinessBase):
    id: Optional[int] = None
    owner_id: Optional[int] = None

    class Config:
        from_attributes = True


class BusinessResponse(BusinessInDBBase):
    pass
