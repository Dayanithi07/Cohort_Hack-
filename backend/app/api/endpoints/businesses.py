from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud.crud_business import business as crud_business
from app.models.user import User
from app.schemas.business import BusinessCreate, BusinessUpdate, BusinessResponse

router = APIRouter()


@router.get("/", response_model=List[BusinessResponse])
def read_businesses(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve businesses owned by the current user.
    """
    businesses = crud_business.get_by_owner(db, owner_id=current_user.id)
    return businesses


@router.post("/", response_model=BusinessResponse)
def create_business(
    *,
    db: Session = Depends(deps.get_db),
    business_in: BusinessCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new business.
    """
    biz = crud_business.create_with_owner(
        db=db, obj_in=business_in, owner_id=current_user.id
    )
    return biz


@router.get("/{business_id}", response_model=BusinessResponse)
def read_business(
    *,
    db: Session = Depends(deps.get_db),
    business_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get business by ID.
    """
    biz = crud_business.get(db=db, id=business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    if biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return biz


@router.put("/{business_id}", response_model=BusinessResponse)
def update_business(
    *,
    db: Session = Depends(deps.get_db),
    business_id: int,
    business_in: BusinessUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update business.
    """
    biz = crud_business.get(db=db, id=business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    if biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    biz = crud_business.update(db=db, db_obj=biz, obj_in=business_in)
    return biz


@router.delete("/{business_id}", response_model=BusinessResponse)
def delete_business(
    *,
    db: Session = Depends(deps.get_db),
    business_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete business.
    """
    biz = crud_business.get(db=db, id=business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    if biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    biz = crud_business.remove(db=db, id=business_id)
    return biz
