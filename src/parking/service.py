from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncConnection

from src.catalog.tables import vehicle_color, vehicle_model
from src.parking.exceptions import (
    ConfigNotFoundError,
    EntryNotFoundError,
    InvalidColorError,
    PaymentMethodRequiredError,
    PlateAlreadyActiveError,
)
from src.parking.tables import config_audit_log, parking_config, parking_entry
from src.socket import sio
from src.subscribers.service import detect_by_plate
from src.subscribers.tables import subscriber as subscriber_table
from src.subscribers.tables import subscriber_vehicle


def _utc_iso(dt: datetime) -> str:
    if not dt.tzinfo:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S") + "Z"


async def _get_yard_state(conn: AsyncConnection) -> dict:
    rows = (
        await conn.execute(
            select(
                parking_entry.c.id,
                parking_entry.c.plate,
                vehicle_color.c.name.label("color"),
                vehicle_model.c.name.label("model"),
                parking_entry.c.entry_at,
                parking_entry.c.client_type,
                subscriber_table.c.status.label("subscriber_status"),
            )
            .join(vehicle_color, parking_entry.c.color_id == vehicle_color.c.id)
            .outerjoin(vehicle_model, parking_entry.c.model_id == vehicle_model.c.id)
            .outerjoin(subscriber_vehicle, parking_entry.c.plate == subscriber_vehicle.c.plate)
            .outerjoin(subscriber_table, subscriber_vehicle.c.subscriber_id == subscriber_table.c.id)
            .where(parking_entry.c.exit_at.is_(None))
            .order_by(parking_entry.c.entry_at.desc())
        )
    ).fetchall()

    vehicles = [
        {
            "id": r.id,
            "plate": r.plate,
            "color": r.color,
            "model": r.model,
            "entry_at": _utc_iso(r.entry_at),
            "client_type": r.client_type,
            "subscriber_status": r.subscriber_status,
        }
        for r in rows
    ]
    return {"occupied": len(vehicles), "vehicles": vehicles}


async def get_active_entries(conn: AsyncConnection) -> list[dict]:
    query = (
        select(
            parking_entry.c.id,
            parking_entry.c.plate,
            vehicle_color.c.name.label("color"),
            vehicle_model.c.name.label("model"),
            parking_entry.c.client_type,
            parking_entry.c.entry_at,
            subscriber_table.c.status.label("subscriber_status"),
        )
        .join(vehicle_color, parking_entry.c.color_id == vehicle_color.c.id)
        .outerjoin(vehicle_model, parking_entry.c.model_id == vehicle_model.c.id)
        .outerjoin(subscriber_vehicle, parking_entry.c.plate == subscriber_vehicle.c.plate)
        .outerjoin(subscriber_table, subscriber_vehicle.c.subscriber_id == subscriber_table.c.id)
        .where(parking_entry.c.exit_at.is_(None))
        .order_by(parking_entry.c.entry_at.desc())
    )
    result = await conn.execute(query)
    rows = []
    for row in result:
        d = dict(row._mapping)
        if d["entry_at"].tzinfo is None:
            d["entry_at"] = d["entry_at"].replace(tzinfo=timezone.utc)
        rows.append(d)
    return rows


async def create_entry(
    conn: AsyncConnection, placa: str, color_id: int, model_id: int | None = None, operator_id: int | None = None
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
    # subscriber's registered model takes precedence; fall back to manually provided model_id
    model_id = sub_info["model_id"] if sub_info else model_id

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

    color_name = (
        await conn.execute(
            select(vehicle_color.c.name).where(vehicle_color.c.id == color_id)
        )
    ).scalar()

    model_name = None
    if entry.get("model_id"):
        model_name = (
            await conn.execute(
                select(vehicle_model.c.name).where(vehicle_model.c.id == entry["model_id"])
            )
        ).scalar()

    await sio.emit(
        "spot:entry",
        {
            "id": entry_id,
            "plate": entry["plate"],
            "color": color_name,
            "model": model_name,
            "entry_at": _utc_iso(entry["entry_at"]),
            "client_type": entry["client_type"],
            "subscriber_status": entry["subscriber_status"],
        },
        room="yard",
    )
    await sio.emit("yard:update", await _get_yard_state(conn), room="yard")

    return entry


async def create_exit(
    conn: AsyncConnection, entry_id: int, payment_method: str | None
) -> dict:
    entry_result = await conn.execute(
        select(parking_entry)
        .where(parking_entry.c.id == entry_id)
        .where(parking_entry.c.exit_at.is_(None))
    )
    entry = entry_result.first()
    if not entry:
        raise EntryNotFoundError(entry_id)

    exit_at = datetime.now(timezone.utc)

    sub_info = None
    if entry.client_type == "subscriber":
        sub_info = await detect_by_plate(conn, entry.plate)

    if sub_info and sub_info["status"] == "active":
        amount_charged = None
        payment_method = None
    else:
        config_result = await conn.execute(
            select(parking_config).where(parking_config.c.id == 1)
        )
        config = config_result.first()
        if not config:
            raise ConfigNotFoundError()

        amount_charged = calcular_valor(entry.entry_at, exit_at, dict(config._mapping))
        if amount_charged > 0 and payment_method is None:
            raise PaymentMethodRequiredError()

    await conn.execute(
        update(parking_entry)
        .where(parking_entry.c.id == entry_id)
        .values(
            exit_at=exit_at,
            amount_charged=amount_charged,
            payment_method=payment_method,
        )
    )

    row = await conn.execute(
        select(parking_entry).where(parking_entry.c.id == entry_id)
    )
    updated = dict(row.first()._mapping)
    for field in ("entry_at", "exit_at"):
        if updated.get(field) and updated[field].tzinfo is None:
            updated[field] = updated[field].replace(tzinfo=timezone.utc)

    entry_at_aware = (
        entry.entry_at
        if entry.entry_at.tzinfo
        else entry.entry_at.replace(tzinfo=timezone.utc)
    )
    duration_minutes = int((exit_at - entry_at_aware).total_seconds() / 60)
    await sio.emit(
        "spot:exit",
        {
            "entry_id": entry_id,
            "plate": entry.plate,
            "exit_at": exit_at.isoformat(),
            "amount_charged": (
                None if amount_charged is None else f"{amount_charged:.2f}"
            ),
            "duration_minutes": duration_minutes,
        },
        room="yard",
    )
    await sio.emit("yard:update", await _get_yard_state(conn), room="yard")

    return updated


async def get_history(
    conn: AsyncConnection,
    page: int = 1,
    page_size: int = 50,
    plate: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    client_type: str | None = None,
) -> dict:
    from sqlalchemy import func

    base = (
        select(
            parking_entry.c.id,
            parking_entry.c.plate,
            vehicle_color.c.name.label("color"),
            vehicle_model.c.name.label("model"),
            parking_entry.c.client_type,
            parking_entry.c.entry_at,
            parking_entry.c.exit_at,
            parking_entry.c.amount_charged,
            parking_entry.c.payment_method,
        )
        .join(vehicle_color, parking_entry.c.color_id == vehicle_color.c.id)
        .outerjoin(vehicle_model, parking_entry.c.model_id == vehicle_model.c.id)
        .where(parking_entry.c.exit_at.isnot(None))
    )

    if plate:
        base = base.where(parking_entry.c.plate.ilike(f"%{plate}%"))
    if date_from:
        base = base.where(parking_entry.c.entry_at >= date_from)
    if date_to:
        base = base.where(parking_entry.c.entry_at <= date_to)
    if client_type and client_type in ("regular", "subscriber"):
        base = base.where(parking_entry.c.client_type == client_type)

    total = (await conn.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0

    rows = (
        await conn.execute(
            base.order_by(parking_entry.c.entry_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).fetchall()

    items = []
    for row in rows:
        d = dict(row._mapping)
        for field in ("entry_at", "exit_at"):
            if d.get(field) and d[field].tzinfo is None:
                d[field] = d[field].replace(tzinfo=timezone.utc)
        items.append(d)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


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
    tolerance = float(config["tolerance_minutes"])
    half_hour_rate = Decimal(str(config["half_hour_rate"]))
    hourly_rate = Decimal(str(config["hourly_rate"]))
    additional_hour_rate = Decimal(str(config["additional_hour_rate"]))
    daily_rate = Decimal(str(config["daily_rate"]))

    if delta_minutes < tolerance:
        return Decimal("0.00")

    if delta_minutes < 30:
        return min(half_hour_rate, daily_rate)

    if delta_minutes < 60:
        return min(hourly_rate, daily_rate)

    # A cada hora completa após a primeira, adiciona additional_hour_rate integralmente
    additional_complete_hours = int((delta_minutes - 60) / 60)
    total = hourly_rate + additional_hour_rate * additional_complete_hours
    return min(total, daily_rate)
