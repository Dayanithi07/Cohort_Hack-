from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class RawScrapedDataBase(BaseModel):
    competitor_id: Optional[int] = None
    url: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    scraped_at: Optional[datetime] = None


class RawScrapedDataCreate(RawScrapedDataBase):
    competitor_id: int
    url: str
    payload: Dict[str, Any]


class RawScrapedDataUpdate(RawScrapedDataBase):
    pass


class RawScrapedDataInDBBase(RawScrapedDataBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True


class RawScrapedDataResponse(RawScrapedDataInDBBase):
    pass
