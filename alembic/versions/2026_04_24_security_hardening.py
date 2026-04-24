"""add security hardening: lockout columns and revoked_token table

Revision ID: e5f6a1b2c3d4
Revises: d4e5f6a1b2c3
Create Date: 2026-04-24 02:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a1b2c3d4"
down_revision: Union[str, None] = "d4e5f6a1b2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("failed_login_attempts", sa.Integer, nullable=False, server_default="0"),
    )
    op.add_column(
        "user",
        sa.Column("locked_until", sa.TIMESTAMP(timezone=True), nullable=True),
    )

    op.create_table(
        "revoked_token",
        sa.Column("jti", sa.String(36), primary_key=True),
        sa.Column(
            "revoked_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("revoked_token")
    op.drop_column("user", "locked_until")
    op.drop_column("user", "failed_login_attempts")
