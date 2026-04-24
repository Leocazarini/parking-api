from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine

from src.subscribers.service import check_overdue
from src.subscribers.tables import subscriber, subscriber_payment


@pytest.mark.asyncio
async def test_job_marks_overdue_when_due_day_passed(db_engine: AsyncEngine):
    async with db_engine.begin() as conn:
        result = await conn.execute(
            subscriber.insert().values(
                name="Teste Overdue",
                cpf="55566677788",
                due_day=1,
                status="active",
            )
        )
        sub_id = result.inserted_primary_key[0]

    today = date.today()
    reference = date(today.year, today.month, today.day)

    async with db_engine.begin() as conn:
        result = await check_overdue(conn, reference_date=reference)

    assert result["marked_overdue"] >= 1

    async with db_engine.begin() as conn:
        row = await conn.execute(
            subscriber.select().where(subscriber.c.id == sub_id)
        )
        assert row.first().status == "overdue"


@pytest.mark.asyncio
async def test_job_skips_when_due_day_not_reached(db_engine: AsyncEngine):
    async with db_engine.begin() as conn:
        result = await conn.execute(
            subscriber.insert().values(
                name="Teste Futuro",
                cpf="44455566677",
                due_day=28,
                status="active",
            )
        )
        sub_id = result.inserted_primary_key[0]

    reference = date(date.today().year, date.today().month, 1)

    async with db_engine.begin() as conn:
        await check_overdue(conn, reference_date=reference)

    async with db_engine.begin() as conn:
        row = await conn.execute(
            subscriber.select().where(subscriber.c.id == sub_id)
        )
        assert row.first().status == "active"


@pytest.mark.asyncio
async def test_job_skips_when_payment_exists(db_engine: AsyncEngine):
    today = date.today()
    current_month = date(today.year, today.month, 1)

    async with db_engine.begin() as conn:
        result = await conn.execute(
            subscriber.insert().values(
                name="Teste Pago",
                cpf="33344455566",
                due_day=1,
                status="active",
            )
        )
        sub_id = result.inserted_primary_key[0]
        await conn.execute(
            subscriber_payment.insert().values(
                subscriber_id=sub_id,
                amount="100.00",
                reference_month=current_month,
                payment_date=today,
                payment_method="pix",
            )
        )

    async with db_engine.begin() as conn:
        await check_overdue(conn, reference_date=today)

    async with db_engine.begin() as conn:
        row = await conn.execute(
            subscriber.select().where(subscriber.c.id == sub_id)
        )
        assert row.first().status == "active"


@pytest.mark.asyncio
async def test_job_endpoint(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers/jobs/check-overdue")
    assert resp.status_code == 200
    data = resp.json()
    assert "checked" in data
    assert "marked_overdue" in data


@pytest.mark.asyncio
async def test_job_endpoint_requires_admin(operator_client: AsyncClient):
    resp = await operator_client.post("/subscribers/jobs/check-overdue")
    assert resp.status_code == 403
