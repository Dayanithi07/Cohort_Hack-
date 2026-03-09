from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud.crud_scraper_config import scraper_config as crud_scraper_config
from app.models.user import User
from app.schemas.scraper import (
    ScraperConfigCreate,
    ScraperConfigResponse,
    ScraperConfigUpdate,
)

router = APIRouter()

@router.get("/", response_model=List[ScraperConfigResponse])
def read_scraper_configs(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """List scraper configurations."""
    return crud_scraper_config.get_multi(db, skip=skip, limit=limit)


@router.post("/", response_model=ScraperConfigResponse)
def create_scraper_config(
    *,
    db: Session = Depends(deps.get_db),
    scraper_in: ScraperConfigCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Create a new scraper configuration."""
    existing = crud_scraper_config.get_by_domain(db, domain_url=scraper_in.domain_url)
    if existing:
        raise HTTPException(status_code=400, detail="Scraper config for this domain already exists.")
    return crud_scraper_config.create(db, obj_in=scraper_in)


@router.get("/{scraper_id}", response_model=ScraperConfigResponse)
def read_scraper_config(
    *, db: Session = Depends(deps.get_db), scraper_id: int, current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Get a scraper configuration by ID."""
    config = crud_scraper_config.get(db=db, id=scraper_id)
    if not config:
        raise HTTPException(status_code=404, detail="Scraper config not found")
    return config


@router.put("/{scraper_id}", response_model=ScraperConfigResponse)
def update_scraper_config(
    *,
    db: Session = Depends(deps.get_db),
    scraper_id: int,
    scraper_in: ScraperConfigUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Update an existing scraper configuration."""
    config = crud_scraper_config.get(db=db, id=scraper_id)
    if not config:
        raise HTTPException(status_code=404, detail="Scraper config not found")
    return crud_scraper_config.update(db=db, db_obj=config, obj_in=scraper_in)


@router.delete("/{scraper_id}", response_model=ScraperConfigResponse)
def delete_scraper_config(
    *,
    db: Session = Depends(deps.get_db),
    scraper_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Delete a scraper configuration."""
    config = crud_scraper_config.get(db=db, id=scraper_id)
    if not config:
        raise HTTPException(status_code=404, detail="Scraper config not found")
    return crud_scraper_config.remove(db=db, id=scraper_id)
