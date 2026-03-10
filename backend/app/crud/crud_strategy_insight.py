from typing import List

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.strategy_insight import StrategyInsight
from app.schemas.strategy_insight import StrategyInsightCreate, StrategyInsightUpdate


class CRUDStrategyInsight(CRUDBase[StrategyInsight, StrategyInsightCreate, StrategyInsightUpdate]):
    def get_by_competitor(self, db: Session, *, competitor_id: int) -> List[StrategyInsight]:
        return db.query(StrategyInsight).filter(StrategyInsight.competitor_id == competitor_id).all()


strategy_insight = CRUDStrategyInsight(StrategyInsight)
