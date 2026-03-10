from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.business import Business
from app.schemas.business import BusinessCreate, BusinessUpdate


class CRUDBusiness(CRUDBase[Business, BusinessCreate, BusinessUpdate]):
    def get_by_owner(self, db: Session, *, owner_id: int) -> List[Business]:
        return db.query(Business).filter(Business.owner_id == owner_id).all()

    def create_with_owner(
        self, db: Session, *, obj_in: BusinessCreate, owner_id: int
    ) -> Business:
        db_obj = Business(
            name=obj_in.name,
            website=obj_in.website,
            category=obj_in.category,
            target_market=obj_in.target_market,
            owner_id=owner_id,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


business = CRUDBusiness(Business)
