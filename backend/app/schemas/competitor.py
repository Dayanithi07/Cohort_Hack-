from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class CompetitorBase(BaseModel):
    name: Optional[str] = None
    domain_url: Optional[str] = None
    status: Optional[str] = "active"
    discovery_method: Optional[str] = "manual"
    priority_level: Optional[str] = "medium"
    last_scraped_at: Optional[datetime] = None


class CompetitorCreate(CompetitorBase):
    name: str
    domain_url: str
    business_id: int


class CompetitorUpdate(CompetitorBase):
    pass


class CompetitorInDBBase(CompetitorBase):
    id: Optional[int] = None
    business_id: Optional[int] = None

    class Config:
        from_attributes = True


class CompetitorResponse(CompetitorInDBBase):
    pass


class CompetitorSuggestion(BaseModel):
    name: str
    domain_url: str
    score: Optional[float] = None
