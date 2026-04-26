"""add is_active to subscriber

Revision ID: a1b2c3d4e5f6
Revises: f6a1b2c3d4e5
Create Date: 2026-04-25 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, None] = "f6a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "subscriber",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    # Migrate legacy "suspended" records: mark as inactive and reset payment status
    op.execute(
        "UPDATE subscriber SET is_active = false, status = 'active' WHERE status = 'suspended'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE subscriber SET status = 'suspended' WHERE is_active = false"
    )
    op.drop_column("subscriber", "is_active")
