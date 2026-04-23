import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine

from src.parking.tables import parking_entry
from src.parking.service import calcular_valor


# --- unit tests for the calculation function ---

def test_calcular_valor_within_tolerance():
    entry_at = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    exit_at = datetime(2026, 1, 1, 10, 4, 0, tzinfo=timezone.utc)  # 4 min
    config = {"tolerance_minutes": 5, "hourly_rate": "10.00", "daily_rate": "50.00"}
    assert calcular_valor(entry_at, exit_at, config) == Decimal("0.00")


def test_calcular_valor_exactly_at_tolerance():
    entry_at = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    exit_at = datetime(2026, 1, 1, 10, 5, 0, tzinfo=timezone.utc)  # exactly 5 min
    config = {"tolerance_minutes": 5, "hourly_rate": "10.00", "daily_rate": "50.00"}
    assert calcular_valor(entry_at, exit_at, config) == Decimal("0.00")


def test_calcular_valor_one_hour():
    entry_at = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    exit_at = datetime(2026, 1, 1, 11, 0, 0, tzinfo=timezone.utc)  # 1h
    config = {"tolerance_minutes": 5, "hourly_rate": "10.00", "daily_rate": "50.00"}
    assert calcular_valor(entry_at, exit_at, config) == Decimal("10.00")


def test_calcular_valor_capped_by_daily_rate():
    entry_at = datetime(2026, 1, 1, 8, 0, 0, tzinfo=timezone.utc)
    exit_at = datetime(2026, 1, 1, 20, 0, 0, tzinfo=timezone.utc)  # 12h = R$120, capped at R$50
    config = {"tolerance_minutes": 5, "hourly_rate": "10.00", "daily_rate": "50.00"}
    assert calcular_valor(entry_at, exit_at, config) == Decimal("50.00")


def test_calcular_valor_naive_datetimes():
    entry_at = datetime(2026, 1, 1, 10, 0, 0)  # naive
    exit_at = datetime(2026, 1, 1, 11, 0, 0)   # naive
    config = {"tolerance_minutes": 5, "hourly_rate": "10.00", "daily_rate": "50.00"}
    assert calcular_valor(entry_at, exit_at, config) == Decimal("10.00")


# --- integration tests via HTTP ---

@pytest.mark.asyncio
async def test_exit_within_tolerance_charges_zero(client: AsyncClient):
    entry_resp = await client.post("/patio/entrada", json={"placa": "TOL1A23", "color_id": 1})
    entry_id = entry_resp.json()["id"]

    resp = await client.post("/patio/saida", json={"entry_id": entry_id, "payment_method": "pix"})
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(data["amount_charged"]) == Decimal("0.00")
    assert data["payment_method"] == "pix"
    assert data["exit_at"] is not None


@pytest.mark.asyncio
async def test_exit_with_old_entry_charges_correctly(client: AsyncClient, db_engine: AsyncEngine):
    # Insert entry with timestamp 2h in the past directly via DB
    entry_at = datetime.now(timezone.utc) - timedelta(hours=2)
    async with db_engine.begin() as conn:
        result = await conn.execute(
            parking_entry.insert().values(
                plate="CHG1A23",
                color_id=1,
                entry_at=entry_at,
                client_type="regular",
            )
        )
        entry_id = result.inserted_primary_key[0]

    resp = await client.post(
        "/patio/saida", json={"entry_id": entry_id, "payment_method": "dinheiro"}
    )
    assert resp.status_code == 200
    data = resp.json()
    amount = Decimal(data["amount_charged"])
    assert amount == Decimal("20.00")  # 2h * R$10/h


@pytest.mark.asyncio
async def test_exit_capped_by_daily_rate(client: AsyncClient, db_engine: AsyncEngine):
    entry_at = datetime.now(timezone.utc) - timedelta(hours=12)
    async with db_engine.begin() as conn:
        result = await conn.execute(
            parking_entry.insert().values(
                plate="CAP1A23",
                color_id=1,
                entry_at=entry_at,
                client_type="regular",
            )
        )
        entry_id = result.inserted_primary_key[0]

    resp = await client.post(
        "/patio/saida", json={"entry_id": entry_id, "payment_method": "credito"}
    )
    assert resp.status_code == 200
    assert Decimal(resp.json()["amount_charged"]) == Decimal("50.00")


@pytest.mark.asyncio
async def test_exit_not_found_returns_404(client: AsyncClient):
    resp = await client.post(
        "/patio/saida", json={"entry_id": 99999, "payment_method": "pix"}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_exit_already_exited_returns_404(client: AsyncClient):
    entry_resp = await client.post("/patio/entrada", json={"placa": "EXT1A23", "color_id": 1})
    entry_id = entry_resp.json()["id"]
    await client.post("/patio/saida", json={"entry_id": entry_id, "payment_method": "pix"})

    resp = await client.post(
        "/patio/saida", json={"entry_id": entry_id, "payment_method": "pix"}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_exit_invalid_payment_method(client: AsyncClient):
    entry_resp = await client.post("/patio/entrada", json={"placa": "PMT1A23", "color_id": 1})
    entry_id = entry_resp.json()["id"]
    resp = await client.post(
        "/patio/saida", json={"entry_id": entry_id, "payment_method": "bitcoin"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_exited_vehicle_removed_from_active(client: AsyncClient):
    entry_resp = await client.post("/patio/entrada", json={"placa": "RMV1A23", "color_id": 1})
    entry_id = entry_resp.json()["id"]
    await client.post("/patio/saida", json={"entry_id": entry_id, "payment_method": "pix"})

    resp = await client.get("/patio/ativos")
    plates = [e["plate"] for e in resp.json()]
    assert "RMV1A23" not in plates
