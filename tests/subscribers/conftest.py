from datetime import date

import pytest_asyncio

from src.subscribers.tables import subscriber, subscriber_vehicle


@pytest_asyncio.fixture
async def active_subscriber(db_engine):
    async with db_engine.begin() as conn:
        result = await conn.execute(
            subscriber.insert().values(
                name="João Silva",
                cpf="12345678901",
                phone="11999999999",
                email="joao@test.com",
                due_day=10,
                status="active",
            )
        )
        sub_id = result.inserted_primary_key[0]
    return {"id": sub_id, "name": "João Silva", "cpf": "12345678901", "due_day": 10, "status": "active"}


@pytest_asyncio.fixture
async def overdue_subscriber(db_engine):
    async with db_engine.begin() as conn:
        result = await conn.execute(
            subscriber.insert().values(
                name="Maria Santos",
                cpf="98765432100",
                due_day=1,
                status="overdue",
            )
        )
        sub_id = result.inserted_primary_key[0]
    return {"id": sub_id, "name": "Maria Santos", "cpf": "98765432100", "due_day": 1, "status": "overdue"}


@pytest_asyncio.fixture
async def active_subscriber_with_vehicle(db_engine, active_subscriber):
    async with db_engine.begin() as conn:
        result = await conn.execute(
            subscriber_vehicle.insert().values(
                subscriber_id=active_subscriber["id"],
                plate="SUB1A23",
                color_id=1,
            )
        )
        vehicle_id = result.inserted_primary_key[0]
    return {**active_subscriber, "vehicle_id": vehicle_id, "plate": "SUB1A23"}


@pytest_asyncio.fixture
async def overdue_subscriber_with_vehicle(db_engine, overdue_subscriber):
    async with db_engine.begin() as conn:
        result = await conn.execute(
            subscriber_vehicle.insert().values(
                subscriber_id=overdue_subscriber["id"],
                plate="OVD1A23",
                color_id=1,
            )
        )
        vehicle_id = result.inserted_primary_key[0]
    return {**overdue_subscriber, "vehicle_id": vehicle_id, "plate": "OVD1A23"}


def first_of_current_month() -> date:
    today = date.today()
    return date(today.year, today.month, 1)
