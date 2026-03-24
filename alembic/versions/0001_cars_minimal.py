"""Create minimal cars table

Revision ID: 0001_cars_minimal
Revises: 
Create Date: 2026-03-02 18:38:44

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001_cars_minimal'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cars',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('images', sa.JSON(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('thumbnail', sa.String(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('idx_cars_active', 'cars', ['is_active'])


def downgrade() -> None:
    op.drop_index('idx_cars_active', table_name='cars')
    op.drop_table('cars')
