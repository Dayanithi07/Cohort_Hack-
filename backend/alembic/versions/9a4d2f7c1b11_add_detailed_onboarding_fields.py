"""add detailed onboarding fields

Revision ID: 9a4d2f7c1b11
Revises: 6f92a832b4b8
Create Date: 2026-03-10 12:30:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9a4d2f7c1b11"
down_revision = "6f92a832b4b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("businesses", sa.Column("account_full_name", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("account_email", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("phone_number", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("role_type", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("business_type", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("business_type_other", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("industry_sector", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("industry_sector_other", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("country", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("city", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("product_name", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("product_categories_json", sa.JSON(), nullable=True))
    op.add_column("businesses", sa.Column("product_subcategories_json", sa.JSON(), nullable=True))
    op.add_column("businesses", sa.Column("price_tier", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("target_market_geo", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("key_product_features", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("base_price", sa.Float(), nullable=True))
    op.add_column("businesses", sa.Column("availability_status", sa.String(), nullable=True))
    op.add_column("businesses", sa.Column("preferred_competitor_platforms", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("businesses", "preferred_competitor_platforms")
    op.drop_column("businesses", "availability_status")
    op.drop_column("businesses", "base_price")
    op.drop_column("businesses", "key_product_features")
    op.drop_column("businesses", "target_market_geo")
    op.drop_column("businesses", "price_tier")
    op.drop_column("businesses", "product_subcategories_json")
    op.drop_column("businesses", "product_categories_json")
    op.drop_column("businesses", "product_name")
    op.drop_column("businesses", "city")
    op.drop_column("businesses", "country")
    op.drop_column("businesses", "industry_sector_other")
    op.drop_column("businesses", "industry_sector")
    op.drop_column("businesses", "business_type_other")
    op.drop_column("businesses", "business_type")
    op.drop_column("businesses", "role_type")
    op.drop_column("businesses", "phone_number")
    op.drop_column("businesses", "account_email")
    op.drop_column("businesses", "account_full_name")
