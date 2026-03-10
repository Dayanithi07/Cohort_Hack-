from sqlalchemy import Column, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    website = Column(String)
    category = Column(String)
    target_market = Column(String)
    account_full_name = Column(String)
    account_email = Column(String)
    phone_number = Column(String)
    role_type = Column(String)
    business_type = Column(String)
    business_type_other = Column(String)
    industry_sector = Column(String)
    industry_sector_other = Column(String)
    country = Column(String)
    city = Column(String)
    product_name = Column(String)
    product_categories_json = Column(JSON)
    product_subcategories_json = Column(JSON)
    price_tier = Column(String)
    target_market_geo = Column(String)
    key_product_features = Column(String)
    base_price = Column(Float)
    availability_status = Column(String)
    preferred_competitor_platforms = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="businesses")
    competitors = relationship("Competitor", back_populates="business")
