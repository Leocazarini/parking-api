from datetime import date, datetime, timedelta, timezone

import pytest_asyncio

from src.parking.tables import parking_entry
from src.subscribers.tables import subscriber, subscriber_payment


def _dt(d: date, hour: int) -> datetime:
    return datetime(d.year, d.month, d.day, hour, 0, 0, tzinfo=timezone.utc)


@pytest_asyncio.fixture
async def entries_dataset(db_engine):
    today = date.today()
    yesterday = today - timedelta(days=1)

    rows = [
        # Hoje — regular, pix, 2 horas
        {
            "plate": "FIN1A23",
            "color_id": 1,
            "client_type": "regular",
            "entry_at": _dt(today, 8),
            "exit_at": _dt(today, 10),
            "amount_charged": "20.00",
            "payment_method": "pix",
        },
        # Hoje — regular, dinheiro, 2 horas
        {
            "plate": "FIN2A23",
            "color_id": 1,
            "client_type": "regular",
            "entry_at": _dt(today, 10),
            "exit_at": _dt(today, 12),
            "amount_charged": "20.00",
            "payment_method": "dinheiro",
        },
        # Hoje — subscriber ativo, gratuito, 30 min
        {
            "plate": "FIN3A23",
            "color_id": 1,
            "client_type": "subscriber",
            "entry_at": _dt(today, 10),
            "exit_at": _dt(today, 10) + timedelta(minutes=30),
            "amount_charged": "0.00",
            "payment_method": "pix",
        },
        # Ontem — regular, credito, 1 hora
        {
            "plate": "FIN4A23",
            "color_id": 1,
            "client_type": "regular",
            "entry_at": _dt(yesterday, 9),
            "exit_at": _dt(yesterday, 10),
            "amount_charged": "10.00",
            "payment_method": "credito",
        },
        # Hoje — ainda dentro do pátio (sem saída)
        {
            "plate": "FIN5A23",
            "color_id": 1,
            "client_type": "regular",
            "entry_at": _dt(today, 14),
            "exit_at": None,
            "amount_charged": None,
            "payment_method": None,
        },
    ]

    async with db_engine.begin() as conn:
        await conn.execute(parking_entry.insert(), rows)

    return {"today": today, "yesterday": yesterday}


@pytest_asyncio.fixture
async def subscriber_payments_dataset(db_engine):
    today = date.today()
    current_month = date(today.year, today.month, 1)

    async with db_engine.begin() as conn:
        # 1 mensalista ativo
        r1 = await conn.execute(
            subscriber.insert().values(
                name="Pagante", cpf="11111111111", due_day=5, status="active"
            )
        )
        sub1 = r1.inserted_primary_key[0]

        # 1 mensalista inadimplente
        r2 = await conn.execute(
            subscriber.insert().values(
                name="Inadimplente", cpf="22222222222", due_day=1, status="overdue"
            )
        )

        # 2 pagamentos no mês corrente
        await conn.execute(
            subscriber_payment.insert(),
            [
                {
                    "subscriber_id": sub1,
                    "amount": "150.00",
                    "reference_month": current_month,
                    "payment_date": today,
                    "payment_method": "pix",
                },
                {
                    "subscriber_id": sub1,
                    "amount": "150.00",
                    "reference_month": current_month,
                    "payment_date": today,
                    "payment_method": "dinheiro",
                },
            ],
        )

    return {"current_month": current_month, "total": 300.00, "payments_count": 2, "overdue_count": 1}
