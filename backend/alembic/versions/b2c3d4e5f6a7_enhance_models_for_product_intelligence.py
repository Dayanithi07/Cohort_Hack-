"""enhance models for product intelligence

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2024-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Add last_scraped_at to competitors
    op.add_column('competitors', sa.Column('last_scraped_at', sa.DateTime(), nullable=True))
    
    # Add business_id and severity to alerts
    op.add_column('alerts', sa.Column('business_id', sa.Integer(), nullable=True))
    op.add_column('alerts', sa.Column('severity', sa.String(), nullable=False, server_default='medium'))
    op.create_foreign_key('fk_alerts_business_id', 'alerts', 'businesses', ['business_id'], ['id'])
    
    # Make competitor_id nullable in alerts (can have business-level alerts)
    op.alter_column('alerts', 'competitor_id', existing_type=sa.Integer(), nullable=True)
    
    # Add new fields to strategy_insights
    op.add_column('strategy_insights', sa.Column('business_id', sa.Integer(), nullable=True))
    op.add_column('strategy_insights', sa.Column('product_id', sa.Integer(), nullable=True))
    op.add_column('strategy_insights', sa.Column('confidence_score', sa.Float(), nullable=True))
    op.add_column('strategy_insights', sa.Column('action_recommended', sa.Text(), nullable=True))
    
    # Create foreign keys for new relationships
    op.create_foreign_key('fk_strategy_insights_business_id', 'strategy_insights', 'businesses', ['business_id'], ['id'])
    op.create_foreign_key('fk_strategy_insights_product_id', 'strategy_insights', 'user_products', ['product_id'], ['id'])
    
    # Make competitor_id nullable in strategy_insights (can have product-level insights)
    op.alter_column('strategy_insights', 'competitor_id', existing_type=sa.Integer(), nullable=True)


def downgrade():
    # Remove foreign keys
    op.drop_constraint('fk_strategy_insights_product_id', 'strategy_insights', type_='foreignkey')
    op.drop_constraint('fk_strategy_insights_business_id', 'strategy_insights', type_='foreignkey')
    op.drop_constraint('fk_alerts_business_id', 'alerts', type_='foreignkey')
    
    # Remove new columns from strategy_insights
    op.drop_column('strategy_insights', 'action_recommended')
    op.drop_column('strategy_insights', 'confidence_score')
    op.drop_column('strategy_insights', 'product_id')
    op.drop_column('strategy_insights', 'business_id')
    
    # Restore competitor_id as not nullable
    op.alter_column('strategy_insights', 'competitor_id', existing_type=sa.Integer(), nullable=False)
    
    # Remove new columns from alerts
    op.drop_column('alerts', 'severity')
    op.drop_column('alerts', 'business_id')
    
    # Restore competitor_id as not nullable in alerts
    op.alter_column('alerts', 'competitor_id', existing_type=sa.Integer(), nullable=False)
    
    # Remove last_scraped_at from competitors
    op.drop_column('competitors', 'last_scraped_at')
