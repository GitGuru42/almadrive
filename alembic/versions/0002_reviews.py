"""Add reviews table

Revision ID: 0002_reviews
Revises: 0001_cars_minimal
Create Date: 2026-03-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_reviews"
down_revision: Union[str, Sequence[str], None] = "0001_cars_minimal"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("car_id", sa.Integer(), sa.ForeignKey("cars.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("author_name", sa.String(length=120), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("is_approved", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_reviews_car_id", "reviews", ["car_id"])


def downgrade() -> None:
    op.drop_index("ix_reviews_car_id", table_name="reviews")
    op.drop_table("reviews")
