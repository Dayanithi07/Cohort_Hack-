from sqlalchemy import Column, Integer, String, JSON
from app.db.base_class import Base

class ScraperConfig(Base):
    __tablename__ = "scraper_configs"

    id = Column(Integer, primary_key=True, index=True)
    domain_url = Column(String, unique=True, index=True, nullable=False)
    spider_type = Column(String, nullable=False) # e.g., product, pricing
    css_selectors_json = Column(JSON, nullable=False) # Stores the rules for parsing this domain
