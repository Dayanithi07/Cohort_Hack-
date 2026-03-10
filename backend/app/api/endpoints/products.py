import csv
import io
from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api import deps
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=schemas.UserProduct)
def create_product(
    *,
    db: Session = Depends(deps.get_db),
    product_in: schemas.UserProductCreate,
    current_user: User = Depends(deps.get_current_user),
) -> schemas.UserProduct:
    """
    Create a new product for a business.
    """
    # Verify business belongs to current user
    business = crud.business.get(db=db, id=product_in.business_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Check if SKU already exists
    if product_in.sku:
        existing = crud.user_product.get_by_sku(db=db, sku=product_in.sku)
        if existing:
            raise HTTPException(status_code=400, detail="SKU already exists")
    
    product = crud.user_product.create(db=db, obj_in=product_in)
    return product


@router.get("/", response_model=List[schemas.UserProduct])
def list_products(
    business_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[schemas.UserProduct]:
    """
    Retrieve products for a specific business.
    """
    # Verify business belongs to current user
    business = crud.business.get(db=db, id=business_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Business not found")
    
    products = crud.user_product.get_by_business(
        db=db, business_id=business_id, skip=skip, limit=limit
    )
    return products


@router.get("/{product_id}", response_model=schemas.UserProduct)
def get_product(
    product_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> schemas.UserProduct:
    """
    Get a specific product by ID.
    """
    product = crud.user_product.get(db=db, id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Verify business belongs to current user
    business = crud.business.get(db=db, id=product.business_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this product")
    
    return product


@router.put("/{product_id}", response_model=schemas.UserProduct)
def update_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    product_in: schemas.UserProductUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> schemas.UserProduct:
    """
    Update a product.
    """
    product = crud.user_product.get(db=db, id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Verify business belongs to current user
    business = crud.business.get(db=db, id=product.business_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this product")
    
    # Check SKU uniqueness if updating
    if product_in.sku and product_in.sku != product.sku:
        existing = crud.user_product.get_by_sku(db=db, sku=product_in.sku)
        if existing:
            raise HTTPException(status_code=400, detail="SKU already exists")
    
    product = crud.user_product.update(db=db, db_obj=product, obj_in=product_in)
    return product


@router.delete("/{product_id}")
def delete_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """
    Delete a product.
    """
    product = crud.user_product.get(db=db, id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Verify business belongs to current user
    business = crud.business.get(db=db, id=product.business_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this product")
    
    crud.user_product.remove(db=db, id=product_id)
    return {"success": True, "message": "Product deleted successfully"}


@router.post("/bulk-upload", response_model=schemas.UserProductBulkUpload)
async def bulk_upload_products(
    *,
    db: Session = Depends(deps.get_db),
    business_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
) -> schemas.UserProductBulkUpload:
    """
    Bulk upload products via CSV file.
    Expected CSV format: sku,name,base_price,current_price,url,image_url,description,category
    """
    # Verify business belongs to current user
    business = crud.business.get(db=db, id=business_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Read and parse CSV
    contents = await file.read()
    csv_data = contents.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(csv_data))
    
    created_count = 0
    failed_count = 0
    errors = []
    
    for row_num, row in enumerate(csv_reader, start=2):
        try:
            # Validate required fields
            if not row.get('name'):
                errors.append(f"Row {row_num}: Missing product name")
                failed_count += 1
                continue
            
            # Create product
            product_data = schemas.UserProductCreate(
                business_id=business_id,
                name=row['name'],
                sku=row.get('sku') or None,
                base_price=float(row['base_price']) if row.get('base_price') else None,
                current_price=float(row['current_price']) if row.get('current_price') else None,
                url=row.get('url') or None,
                image_url=row.get('image_url') or None,
                description=row.get('description') or None,
                category=row.get('category') or None,
            )
            
            # Check SKU uniqueness
            if product_data.sku:
                existing = crud.user_product.get_by_sku(db=db, sku=product_data.sku)
                if existing:
                    errors.append(f"Row {row_num}: SKU '{product_data.sku}' already exists")
                    failed_count += 1
                    continue
            
            crud.user_product.create(db=db, obj_in=product_data)
            created_count += 1
            
        except ValueError as e:
            errors.append(f"Row {row_num}: Invalid data - {str(e)}")
            failed_count += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            failed_count += 1
    
    return schemas.UserProductBulkUpload(
        total=created_count + failed_count,
        created=created_count,
        failed=failed_count,
        errors=errors
    )


@router.post("/self-scrape")
def trigger_self_scrape(
    *,
    db: Session = Depends(deps.get_db),
    business_id: int,
    website_url: str,
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """
    Trigger a scrape of the user's own website to auto-populate products.
    This will be implemented with Celery tasks in the future.
    """
    # Verify business belongs to current user
    business = crud.business.get(db=db, id=business_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # TODO: Implement Celery task to scrape user's website
    # For now, return a placeholder response
    
    return {
        "success": True,
        "message": "Self-scrape initiated. Products will be populated shortly.",
        "business_id": business_id,
        "website_url": website_url,
    }


@router.post("/{business_id}/generate-insights")
def generate_product_insights(
    *,
    db: Session = Depends(deps.get_db),
    business_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """
    Trigger product insights generation for all products in this business.
    Compares user products against competitor data using fuzzy matching.
    """
    from app.tasks import generate_product_insights
    
    # Verify business belongs to current user
    business = crud.business.get(db=db, id=business_id)
    if not business or business.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Trigger async insights generation
    task = generate_product_insights.delay(business_id)
    
    return {
        "success": True,
        "message": "Product insights generation started",
        "business_id": business_id,
        "task_id": task.id
    }
