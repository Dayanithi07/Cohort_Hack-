"""add user products table

Revision ID: a1b2c3d4e5f6
Revises: 9a4d2f7c1b11
Create Date: 2026-03-10 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '9a4d2f7c1b11'
branch_labels = None
depends_on = None


def upgrade():
    # Create user_products table
    op.create_table(
        'user_products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('sku', sa.String(), nullable=True),
        sa.Column('base_price', sa.Float(), nullable=True),
        sa.Column('current_price', sa.Float(), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(), nullable=True, default=datetime.utcnow),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_user_products_id'), 'user_products', ['id'], unique=False)
    op.create_index(op.f('ix_user_products_name'), 'user_products', ['name'], unique=False)
    op.create_index(op.f('ix_user_products_sku'), 'user_products', ['sku'], unique=True)
    op.create_index(op.f('ix_user_products_category'), 'user_products', ['category'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_user_products_category'), table_name='user_products')
    op.drop_index(op.f('ix_user_products_sku'), table_name='user_products')
    op.drop_index(op.f('ix_user_products_name'), table_name='user_products')
    op.drop_index(op.f('ix_user_products_id'), table_name='user_products')
    
    # Drop table
    op.drop_table('user_products')
