import pytest
from decimal import Decimal
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_config_returns_defaults(client: AsyncClient):
    resp = await client.get("/patio/config")
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(data["hourly_rate"]) == Decimal("10.00")
    assert Decimal(data["daily_rate"]) == Decimal("50.00")
    assert data["tolerance_minutes"] == 5


@pytest.mark.asyncio
async def test_update_hourly_rate(client: AsyncClient):
    resp = await client.put("/patio/config", json={"hourly_rate": "15.00"})
    assert resp.status_code == 200
    assert Decimal(resp.json()["hourly_rate"]) == Decimal("15.00")
    assert Decimal(resp.json()["daily_rate"]) == Decimal("50.00")


@pytest.mark.asyncio
async def test_update_daily_rate(client: AsyncClient):
    resp = await client.put("/patio/config", json={"daily_rate": "80.00"})
    assert resp.status_code == 200
    assert Decimal(resp.json()["daily_rate"]) == Decimal("80.00")


@pytest.mark.asyncio
async def test_update_tolerance_minutes(client: AsyncClient):
    resp = await client.put("/patio/config", json={"tolerance_minutes": 10})
    assert resp.status_code == 200
    assert resp.json()["tolerance_minutes"] == 10


@pytest.mark.asyncio
async def test_update_all_config_fields(client: AsyncClient):
    payload = {"hourly_rate": "12.50", "daily_rate": "60.00", "tolerance_minutes": 3}
    resp = await client.put("/patio/config", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(data["hourly_rate"]) == Decimal("12.50")
    assert Decimal(data["daily_rate"]) == Decimal("60.00")
    assert data["tolerance_minutes"] == 3


@pytest.mark.asyncio
async def test_update_config_persists(client: AsyncClient):
    await client.put("/patio/config", json={"hourly_rate": "20.00"})
    resp = await client.get("/patio/config")
    assert Decimal(resp.json()["hourly_rate"]) == Decimal("20.00")


@pytest.mark.asyncio
async def test_update_empty_body_returns_current_config(client: AsyncClient):
    resp = await client.put("/patio/config", json={})
    assert resp.status_code == 200
    assert "hourly_rate" in resp.json()
