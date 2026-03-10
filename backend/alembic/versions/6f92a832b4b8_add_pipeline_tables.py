"""Add pipeline tables

Revision ID: 6f92a832b4b8
Revises: 458afddf2056
Create Date: 2026-03-09 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6f92a832b4b8"
down_revision = "458afddf2056"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "raw_scraped_data",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("competitor_id", sa.Integer(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("scraped_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["competitor_id"], ["competitors.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_raw_scraped_data_id"), "raw_scraped_data", ["id"], unique=False)

    op.create_table(
        "cleaned_data",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("competitor_id", sa.Integer(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("product_name", sa.String(), nullable=True),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("scraped_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["competitor_id"], ["competitors.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cleaned_data_id"), "cleaned_data", ["id"], unique=False)

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("competitor_id", sa.Integer(), nullable=False),
        sa.Column("alert_type", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["competitor_id"], ["competitors.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alerts_id"), "alerts", ["id"], unique=False)

    op.create_table(
        "strategy_insights",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("competitor_id", sa.Integer(), nullable=False),
        sa.Column("insight_type", sa.String(), nullable=False),
        sa.Column("insight_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["competitor_id"], ["competitors.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_strategy_insights_id"), "strategy_insights", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_strategy_insights_id"), table_name="strategy_insights")
    op.drop_table("strategy_insights")
    op.drop_index(op.f("ix_alerts_id"), table_name="alerts")
    op.drop_table("alerts")
    op.drop_index(op.f("ix_cleaned_data_id"), table_name="cleaned_data")
    op.drop_table("cleaned_data")
    op.drop_index(op.f("ix_raw_scraped_data_id"), table_name="raw_scraped_data")
    op.drop_table("raw_scraped_data")
