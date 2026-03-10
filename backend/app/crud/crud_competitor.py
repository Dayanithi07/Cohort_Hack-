from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.competitor import Competitor
from app.schemas.competitor import CompetitorCreate, CompetitorUpdate


class CRUDCompetitor(CRUDBase[Competitor, CompetitorCreate, CompetitorUpdate]):
    def get_by_business(self, db: Session, *, business_id: int) -> List[Competitor]:
        """Get all competitors for a business, deduplicated by domain URL"""
        competitors = db.query(Competitor).filter(
            Competitor.business_id == business_id
        ).order_by(Competitor.id.desc()).all()
        
        # Deduplicate by domain_url - keep the most recent entry (highest ID) for each domain
        seen_domains = set()
        unique_competitors = []
        
        for comp in competitors:
            if comp.domain_url not in seen_domains:
                seen_domains.add(comp.domain_url)
                unique_competitors.append(comp)
        
        return unique_competitors
    
    def exists_by_domain(self, db: Session, *, business_id: int, domain_url: str) -> bool:
        """Check if competitor with same domain already exists for this business"""
        return db.query(Competitor).filter(
            Competitor.business_id == business_id,
            Competitor.domain_url == domain_url
        ).first() is not None

    def create_with_business(
        self, db: Session, *, obj_in: CompetitorCreate
    ) -> Competitor:
        db_obj = Competitor(
            name=obj_in.name,
            domain_url=obj_in.domain_url,
            status=obj_in.status,
            discovery_method=obj_in.discovery_method,
            priority_level=obj_in.priority_level,
            business_id=obj_in.business_id,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


competitor = CRUDCompetitor(Competitor)
