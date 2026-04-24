import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine

from src.parking.tables import config_audit_log


@pytest.mark.asyncio
async def test_update_config_creates_audit_log(
    auth_client: AsyncClient, admin_user: dict, db_engine: AsyncEngine
):
    resp = await auth_client.put(
        "/patio/config",
        json={"hourly_rate": "15.00", "daily_rate": "70.00"},
    )
    assert resp.status_code == 200

    async with db_engine.begin() as conn:
        rows = (await conn.execute(select(config_audit_log))).fetchall()

    assert len(rows) == 2
    fields = {r.field for r in rows}
    assert "hourly_rate" in fields
    assert "daily_rate" in fields


@pytest.mark.asyncio
async def test_audit_log_records_old_and_new_values(
    auth_client: AsyncClient, db_engine: AsyncEngine
):
    await auth_client.put("/patio/config", json={"hourly_rate": "25.00"})

    async with db_engine.begin() as conn:
        rows = (
            await conn.execute(
                select(config_audit_log).where(config_audit_log.c.field == "hourly_rate")
            )
        ).fetchall()

    assert len(rows) == 1
    assert rows[0].old_value == "10.00"
    assert rows[0].new_value == "25.00"


@pytest.mark.asyncio
async def test_audit_log_records_changed_by(
    auth_client: AsyncClient, admin_user: dict, db_engine: AsyncEngine
):
    await auth_client.put("/patio/config", json={"tolerance_minutes": 10})

    async with db_engine.begin() as conn:
        rows = (await conn.execute(select(config_audit_log))).fetchall()

    assert all(r.changed_by == admin_user["id"] for r in rows)


@pytest.mark.asyncio
async def test_audit_log_skips_unchanged_fields(
    auth_client: AsyncClient, db_engine: AsyncEngine
):
    # Envia hourly_rate com o mesmo valor padrão (10.00)
    await auth_client.put("/patio/config", json={"hourly_rate": "10.00"})

    async with db_engine.begin() as conn:
        rows = (await conn.execute(select(config_audit_log))).fetchall()

    assert len(rows) == 0


@pytest.mark.asyncio
async def test_config_update_requires_admin(operator_client: AsyncClient):
    resp = await operator_client.put("/patio/config", json={"hourly_rate": "99.00"})
    assert resp.status_code == 403
