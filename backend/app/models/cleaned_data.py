from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class CleanedData(Base):
    __tablename__ = "cleaned_data"

    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False)
    url = Column(String, nullable=False)
    product_name = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    # The database column is named "metadata" (as per Alembic migration),
    # but we avoid using the reserved attribute name "metadata" on the SQLAlchemy model.
    metadata_json = Column("metadata", JSON, nullable=True)
    scraped_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    competitor = relationship("Competitor")
