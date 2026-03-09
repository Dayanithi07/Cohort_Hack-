from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class RawScrapedData(Base):
    __tablename__ = "raw_scraped_data"

    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False)
    url = Column(String, nullable=False)
    payload = Column(JSON, nullable=False)
    scraped_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    competitor = relationship("Competitor")
