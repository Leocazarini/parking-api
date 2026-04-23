from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncConnection

from src.catalog.tables import vehicle_color, vehicle_model


async def get_all_colors(conn: AsyncConnection) -> list[dict]:
    result = await conn.execute(select(vehicle_color).order_by(vehicle_color.c.name))
    return [dict(row._mapping) for row in result]


async def get_all_models(conn: AsyncConnection) -> list[dict]:
    result = await conn.execute(select(vehicle_model).order_by(vehicle_model.c.name))
    return [dict(row._mapping) for row in result]
