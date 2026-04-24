"""add user table and operator_id to parking_entry

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-04-23 01:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a1"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.Text, nullable=False),
        sa.Column("role", sa.String(12), nullable=False, server_default="operator"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("refresh_token_jti", sa.String(36), nullable=True),
        sa.UniqueConstraint("username", name="user_username_key"),
        sa.UniqueConstraint("email", name="user_email_key"),
    )

    op.add_column(
        "parking_entry",
        sa.Column("operator_id", sa.Integer, nullable=True),
    )
    op.create_foreign_key(
        "parking_entry_operator_id_fkey",
        "parking_entry",
        "user",
        ["operator_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "parking_entry_operator_id_fkey", "parking_entry", type_="foreignkey"
    )
    op.drop_column("parking_entry", "operator_id")
    op.drop_table("user")
