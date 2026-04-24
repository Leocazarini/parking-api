import pytest_asyncio

from src.subscribers.tables import subscriber, subscriber_vehicle


@pytest_asyncio.fixture
async def active_subscriber_with_vehicle(db_engine):
    async with db_engine.begin() as conn:
        r = await conn.execute(
            subscriber.insert().values(
                name="João Silva", cpf="12345678901", due_day=10, status="active"
            )
        )
        sub_id = r.inserted_primary_key[0]
        await conn.execute(
            subscriber_vehicle.insert().values(
                subscriber_id=sub_id, plate="SUB1A23", color_id=1
            )
        )
    return {"id": sub_id, "name": "João Silva", "plate": "SUB1A23", "status": "active"}
