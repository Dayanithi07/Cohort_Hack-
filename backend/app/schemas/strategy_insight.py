from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class StrategyInsightBase(BaseModel):
    business_id: Optional[int] = None
    competitor_id: Optional[int] = None
    product_id: Optional[int] = None
    insight_type: Optional[str] = None
    insight_text: Optional[str] = None
    confidence_score: Optional[float] = None
    action_recommended: Optional[str] = None
    created_at: Optional[datetime] = None


class StrategyInsightCreate(StrategyInsightBase):
    insight_type: str
    insight_text: str


class StrategyInsightUpdate(StrategyInsightBase):
    pass


class StrategyInsightInDBBase(StrategyInsightBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True


class StrategyInsightResponse(StrategyInsightInDBBase):
    pass
