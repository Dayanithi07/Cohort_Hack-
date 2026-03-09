from typing import Any, Dict, Optional
from pydantic import BaseModel, HttpUrl


class ScraperConfigBase(BaseModel):
    domain_url: HttpUrl
    spider_type: Optional[str] = None
    css_selectors_json: Optional[Dict[str, Any]] = None


class ScraperConfigCreate(ScraperConfigBase):
    domain_url: HttpUrl
    spider_type: str
    css_selectors_json: Dict[str, Any]


class ScraperConfigUpdate(ScraperConfigBase):
    pass


class ScraperConfigInDBBase(ScraperConfigBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True


class ScraperConfigResponse(ScraperConfigInDBBase):
    pass
