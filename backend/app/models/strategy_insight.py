from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Float
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class StrategyInsight(Base):
    __tablename__ = "strategy_insights"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("user_products.id"), nullable=True)
    insight_type = Column(String, nullable=False)
    insight_text = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=True)
    action_recommended = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    business = relationship("Business")
    competitor = relationship("Competitor")
    product = relationship("UserProduct")
