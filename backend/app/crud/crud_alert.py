from typing import List

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.alert import Alert
from app.schemas.alert import AlertCreate, AlertUpdate


class CRUDAlert(CRUDBase[Alert, AlertCreate, AlertUpdate]):
    def get_by_competitor(self, db: Session, *, competitor_id: int) -> List[Alert]:
        return db.query(Alert).filter(Alert.competitor_id == competitor_id).all()


alert = CRUDAlert(Alert)
