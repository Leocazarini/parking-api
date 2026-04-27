import calendar
from datetime import date
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncConnection

from src.subscribers.exceptions import (
    DuplicateCPFError,
    DuplicatePlateError,
    PaymentNotFoundError,
    SubscriberNotFoundError,
    VehicleNotFoundError,
)
from src.subscribers.tables import subscriber, subscriber_payment, subscriber_vehicle


async def list_subscribers(conn: AsyncConnection) -> list[dict]:
    result = await conn.execute(select(subscriber).order_by(subscriber.c.name))
    return [dict(row._mapping) for row in result]


async def create_subscriber(conn: AsyncConnection, data: dict) -> dict:
    existing = await conn.execute(
        select(subscriber).where(subscriber.c.cpf == data["cpf"])
    )
    if existing.first():
        raise DuplicateCPFError(data["cpf"])

    result = await conn.execute(subscriber.insert().values(**data))
    sub_id = result.inserted_primary_key[0]
    row = await conn.execute(select(subscriber).where(subscriber.c.id == sub_id))
    return dict(row.first()._mapping)


async def get_subscriber(conn: AsyncConnection, subscriber_id: int) -> dict:
    row = await conn.execute(
        select(subscriber).where(subscriber.c.id == subscriber_id)
    )
    sub = row.first()
    if not sub:
        raise SubscriberNotFoundError(subscriber_id)

    result = dict(sub._mapping)

    vehicles_result = await conn.execute(
        select(subscriber_vehicle)
        .where(subscriber_vehicle.c.subscriber_id == subscriber_id)
        .order_by(subscriber_vehicle.c.id)
    )
    result["vehicles"] = [dict(v._mapping) for v in vehicles_result]

    payments_result = await conn.execute(
        select(subscriber_payment)
        .where(subscriber_payment.c.subscriber_id == subscriber_id)
        .order_by(subscriber_payment.c.reference_month.desc())
    )
    result["payments"] = [dict(p._mapping) for p in payments_result]

    return result


async def update_subscriber(
    conn: AsyncConnection, subscriber_id: int, data: dict
) -> dict:
    await _require_subscriber(conn, subscriber_id)

    fields = {k: v for k, v in data.items() if v is not None}
    if fields:
        await conn.execute(
            update(subscriber).where(subscriber.c.id == subscriber_id).values(**fields)
        )
    return await get_subscriber(conn, subscriber_id)


async def delete_subscriber(conn: AsyncConnection, subscriber_id: int) -> None:
    await _require_subscriber(conn, subscriber_id)
    await conn.execute(
        update(subscriber)
        .where(subscriber.c.id == subscriber_id)
        .values(is_active=False)
    )


async def reactivate_subscriber(conn: AsyncConnection, subscriber_id: int) -> dict:
    await _require_subscriber(conn, subscriber_id)
    await conn.execute(
        update(subscriber)
        .where(subscriber.c.id == subscriber_id)
        .values(is_active=True)
    )
    return await get_subscriber(conn, subscriber_id)


async def list_vehicles(conn: AsyncConnection, subscriber_id: int) -> list[dict]:
    await _require_subscriber(conn, subscriber_id)
    result = await conn.execute(
        select(subscriber_vehicle)
        .where(subscriber_vehicle.c.subscriber_id == subscriber_id)
        .order_by(subscriber_vehicle.c.id)
    )
    return [dict(row._mapping) for row in result]


async def add_vehicle(
    conn: AsyncConnection, subscriber_id: int, data: dict
) -> dict:
    await _require_subscriber(conn, subscriber_id)

    existing = await conn.execute(
        select(subscriber_vehicle).where(subscriber_vehicle.c.plate == data["plate"])
    )
    if existing.first():
        raise DuplicatePlateError(data["plate"])

    result = await conn.execute(
        subscriber_vehicle.insert().values(subscriber_id=subscriber_id, **data)
    )
    vehicle_id = result.inserted_primary_key[0]
    row = await conn.execute(
        select(subscriber_vehicle).where(subscriber_vehicle.c.id == vehicle_id)
    )
    return dict(row.first()._mapping)


async def remove_vehicle(
    conn: AsyncConnection, subscriber_id: int, vehicle_id: int
) -> None:
    row = await conn.execute(
        select(subscriber_vehicle)
        .where(subscriber_vehicle.c.id == vehicle_id)
        .where(subscriber_vehicle.c.subscriber_id == subscriber_id)
    )
    if not row.first():
        raise VehicleNotFoundError(vehicle_id)

    await conn.execute(
        subscriber_vehicle.delete().where(subscriber_vehicle.c.id == vehicle_id)
    )


async def list_payments(conn: AsyncConnection, subscriber_id: int) -> list[dict]:
    await _require_subscriber(conn, subscriber_id)
    result = await conn.execute(
        select(subscriber_payment)
        .where(subscriber_payment.c.subscriber_id == subscriber_id)
        .order_by(subscriber_payment.c.reference_month.desc())
    )
    return [dict(row._mapping) for row in result]


async def create_payment(
    conn: AsyncConnection, subscriber_id: int, data: dict
) -> dict:
    await _require_subscriber(conn, subscriber_id)

    result = await conn.execute(
        subscriber_payment.insert().values(subscriber_id=subscriber_id, **data)
    )
    payment_id = result.inserted_primary_key[0]

    await _check_and_activate(conn, subscriber_id, data["reference_month"])

    row = await conn.execute(
        select(subscriber_payment).where(subscriber_payment.c.id == payment_id)
    )
    return dict(row.first()._mapping)


async def remove_payment(
    conn: AsyncConnection, subscriber_id: int, payment_id: int
) -> None:
    row = await conn.execute(
        select(subscriber_payment)
        .where(subscriber_payment.c.id == payment_id)
        .where(subscriber_payment.c.subscriber_id == subscriber_id)
    )
    payment = row.first()
    if not payment:
        raise PaymentNotFoundError(payment_id)

    deleted_month: date = payment.reference_month

    await conn.execute(
        subscriber_payment.delete().where(subscriber_payment.c.id == payment_id)
    )

    await _recheck_overdue_after_removal(conn, subscriber_id, deleted_month)


async def detect_by_plate(conn: AsyncConnection, plate: str) -> Optional[dict]:
    result = await conn.execute(
        select(
            subscriber_vehicle.c.subscriber_id,
            subscriber_vehicle.c.model_id,
            subscriber.c.name,
            subscriber.c.status,
        )
        .join(subscriber, subscriber_vehicle.c.subscriber_id == subscriber.c.id)
        .where(
            subscriber_vehicle.c.plate == plate,
            subscriber.c.is_active == True,  # noqa: E712
        )
    )
    row = result.first()
    return dict(row._mapping) if row else None


async def check_overdue(
    conn: AsyncConnection, reference_date: Optional[date] = None
) -> dict:
    today = reference_date or date.today()
    current_month = date(today.year, today.month, 1)

    result = await conn.execute(
        select(subscriber).where(
            subscriber.c.is_active == True,  # noqa: E712
            subscriber.c.status == "active",
        )
    )
    active_subs = result.fetchall()

    marked = 0
    for sub in active_subs:
        last_day = calendar.monthrange(today.year, today.month)[1]
        effective_due = min(sub.due_day, last_day)
        if today.day >= effective_due:
            payment = await conn.execute(
                select(subscriber_payment)
                .where(subscriber_payment.c.subscriber_id == sub.id)
                .where(subscriber_payment.c.reference_month == current_month)
            )
            if not payment.first():
                await conn.execute(
                    update(subscriber)
                    .where(subscriber.c.id == sub.id)
                    .values(status="overdue")
                )
                marked += 1

    return {"checked": len(active_subs), "marked_overdue": marked}


async def _require_subscriber(conn: AsyncConnection, subscriber_id: int) -> None:
    row = await conn.execute(
        select(subscriber).where(subscriber.c.id == subscriber_id)
    )
    if not row.first():
        raise SubscriberNotFoundError(subscriber_id)


async def _recheck_overdue_after_removal(
    conn: AsyncConnection, subscriber_id: int, deleted_month: date
) -> None:
    today = date.today()
    current_month = date(today.year, today.month, 1)

    if deleted_month != current_month:
        return

    sub_row = await conn.execute(
        select(subscriber).where(subscriber.c.id == subscriber_id)
    )
    sub = sub_row.first()
    if not sub or not sub.is_active or sub.status != "active":
        return

    remaining = await conn.execute(
        select(subscriber_payment)
        .where(subscriber_payment.c.subscriber_id == subscriber_id)
        .where(subscriber_payment.c.reference_month == current_month)
    )
    if remaining.first():
        return

    last_day = calendar.monthrange(today.year, today.month)[1]
    effective_due = min(sub.due_day, last_day)
    if today.day >= effective_due:
        await conn.execute(
            update(subscriber)
            .where(subscriber.c.id == subscriber_id)
            .values(status="overdue")
        )


async def _check_and_activate(
    conn: AsyncConnection, subscriber_id: int, reference_month: date
) -> None:
    sub_row = await conn.execute(
        select(subscriber).where(subscriber.c.id == subscriber_id)
    )
    sub = sub_row.first()
    if not sub or sub.status != "overdue" or not sub.is_active:
        return

    today = date.today()
    current_month = date(today.year, today.month, 1)
    if reference_month == current_month:
        await conn.execute(
            update(subscriber)
            .where(subscriber.c.id == subscriber_id)
            .values(status="active")
        )
