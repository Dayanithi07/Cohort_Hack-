from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.user_product import UserProduct
from app.schemas.user_product import UserProductCreate, UserProductUpdate


class CRUDUserProduct(CRUDBase[UserProduct, UserProductCreate, UserProductUpdate]):
    def get_by_business(
        self, db: Session, *, business_id: int, skip: int = 0, limit: int = 100
    ) -> List[UserProduct]:
        """Get all products for a specific business"""
        return (
            db.query(UserProduct)
            .filter(UserProduct.business_id == business_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_sku(self, db: Session, *, sku: str) -> Optional[UserProduct]:
        """Get product by SKU"""
        return db.query(UserProduct).filter(UserProduct.sku == sku).first()

    def create_with_business(
        self, db: Session, *, obj_in: UserProductCreate, business_id: int
    ) -> UserProduct:
        """Create a new product for a specific business"""
        obj_in_data = obj_in.model_dump()
        obj_in_data["business_id"] = business_id
        db_obj = UserProduct(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_category(
        self, db: Session, *, business_id: int, category: str
    ) -> List[UserProduct]:
        """Get products by category for a business"""
        return (
            db.query(UserProduct)
            .filter(
                UserProduct.business_id == business_id,
                UserProduct.category == category
            )
            .all()
        )


user_product = CRUDUserProduct(UserProduct)
