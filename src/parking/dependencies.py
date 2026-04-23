from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncConnection

from src.database import get_db
from src.parking.exceptions import ConfigNotFoundError
from src.parking.tables import parking_config


async def get_parking_config(conn: AsyncConnection = Depends(get_db)) -> dict:
    result = await conn.execute(
        select(parking_config).where(parking_config.c.id == 1)
    )
    config = result.first()
    if not config:
        raise ConfigNotFoundError()
    return dict(config._mapping)
