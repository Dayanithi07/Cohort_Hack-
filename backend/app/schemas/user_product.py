from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class UserProductBase(BaseModel):
    name: str
    sku: Optional[str] = None
    base_price: Optional[float] = None
    current_price: Optional[float] = None
    image_url: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None


class UserProductCreate(UserProductBase):
    business_id: int


class UserProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    base_price: Optional[float] = None
    current_price: Optional[float] = None
    image_url: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None


class UserProduct(UserProductBase):
    id: int
    business_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProductBulkUpload(BaseModel):
    """Schema for CSV bulk upload response"""
    total: int
    created: int
    failed: int
    errors: list[str]
