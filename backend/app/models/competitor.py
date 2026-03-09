from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Competitor(Base):
    __tablename__ = "competitors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    domain_url = Column(String, nullable=False)
    status = Column(String, default="active")
    discovery_method = Column(String, default="manual")
    priority_level = Column(String, default="medium")
    business_id = Column(Integer, ForeignKey("businesses.id"))

    business = relationship("Business", back_populates="competitors")
