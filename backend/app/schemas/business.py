from typing import Optional, List
from pydantic import BaseModel


class BusinessBase(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    category: Optional[str] = None
    target_market: Optional[str] = None


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
