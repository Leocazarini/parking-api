from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncConnection

from src.parking.tables import parking_entry
from src.subscribers.tables import subscriber, subscriber_payment


def _period_range(start_date: date, end_date: date) -> tuple[datetime, datetime]:
    start = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(end_date.year, end_date.month, end_date.day, 0, 0, 0, tzinfo=timezone.utc) + timedelta(days=1)
    return start, end


async def get_revenue(
    conn: AsyncConnection, start_date: date, end_date: date
) -> dict:
    start_dt, end_dt = _period_range(start_date, end_date)

    rows = (
        await conn.execute(
            select(
                parking_entry.c.payment_method,
                parking_entry.c.client_type,
                parking_entry.c.amount_charged,
                parking_entry.c.entry_at,
                parking_entry.c.exit_at,
            )
            .where(parking_entry.c.exit_at.isnot(None))
            .where(parking_entry.c.exit_at >= start_dt)
            .where(parking_entry.c.exit_at < end_dt)
        )
    ).fetchall()

    total = Decimal("0")
    by_payment_method: dict[str, Decimal] = defaultdict(Decimal)
    by_client_type: dict[str, Decimal] = defaultdict(Decimal)
    total_duration = 0.0

    for r in rows:
        amount = r.amount_charged or Decimal("0")
        total += amount
        by_payment_method[r.payment_method] += amount
        by_client_type[r.client_type] += amount
        total_duration += (r.exit_at - r.entry_at).total_seconds() / 60

    avg_duration = round(total_duration / len(rows), 2) if rows else 0.0

    return {
        "total": total,
        "by_payment_method": {
            "dinheiro": by_payment_method["dinheiro"],
            "credito": by_payment_method["credito"],
            "debito": by_payment_method["debito"],
            "pix": by_payment_method["pix"],
        },
        "by_client_type": {
            "regular": by_client_type["regular"],
            "subscriber": by_client_type["subscriber"],
        },
        "entries_count": len(rows),
        "average_duration_minutes": avg_duration,
    }


async def get_daily_revenue(
    conn: AsyncConnection, month_start: date, month_end: date
) -> list[dict]:
    start_dt, end_dt = _period_range(month_start, month_end)

    rows = (
        await conn.execute(
            select(parking_entry.c.exit_at, parking_entry.c.amount_charged)
            .where(parking_entry.c.exit_at.isnot(None))
            .where(parking_entry.c.exit_at >= start_dt)
            .where(parking_entry.c.exit_at < end_dt)
            .order_by(parking_entry.c.exit_at)
        )
    ).fetchall()

    by_day: dict[date, dict] = defaultdict(lambda: {"total": Decimal("0"), "entries_count": 0})
    for r in rows:
        day = r.exit_at.date()
        by_day[day]["total"] += r.amount_charged or Decimal("0")
        by_day[day]["entries_count"] += 1

    return [
        {"date": day, "total": data["total"], "entries_count": data["entries_count"]}
        for day, data in sorted(by_day.items())
    ]


async def get_parking_summary(
    conn: AsyncConnection, start_date: date, end_date: date
) -> dict:
    start_dt, end_dt = _period_range(start_date, end_date)

    rows = (
        await conn.execute(
            select(
                parking_entry.c.client_type,
                parking_entry.c.entry_at,
                parking_entry.c.exit_at,
                parking_entry.c.amount_charged,
            )
            .where(parking_entry.c.entry_at >= start_dt)
            .where(parking_entry.c.entry_at < end_dt)
        )
    ).fetchall()

    completed = [r for r in rows if r.exit_at is not None]

    avg_stay = (
        round(
            sum((r.exit_at - r.entry_at).total_seconds() / 60 for r in completed)
            / len(completed),
            2,
        )
        if completed
        else 0.0
    )

    peak_hour: Optional[int] = None
    if rows:
        peak_hour = Counter(r.entry_at.hour for r in rows).most_common(1)[0][0]

    return {
        "total_entries": len(rows),
        "regular_entries": sum(1 for r in rows if r.client_type == "regular"),
        "subscriber_entries": sum(1 for r in rows if r.client_type == "subscriber"),
        "free_exits": sum(
            1 for r in rows
            if r.client_type == "subscriber"
            and r.amount_charged is not None
            and r.amount_charged == 0
        ),
        "average_stay_minutes": avg_stay,
        "peak_hour": peak_hour,
    }


async def get_subscriber_revenue(
    conn: AsyncConnection, month_start: date, month_end: date
) -> dict:
    payments = (
        await conn.execute(
            select(subscriber_payment.c.amount)
            .where(subscriber_payment.c.reference_month >= month_start)
            .where(subscriber_payment.c.reference_month <= month_end)
        )
    ).fetchall()

    overdue = (
        await conn.execute(
            select(subscriber.c.id).where(subscriber.c.status == "overdue")
        )
    ).fetchall()

    return {
        "total_received": sum((r.amount for r in payments), Decimal("0")),
        "payments_count": len(payments),
        "overdue_count": len(overdue),
    }
