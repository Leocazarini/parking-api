from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import update

from src.auth.service import hash_password
from src.auth.tables import user_table
from src.limiter import limiter


@pytest_asyncio.fixture
async def lockout_user(db_engine):
    async with db_engine.begin() as conn:
        result = await conn.execute(
            user_table.insert().values(
                username="locktest",
                email="locktest@test.com",
                hashed_password=hash_password("correctpass"),
                role="operator",
                is_active=True,
            )
        )
        user_id = result.inserted_primary_key[0]
    return {"id": user_id, "username": "locktest", "password": "correctpass"}


@pytest.mark.asyncio
async def test_failed_login_does_not_lock_before_five(client: AsyncClient, lockout_user):
    for _ in range(4):
        await client.post(
            "/auth/login",
            json={"username": lockout_user["username"], "password": "wrong"},
        )

    resp = await client.post(
        "/auth/login",
        json={"username": lockout_user["username"], "password": lockout_user["password"]},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_account_locked_after_five_failures(client: AsyncClient, lockout_user):
    for _ in range(5):
        await client.post(
            "/auth/login",
            json={"username": lockout_user["username"], "password": "wrong"},
        )

    # Reset rate limiter so the lockout (423) is what blocks, not rate limit (429)
    limiter._storage.reset()

    resp = await client.post(
        "/auth/login",
        json={"username": lockout_user["username"], "password": lockout_user["password"]},
    )
    assert resp.status_code == 423


@pytest.mark.asyncio
async def test_locked_account_message_includes_time(client: AsyncClient, lockout_user):
    for _ in range(5):
        await client.post(
            "/auth/login",
            json={"username": lockout_user["username"], "password": "wrong"},
        )

    limiter._storage.reset()

    resp = await client.post(
        "/auth/login",
        json={"username": lockout_user["username"], "password": "wrong"},
    )
    assert resp.status_code == 423
    assert "segundos" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_success_resets_failed_attempts(client: AsyncClient, lockout_user):
    for _ in range(3):
        await client.post(
            "/auth/login",
            json={"username": lockout_user["username"], "password": "wrong"},
        )

    await client.post(
        "/auth/login",
        json={"username": lockout_user["username"], "password": lockout_user["password"]},
    )

    limiter._storage.reset()

    # 3 more failures after reset — counter was cleared, should not lock
    for _ in range(3):
        await client.post(
            "/auth/login",
            json={"username": lockout_user["username"], "password": "wrong"},
        )

    resp = await client.post(
        "/auth/login",
        json={"username": lockout_user["username"], "password": lockout_user["password"]},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_expired_lockout_allows_login(client: AsyncClient, lockout_user, db_engine):
    async with db_engine.begin() as conn:
        await conn.execute(
            update(user_table)
            .where(user_table.c.id == lockout_user["id"])
            .values(
                failed_login_attempts=5,
                locked_until=datetime.now(timezone.utc) - timedelta(seconds=1),
            )
        )

    resp = await client.post(
        "/auth/login",
        json={"username": lockout_user["username"], "password": lockout_user["password"]},
    )
    assert resp.status_code == 200
