"""add address fields to subscriber

Revision ID: f6a1b2c3d4e5
Revises: e5f6a1b2c3d4
Create Date: 2026-04-25 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f6a1b2c3d4e5"
down_revision: Union[str, None] = "e5f6a1b2c3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("subscriber", sa.Column("zip_code", sa.String(9), nullable=True))
    op.add_column("subscriber", sa.Column("street", sa.String(255), nullable=True))
    op.add_column("subscriber", sa.Column("number", sa.String(10), nullable=True))
    op.add_column("subscriber", sa.Column("complement", sa.String(100), nullable=True))
    op.add_column("subscriber", sa.Column("neighborhood", sa.String(100), nullable=True))
    op.add_column("subscriber", sa.Column("city", sa.String(100), nullable=True))
    op.add_column("subscriber", sa.Column("state", sa.String(2), nullable=True))


def downgrade() -> None:
    op.drop_column("subscriber", "state")
    op.drop_column("subscriber", "city")
    op.drop_column("subscriber", "neighborhood")
    op.drop_column("subscriber", "complement")
    op.drop_column("subscriber", "number")
    op.drop_column("subscriber", "street")
    op.drop_column("subscriber", "zip_code")
