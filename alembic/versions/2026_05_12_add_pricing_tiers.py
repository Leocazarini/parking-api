"""add half_hour_rate and additional_hour_rate to parking_config

Revision ID: b2c3d4e5f6a1
Revises: 1a2b3c4d5e6f
Create Date: 2026-05-12 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "2b3c4d5e6f7a"
down_revision: Union[str, None] = "1a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "parking_config",
        sa.Column(
            "half_hour_rate",
            sa.Numeric(10, 2),
            nullable=False,
            server_default="5.00",
        ),
    )
    op.add_column(
        "parking_config",
        sa.Column(
            "additional_hour_rate",
            sa.Numeric(10, 2),
            nullable=False,
            server_default="5.00",
        ),
    )


def downgrade() -> None:
    op.drop_column("parking_config", "additional_hour_rate")
    op.drop_column("parking_config", "half_hour_rate")
