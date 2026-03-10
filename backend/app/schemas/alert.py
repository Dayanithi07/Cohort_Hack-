from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AlertBase(BaseModel):
    business_id: Optional[int] = None
    competitor_id: Optional[int] = None
    alert_type: Optional[str] = None
    message: Optional[str] = None
    severity: Optional[str] = "medium"
    created_at: Optional[datetime] = None


class AlertCreate(AlertBase):
    alert_type: str
    message: str
    severity: str = "medium"


class AlertUpdate(AlertBase):
    pass


class AlertInDBBase(AlertBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True


class AlertResponse(AlertInDBBase):
    pass
