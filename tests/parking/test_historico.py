from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine

from src.parking.tables import parking_entry


async def _insert_entry(db_engine: AsyncEngine, **kwargs) -> int:
    async with db_engine.begin() as conn:
        result = await conn.execute(parking_entry.insert().values(**kwargs))
        return result.inserted_primary_key[0]


@pytest.mark.asyncio
async def test_history_requires_auth(client: AsyncClient):
    resp = await client.get("/patio/historico")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_history_returns_completed_entries(auth_client: AsyncClient, db_engine: AsyncEngine):
    now = datetime.now(timezone.utc)
    await _insert_entry(
        db_engine,
        plate="HST1A23", color_id=1,
        entry_at=now - timedelta(hours=2),
        exit_at=now - timedelta(hours=1),
        client_type="regular", amount_charged="10.00", payment_method="pix",
    )
    resp = await auth_client.get("/patio/historico")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    plates = [e["plate"] for e in data["items"]]
    assert "HST1A23" in plates


@pytest.mark.asyncio
async def test_history_excludes_active_entries(auth_client: AsyncClient):
    await auth_client.post("/patio/entrada", json={"placa": "ACT9B23", "color_id": 1})
    resp = await auth_client.get("/patio/historico")
    plates = [e["plate"] for e in resp.json()["items"]]
    assert "ACT9B23" not in plates


@pytest.mark.asyncio
async def test_history_filter_by_plate(auth_client: AsyncClient, db_engine: AsyncEngine):
    now = datetime.now(timezone.utc)
    await _insert_entry(
        db_engine, plate="FLT1A23", color_id=1,
        entry_at=now - timedelta(hours=2), exit_at=now - timedelta(hours=1),
        client_type="regular", amount_charged="10.00", payment_method="pix",
    )
    await _insert_entry(
        db_engine, plate="OTH2A23", color_id=1,
        entry_at=now - timedelta(hours=3), exit_at=now - timedelta(hours=2),
        client_type="regular", amount_charged="10.00", payment_method="pix",
    )
    resp = await auth_client.get("/patio/historico", params={"plate": "FLT"})
    assert resp.status_code == 200
    plates = [e["plate"] for e in resp.json()["items"]]
    assert "FLT1A23" in plates
    assert "OTH2A23" not in plates


@pytest.mark.asyncio
async def test_history_filter_by_date_from(auth_client: AsyncClient, db_engine: AsyncEngine):
    now = datetime.now(timezone.utc)
    recent_entry = now - timedelta(hours=1)
    old_entry = now - timedelta(days=10)
    await _insert_entry(
        db_engine, plate="RCT1A23", color_id=1,
        entry_at=recent_entry, exit_at=recent_entry + timedelta(minutes=30),
        client_type="regular", amount_charged="5.00", payment_method="pix",
    )
    await _insert_entry(
        db_engine, plate="OLD1A23", color_id=1,
        entry_at=old_entry, exit_at=old_entry + timedelta(hours=1),
        client_type="regular", amount_charged="10.00", payment_method="pix",
    )
    cutoff = (now - timedelta(hours=2)).isoformat()
    resp = await auth_client.get("/patio/historico", params={"date_from": cutoff})
    assert resp.status_code == 200
    plates = [e["plate"] for e in resp.json()["items"]]
    assert "RCT1A23" in plates
    assert "OLD1A23" not in plates


@pytest.mark.asyncio
async def test_history_filter_by_date_to(auth_client: AsyncClient, db_engine: AsyncEngine):
    now = datetime.now(timezone.utc)
    recent_entry = now - timedelta(hours=1)
    old_entry = now - timedelta(days=10)
    await _insert_entry(
        db_engine, plate="DTO1A23", color_id=1,
        entry_at=old_entry, exit_at=old_entry + timedelta(hours=1),
        client_type="regular", amount_charged="10.00", payment_method="pix",
    )
    await _insert_entry(
        db_engine, plate="DTO2A23", color_id=1,
        entry_at=recent_entry, exit_at=recent_entry + timedelta(minutes=30),
        client_type="regular", amount_charged="5.00", payment_method="pix",
    )
    cutoff = (now - timedelta(days=2)).isoformat()
    resp = await auth_client.get("/patio/historico", params={"date_to": cutoff})
    assert resp.status_code == 200
    plates = [e["plate"] for e in resp.json()["items"]]
    assert "DTO1A23" in plates
    assert "DTO2A23" not in plates


@pytest.mark.asyncio
async def test_history_filter_by_client_type_regular(auth_client: AsyncClient, db_engine: AsyncEngine):
    now = datetime.now(timezone.utc)
    await _insert_entry(
        db_engine, plate="REG1A23", color_id=1,
        entry_at=now - timedelta(hours=2), exit_at=now - timedelta(hours=1),
        client_type="regular", amount_charged="10.00", payment_method="pix",
    )
    await _insert_entry(
        db_engine, plate="SUB2A23", color_id=1,
        entry_at=now - timedelta(hours=2), exit_at=now - timedelta(hours=1),
        client_type="subscriber",
    )
    resp = await auth_client.get("/patio/historico", params={"client_type": "regular"})
    assert resp.status_code == 200
    plates = [e["plate"] for e in resp.json()["items"]]
    assert "REG1A23" in plates
    assert "SUB2A23" not in plates


@pytest.mark.asyncio
async def test_history_filter_by_client_type_subscriber(auth_client: AsyncClient, db_engine: AsyncEngine):
    now = datetime.now(timezone.utc)
    await _insert_entry(
        db_engine, plate="REG3A23", color_id=1,
        entry_at=now - timedelta(hours=2), exit_at=now - timedelta(hours=1),
        client_type="regular", amount_charged="10.00", payment_method="pix",
    )
    await _insert_entry(
        db_engine, plate="SUB4A23", color_id=1,
        entry_at=now - timedelta(hours=2), exit_at=now - timedelta(hours=1),
        client_type="subscriber",
    )
    resp = await auth_client.get("/patio/historico", params={"client_type": "subscriber"})
    assert resp.status_code == 200
    plates = [e["plate"] for e in resp.json()["items"]]
    assert "SUB4A23" in plates
    assert "REG3A23" not in plates


@pytest.mark.asyncio
async def test_history_filter_date_without_timezone(auth_client: AsyncClient, db_engine: AsyncEngine):
    """date_from e date_to sem timezone devem ser normalizados para UTC."""
    now = datetime.now(timezone.utc)
    await _insert_entry(
        db_engine, plate="NTZ1A23", color_id=1,
        entry_at=now - timedelta(hours=2), exit_at=now - timedelta(hours=1),
        client_type="regular", amount_charged="10.00", payment_method="pix",
    )
    naive_from = (now - timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S")
    naive_to = now.strftime("%Y-%m-%dT%H:%M:%S")
    resp = await auth_client.get(
        "/patio/historico", params={"date_from": naive_from, "date_to": naive_to}
    )
    assert resp.status_code == 200
    plates = [e["plate"] for e in resp.json()["items"]]
    assert "NTZ1A23" in plates


@pytest.mark.asyncio
async def test_history_pagination(auth_client: AsyncClient, db_engine: AsyncEngine):
    now = datetime.now(timezone.utc)
    entries = [
        {
            "plate": f"PAG{i}A23", "color_id": 1,
            "entry_at": now - timedelta(hours=i + 1),
            "exit_at": now - timedelta(hours=i),
            "client_type": "regular", "amount_charged": "10.00", "payment_method": "pix",
        }
        for i in range(1, 6)
    ]
    async with db_engine.begin() as conn:
        await conn.execute(parking_entry.insert(), entries)

    resp = await auth_client.get("/patio/historico", params={"page": 1, "page_size": 2})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 5
    assert len(data["items"]) == 2
    assert data["pages"] >= 3
