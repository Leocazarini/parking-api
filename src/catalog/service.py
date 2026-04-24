from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncConnection

from src.catalog.exceptions import (
    ColorInUseError,
    ColorNotFoundError,
    DuplicateColorError,
    DuplicateModelError,
    ModelInUseError,
    ModelNotFoundError,
)
from src.catalog.tables import vehicle_color, vehicle_model
from src.parking.tables import parking_entry
from src.subscribers.tables import subscriber_vehicle


async def get_all_colors(conn: AsyncConnection) -> list[dict]:
    rows = await conn.execute(select(vehicle_color).order_by(vehicle_color.c.name))
    return [dict(r._mapping) for r in rows]


async def get_all_models(conn: AsyncConnection) -> list[dict]:
    rows = await conn.execute(select(vehicle_model).order_by(vehicle_model.c.name))
    return [dict(r._mapping) for r in rows]


async def create_color(conn: AsyncConnection, name: str) -> dict:
    if (await conn.execute(
        select(vehicle_color).where(vehicle_color.c.name == name)
    )).first():
        raise DuplicateColorError(name)

    result = await conn.execute(vehicle_color.insert().values(name=name))
    row = (await conn.execute(
        select(vehicle_color).where(vehicle_color.c.id == result.inserted_primary_key[0])
    )).first()
    return dict(row._mapping)


async def update_color(conn: AsyncConnection, color_id: int, name: str) -> dict:
    if not (await conn.execute(
        select(vehicle_color).where(vehicle_color.c.id == color_id)
    )).first():
        raise ColorNotFoundError(color_id)

    await conn.execute(
        update(vehicle_color).where(vehicle_color.c.id == color_id).values(name=name)
    )
    row = (await conn.execute(
        select(vehicle_color).where(vehicle_color.c.id == color_id)
    )).first()
    return dict(row._mapping)


async def delete_color(conn: AsyncConnection, color_id: int) -> None:
    if not (await conn.execute(
        select(vehicle_color).where(vehicle_color.c.id == color_id)
    )).first():
        raise ColorNotFoundError(color_id)

    in_entry = (await conn.execute(
        select(parking_entry.c.id).where(parking_entry.c.color_id == color_id)
    )).first()
    in_vehicle = (await conn.execute(
        select(subscriber_vehicle.c.id).where(subscriber_vehicle.c.color_id == color_id)
    )).first()

    if in_entry or in_vehicle:
        raise ColorInUseError(color_id)

    await conn.execute(vehicle_color.delete().where(vehicle_color.c.id == color_id))


async def create_model(conn: AsyncConnection, name: str) -> dict:
    if (await conn.execute(
        select(vehicle_model).where(vehicle_model.c.name == name)
    )).first():
        raise DuplicateModelError(name)

    result = await conn.execute(vehicle_model.insert().values(name=name))
    row = (await conn.execute(
        select(vehicle_model).where(vehicle_model.c.id == result.inserted_primary_key[0])
    )).first()
    return dict(row._mapping)


async def update_model(conn: AsyncConnection, model_id: int, name: str) -> dict:
    if not (await conn.execute(
        select(vehicle_model).where(vehicle_model.c.id == model_id)
    )).first():
        raise ModelNotFoundError(model_id)

    await conn.execute(
        update(vehicle_model).where(vehicle_model.c.id == model_id).values(name=name)
    )
    row = (await conn.execute(
        select(vehicle_model).where(vehicle_model.c.id == model_id)
    )).first()
    return dict(row._mapping)


async def delete_model(conn: AsyncConnection, model_id: int) -> None:
    if not (await conn.execute(
        select(vehicle_model).where(vehicle_model.c.id == model_id)
    )).first():
        raise ModelNotFoundError(model_id)

    in_entry = (await conn.execute(
        select(parking_entry.c.id).where(parking_entry.c.model_id == model_id)
    )).first()
    in_vehicle = (await conn.execute(
        select(subscriber_vehicle.c.id).where(subscriber_vehicle.c.model_id == model_id)
    )).first()

    if in_entry or in_vehicle:
        raise ModelInUseError(model_id)

    await conn.execute(vehicle_model.delete().where(vehicle_model.c.id == model_id))
