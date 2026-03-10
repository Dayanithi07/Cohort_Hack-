from typing import List

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.cleaned_data import CleanedData
from app.schemas.cleaned_data import CleanedDataCreate, CleanedDataUpdate


class CRUDCleanedData(CRUDBase[CleanedData, CleanedDataCreate, CleanedDataUpdate]):
    def get_by_competitor(self, db: Session, *, competitor_id: int) -> List[CleanedData]:
        return db.query(CleanedData).filter(CleanedData.competitor_id == competitor_id).all()


cleaned_data = CRUDCleanedData(CleanedData)
