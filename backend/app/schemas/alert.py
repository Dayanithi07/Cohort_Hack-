from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AlertBase(BaseModel):
    competitor_id: Optional[int] = None
    alert_type: Optional[str] = None
    message: Optional[str] = None
    created_at: Optional[datetime] = None


class AlertCreate(AlertBase):
    competitor_id: int
    alert_type: str
    message: str


class AlertUpdate(AlertBase):
    pass


class AlertInDBBase(AlertBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True


class AlertResponse(AlertInDBBase):
    pass
