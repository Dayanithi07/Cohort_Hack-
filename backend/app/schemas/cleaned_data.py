from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class CleanedDataBase(BaseModel):
    competitor_id: Optional[int] = None
    url: Optional[str] = None
    product_name: Optional[str] = None
    price: Optional[float] = None
    metadata_json: Optional[Dict[str, Any]] = None
    scraped_at: Optional[datetime] = None


class CleanedDataCreate(CleanedDataBase):
    competitor_id: int
    url: str


class CleanedDataUpdate(CleanedDataBase):
    pass


class CleanedDataInDBBase(CleanedDataBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True


class CleanedDataResponse(CleanedDataInDBBase):
    pass
