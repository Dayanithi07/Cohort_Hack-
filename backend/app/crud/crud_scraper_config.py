from typing import List, Optional

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.scraper import ScraperConfig
from app.schemas.scraper import ScraperConfigCreate, ScraperConfigUpdate


class CRUDBasicScraperConfig(
    CRUDBase[ScraperConfig, ScraperConfigCreate, ScraperConfigUpdate]
):
    def get_by_domain(self, db: Session, *, domain_url: str) -> Optional[ScraperConfig]:
        return db.query(ScraperConfig).filter(ScraperConfig.domain_url == domain_url).first()

    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[ScraperConfig]:
        return db.query(ScraperConfig).offset(skip).limit(limit).all()


scraper_config = CRUDBasicScraperConfig(ScraperConfig)
