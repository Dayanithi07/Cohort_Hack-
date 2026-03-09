from typing import List

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.raw_scraped_data import RawScrapedData
from app.schemas.raw_scraped_data import RawScrapedDataCreate, RawScrapedDataUpdate


class CRUDRawScrapedData(CRUDBase[RawScrapedData, RawScrapedDataCreate, RawScrapedDataUpdate]):
    def get_by_competitor(self, db: Session, *, competitor_id: int) -> List[RawScrapedData]:
        return db.query(RawScrapedData).filter(RawScrapedData.competitor_id == competitor_id).all()


raw_scraped_data = CRUDRawScrapedData(RawScrapedData)
