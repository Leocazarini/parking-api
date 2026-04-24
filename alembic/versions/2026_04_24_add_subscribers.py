"""add subscriber tables

Revision ID: c3d4e5f6a1b2
Revises: b2c3d4e5f6a1
Create Date: 2026-04-24 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a1b2"
down_revision: Union[str, None] = "b2c3d4e5f6a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subscriber",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("cpf", sa.String(14), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("status", sa.String(12), nullable=False, server_default="active"),
        sa.Column("due_day", sa.Integer, nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("cpf", name="subscriber_cpf_key"),
    )

    op.create_table(
        "subscriber_vehicle",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("subscriber_id", sa.Integer, nullable=False),
        sa.Column("plate", sa.String(8), nullable=False),
        sa.Column("model_id", sa.Integer, nullable=True),
        sa.Column("color_id", sa.Integer, nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["subscriber_id"],
            ["subscriber.id"],
            name="subscriber_vehicle_subscriber_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["model_id"],
            ["vehicle_model.id"],
            name="subscriber_vehicle_model_id_fkey",
        ),
        sa.ForeignKeyConstraint(
            ["color_id"],
            ["vehicle_color.id"],
            name="subscriber_vehicle_color_id_fkey",
        ),
        sa.UniqueConstraint("plate", name="subscriber_vehicle_plate_key"),
    )

    op.create_table(
        "subscriber_payment",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("subscriber_id", sa.Integer, nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("reference_month", sa.Date, nullable=False),
        sa.Column("payment_date", sa.Date, nullable=False),
        sa.Column("payment_method", sa.String(12), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["subscriber_id"],
            ["subscriber.id"],
            name="subscriber_payment_subscriber_id_fkey",
        ),
    )


def downgrade() -> None:
    op.drop_table("subscriber_payment")
    op.drop_table("subscriber_vehicle")
    op.drop_table("subscriber")
