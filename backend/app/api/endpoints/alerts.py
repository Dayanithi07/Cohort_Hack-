from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud.crud_alert import alert as crud_alert
from app.models.user import User
from app.schemas.alert import AlertResponse

router = APIRouter()

@router.get("/", response_model=List[AlertResponse])
def list_alerts(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """List all alerts for competitors owned by the current user."""
    # Get all competitor IDs for businesses owned by the user
    competitor_ids = []
    for biz in current_user.businesses:
        competitor_ids.extend([c.id for c in biz.competitors])
    # If user model doesn't have relationships, fallback to query
    if not competitor_ids:
        from app.crud.crud_business import business as crud_business
        businesses = crud_business.get_by_owner(db, owner_id=current_user.id)
        for biz in businesses:
            competitor_ids.extend([c.id for c in biz.competitors])
    alerts = []
    for cid in competitor_ids:
        alerts.extend(crud_alert.get_by_competitor(db, competitor_id=cid))
    return alerts
