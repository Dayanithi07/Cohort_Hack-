from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud.crud_business import business as crud_business
from app.models.user import User
from app.schemas.business import BusinessCreate, BusinessResponse

router = APIRouter()

@router.post("/profile", response_model=BusinessResponse)
def create_business_profile(
    *,
    db: Session = Depends(deps.get_db),
    business_in: BusinessCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Create the user's primary business profile."""
    existing = crud_business.get_by_owner(db, owner_id=current_user.id)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Onboarding already completed for this user.",
        )

    biz = crud_business.create_with_owner(
        db=db, obj_in=business_in, owner_id=current_user.id
    )
    # TODO: Trigger competitor discovery pipeline for the new business.
    return biz
