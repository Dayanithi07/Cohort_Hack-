from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=True)
    alert_type = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String, default="medium", nullable=False)  # low, medium, high, critical
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    business = relationship("Business")
    competitor = relationship("Competitor")
