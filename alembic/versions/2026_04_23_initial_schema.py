"""initial schema

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-04-23 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vehicle_color",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.UniqueConstraint("name", name="vehicle_color_name_key"),
    )

    op.create_table(
        "vehicle_model",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.UniqueConstraint("name", name="vehicle_model_name_key"),
    )

    op.create_table(
        "parking_config",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("hourly_rate", sa.Numeric(10, 2), nullable=False, server_default="10.00"),
        sa.Column("daily_rate", sa.Numeric(10, 2), nullable=False, server_default="50.00"),
        sa.Column("tolerance_minutes", sa.Integer, nullable=False, server_default="5"),
    )

    op.create_table(
        "parking_entry",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("plate", sa.String(8), nullable=False),
        sa.Column(
            "color_id",
            sa.Integer,
            sa.ForeignKey("vehicle_color.id"),
            nullable=False,
        ),
        sa.Column(
            "model_id",
            sa.Integer,
            sa.ForeignKey("vehicle_model.id"),
            nullable=True,
        ),
        sa.Column("client_type", sa.String(12), nullable=False, server_default="regular"),
        sa.Column(
            "entry_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("exit_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("amount_charged", sa.Numeric(10, 2), nullable=True),
        sa.Column("payment_method", sa.String(12), nullable=True),
    )

    # Seed colors
    op.execute(
        "INSERT INTO vehicle_color (name) VALUES "
        "('Amarelo'), ('Azul'), ('Azul Marinho'), ('Bege'), ('Branco'), "
        "('Bronze'), ('Champagne'), ('Cinza'), ('Creme'), ('Dourado'), "
        "('Grafite'), ('Grená'), ('Laranja'), ('Lilás'), ('Marrom'), "
        "('Prata'), ('Preto'), ('Rosa'), ('Roxo'), ('Verde'), "
        "('Verde Musgo'), ('Vermelho'), ('Vinho')"
    )

    # Seed models — modelos de veículos populares no Brasil
    op.execute(
        "INSERT INTO vehicle_model (name) VALUES "
        "('208'), ('2008'), ('3008'), ('Aircross'), ('Amarok'), "
        "('Argo'), ('ASX'), ('Biz'), ('C3'), ('Captur'), "
        "('Celta'), ('CG 160'), ('City'), ('Civic'), ('Cobalt'), "
        "('Commander'), ('Compass'), ('Corolla'), ('Corsa'), ('CR-V'), "
        "('Creta'), ('Cronos'), ('Cruze'), ('Doblò'), ('Ducato'), "
        "('Duster'), ('EcoSport'), ('Etios'), ('Factor 150'), ('Fastback'), "
        "('Fazer 250'), ('Fiesta'), ('Fit'), ('Focus'), ('Fox'), "
        "('Frontier'), ('Gol'), ('Golf'), ('HB20'), ('HB20S'), "
        "('Hilux'), ('HR-V'), ('i30'), ('Ka'), ('Kicks'), "
        "('Kwid'), ('L200 Triton'), ('Logan'), ('March'), ('Mobi'), "
        "('Montana'), ('Nivus'), ('Onix'), ('Onix Plus'), ('Oroch'), "
        "('Outlander'), ('Palio'), ('Pajero Sport'), ('PCX'), ('Polo'), "
        "('Prisma'), ('Pulse'), ('RAV4'), ('Ranger'), ('Renegade'), "
        "('S10'), ('Sandero'), ('Saveiro'), ('Siena'), ('Sportage'), "
        "('Spin'), ('Strada'), ('SW4'), ('T-Cross'), ('Toro'), "
        "('Tracker'), ('Tucson'), ('Uno'), ('Up!'), ('Versa'), "
        "('Virtus'), ('Voyage'), ('WR-V'), ('XRE 300'), ('Yaris')"
    )

    # Seed default parking config
    op.execute(
        "INSERT INTO parking_config (id, hourly_rate, daily_rate, tolerance_minutes) "
        "VALUES (1, 10.00, 50.00, 5)"
    )


def downgrade() -> None:
    op.drop_table("parking_entry")
    op.drop_table("parking_config")
    op.drop_table("vehicle_model")
    op.drop_table("vehicle_color")
