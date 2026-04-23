from sqlalchemy import Column, Integer, String, Table

from src.database import metadata

vehicle_color = Table(
    "vehicle_color",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(50), nullable=False, unique=True),
)

vehicle_model = Table(
    "vehicle_model",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(50), nullable=False, unique=True),
)
