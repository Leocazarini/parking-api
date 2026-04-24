from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncConnection

from src.catalog.tables import vehicle_color, vehicle_model
from src.parking.exceptions import (
    ConfigNotFoundError,
    EntryNotFoundError,
    InvalidColorError,
    PlateAlreadyActiveError,
)
from src.parking.tables import config_audit_log, parking_config, parking_entry
from src.subscribers.service import detect_by_plate


async def get_active_entries(conn: AsyncConnection) -> list[dict]:
    query = (
        select(
            parking_entry.c.id,
            parking_entry.c.plate,
            vehicle_color.c.name.label("color"),
            vehicle_model.c.name.label("model"),
            parking_entry.c.client_type,
            parking_entry.c.entry_at,
        )
        .join(vehicle_color, parking_entry.c.color_id == vehicle_color.c.id)
        .outerjoin(vehicle_model, parking_entry.c.model_id == vehicle_model.c.id)
        .where(parking_entry.c.exit_at.is_(None))
        .order_by(parking_entry.c.entry_at.desc())
    )
    result = await conn.execute(query)
    return [dict(row._mapping) for row in result]


async def create_entry(
    conn: AsyncConnection, placa: str, color_id: int, operator_id: int | None = None
) -> dict:
    color_result = await conn.execute(
        select(vehicle_color).where(vehicle_color.c.id == color_id)
    )
    if not color_result.first():
        raise InvalidColorError(color_id)

    active = await conn.execute(
        select(parking_entry)
        .where(parking_entry.c.plate == placa)
        .where(parking_entry.c.exit_at.is_(None))
    )
    if active.first():
        raise PlateAlreadyActiveError(placa)

    sub_info = await detect_by_plate(conn, placa)
    client_type = "subscriber" if sub_info else "regular"
    model_id = sub_info["model_id"] if sub_info else None

    entry_at = datetime.now(timezone.utc)
    result = await conn.execute(
        parking_entry.insert().values(
            plate=placa,
            color_id=color_id,
            model_id=model_id,
            entry_at=entry_at,
            client_type=client_type,
            operator_id=operator_id,
        )
    )
    entry_id = result.inserted_primary_key[0]

    row = await conn.execute(
        select(parking_entry).where(parking_entry.c.id == entry_id)
    )
    entry = dict(row.first()._mapping)

    if sub_info:
        entry["subscriber_status"] = sub_info["status"]
        entry["subscriber_name"] = sub_info["name"]
    else:
        entry["subscriber_status"] = None
        entry["subscriber_name"] = None

    return entry


async def create_exit(
    conn: AsyncConnection, entry_id: int, payment_method: str
) -> dict:
    entry_result = await conn.execute(
        select(parking_entry)
        .where(parking_entry.c.id == entry_id)
        .where(parking_entry.c.exit_at.is_(None))
    )
    entry = entry_result.first()
    if not entry:
        raise EntryNotFoundError(entry_id)

    config_result = await conn.execute(
        select(parking_config).where(parking_config.c.id == 1)
    )
    config = config_result.first()
    if not config:
        raise ConfigNotFoundError()

    exit_at = datetime.now(timezone.utc)

    if entry.client_type == "subscriber":
        sub_info = await detect_by_plate(conn, entry.plate)
        if sub_info and sub_info["status"] == "active":
            amount_charged = Decimal("0.00")
        else:
            amount_charged = calcular_valor(entry.entry_at, exit_at, dict(config._mapping))
    else:
        amount_charged = calcular_valor(entry.entry_at, exit_at, dict(config._mapping))

    await conn.execute(
        update(parking_entry)
        .where(parking_entry.c.id == entry_id)
        .values(exit_at=exit_at, amount_charged=amount_charged, payment_method=payment_method)
    )

    row = await conn.execute(
        select(parking_entry).where(parking_entry.c.id == entry_id)
    )
    return dict(row.first()._mapping)


async def get_config(conn: AsyncConnection) -> dict:
    result = await conn.execute(
        select(parking_config).where(parking_config.c.id == 1)
    )
    config = result.first()
    if not config:
        raise ConfigNotFoundError()
    return dict(config._mapping)


async def update_config(conn: AsyncConnection, user_id: int, data: dict) -> dict:
    fields = {k: v for k, v in data.items() if v is not None}
    if not fields:
        return await get_config(conn)

    current = await get_config(conn)
    await conn.execute(
        update(parking_config).where(parking_config.c.id == 1).values(**fields)
    )

    for field, new_val in fields.items():
        if str(current[field]) != str(new_val):
            await conn.execute(
                config_audit_log.insert().values(
                    changed_by=user_id,
                    field=field,
                    old_value=str(current[field]),
                    new_value=str(new_val),
                )
            )

    return await get_config(conn)


def calcular_valor(entry_at: datetime, exit_at: datetime, config: dict) -> Decimal:
    if entry_at.tzinfo is None:
        entry_at = entry_at.replace(tzinfo=timezone.utc)
    if exit_at.tzinfo is None:
        exit_at = exit_at.replace(tzinfo=timezone.utc)

    delta_minutes = (exit_at - entry_at).total_seconds() / 60
    if delta_minutes <= float(config["tolerance_minutes"]):
        return Decimal("0.00")

    horas = Decimal(str(delta_minutes / 60))
    hourly_rate = Decimal(str(config["hourly_rate"]))
    daily_rate = Decimal(str(config["daily_rate"]))
    cobrado = (horas * hourly_rate).quantize(Decimal("0.01"))
    return min(cobrado, daily_rate)
