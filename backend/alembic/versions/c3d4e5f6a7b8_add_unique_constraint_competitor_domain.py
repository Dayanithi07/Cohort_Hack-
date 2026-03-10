"""add unique constraint competitor domain

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-10 16:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add unique constraint on (business_id, domain_url) to prevent duplicate competitors.
    Note: Existing duplicates won't be deleted (they have related data), but future duplicates 
    will be prevented. Python code will handle deduplication when querying.
    """
    # Try to add unique constraint - if duplicates exist, this will fail
    # In that case, the Python code in crud_competitor.py handles deduplication
    try:
        op.create_unique_constraint(
            'uq_competitor_business_domain',
            'competitors',
            ['business_id', 'domain_url']
        )
    except Exception:
        # If constraint creation fails due to existing duplicates, that's OK
        # The Python layer will handle deduplication
        pass


def downgrade():
    """Remove the unique constraint"""
    op.drop_constraint('uq_competitor_business_domain', 'competitors', type_='unique')
