import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_entry_valid_mercosul_plate(client: AsyncClient):
    resp = await client.post("/patio/entrada", json={"placa": "ABC1D23", "color_id": 1})
    assert resp.status_code == 201
    data = resp.json()
    assert data["plate"] == "ABC1D23"
    assert data["color_id"] == 1
    assert data["client_type"] == "regular"
    assert data["exit_at"] is None


@pytest.mark.asyncio
async def test_entry_valid_old_plate(client: AsyncClient):
    resp = await client.post("/patio/entrada", json={"placa": "XYZ9876", "color_id": 1})
    assert resp.status_code == 201
    assert resp.json()["plate"] == "XYZ9876"


@pytest.mark.asyncio
async def test_entry_plate_normalized_to_uppercase(client: AsyncClient):
    resp = await client.post("/patio/entrada", json={"placa": "abc1d23", "color_id": 1})
    assert resp.status_code == 201
    assert resp.json()["plate"] == "ABC1D23"


@pytest.mark.asyncio
async def test_entry_invalid_plate_rejected(client: AsyncClient):
    resp = await client.post("/patio/entrada", json={"placa": "INVALIDA", "color_id": 1})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_entry_invalid_plate_numbers_only(client: AsyncClient):
    resp = await client.post("/patio/entrada", json={"placa": "12345678", "color_id": 1})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_entry_invalid_plate_too_short(client: AsyncClient):
    resp = await client.post("/patio/entrada", json={"placa": "ABC123", "color_id": 1})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_entry_duplicate_plate_returns_409(client: AsyncClient):
    await client.post("/patio/entrada", json={"placa": "DUP1D23", "color_id": 1})
    resp = await client.post("/patio/entrada", json={"placa": "DUP1D23", "color_id": 1})
    assert resp.status_code == 409
    assert "DUP1D23" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_entry_invalid_color_id_returns_422(client: AsyncClient):
    resp = await client.post("/patio/entrada", json={"placa": "TST1A23", "color_id": 9999})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_entry_missing_plate_returns_422(client: AsyncClient):
    resp = await client.post("/patio/entrada", json={"color_id": 1})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_entry_missing_color_id_returns_422(client: AsyncClient):
    resp = await client.post("/patio/entrada", json={"placa": "TST1A23"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_active_entries(client: AsyncClient):
    await client.post("/patio/entrada", json={"placa": "ACT1A23", "color_id": 1})
    resp = await client.get("/patio/ativos")
    assert resp.status_code == 200
    plates = [e["plate"] for e in resp.json()]
    assert "ACT1A23" in plates


@pytest.mark.asyncio
async def test_active_entries_include_color_name(client: AsyncClient):
    await client.post("/patio/entrada", json={"placa": "CLR1A23", "color_id": 1})
    resp = await client.get("/patio/ativos")
    entry = next(e for e in resp.json() if e["plate"] == "CLR1A23")
    assert "color" in entry
    assert isinstance(entry["color"], str)
