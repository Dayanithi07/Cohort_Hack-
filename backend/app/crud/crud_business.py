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
            category=obj_in.category or obj_in.industry_sector,
            target_market=obj_in.target_market or obj_in.target_market_geo,
            account_full_name=obj_in.account_full_name,
            account_email=obj_in.account_email,
            phone_number=obj_in.phone_number,
            role_type=obj_in.role_type,
            business_type=obj_in.business_type,
            business_type_other=obj_in.business_type_other,
            industry_sector=obj_in.industry_sector,
            industry_sector_other=obj_in.industry_sector_other,
            country=obj_in.country,
            city=obj_in.city,
            product_name=obj_in.product_name,
            product_categories_json=obj_in.product_categories_json,
            product_subcategories_json=obj_in.product_subcategories_json,
            price_tier=obj_in.price_tier,
            target_market_geo=obj_in.target_market_geo,
            key_product_features=obj_in.key_product_features,
            base_price=obj_in.base_price,
            availability_status=obj_in.availability_status,
            preferred_competitor_platforms=obj_in.preferred_competitor_platforms,
            owner_id=owner_id,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


business = CRUDBusiness(Business)
