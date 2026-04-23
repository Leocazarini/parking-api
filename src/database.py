from collections.abc import AsyncGenerator

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine

from src.config import settings

POSTGRES_NAMING = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}

metadata = MetaData(naming_convention=POSTGRES_NAMING)
engine = create_async_engine(settings.DATABASE_URL)


async def get_db() -> AsyncGenerator[AsyncConnection, None]:
    async with engine.begin() as conn:
        yield conn
