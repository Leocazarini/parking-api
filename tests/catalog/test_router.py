import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_colors_returns_all(client: AsyncClient):
    resp = await client.get("/catalog/colors")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 23
    names = [c["name"] for c in data]
    assert "Branco" in names
    assert "Preto" in names
    assert "Vermelho" in names


@pytest.mark.asyncio
async def test_list_colors_has_id_and_name(client: AsyncClient):
    resp = await client.get("/catalog/colors")
    assert resp.status_code == 200
    first = resp.json()[0]
    assert "id" in first
    assert "name" in first


@pytest.mark.asyncio
async def test_list_models_returns_all(client: AsyncClient):
    resp = await client.get("/catalog/models")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 85
    names = [m["name"] for m in data]
    assert "Gol" in names
    assert "Civic" in names
    assert "Onix" in names


@pytest.mark.asyncio
async def test_list_models_has_id_and_name(client: AsyncClient):
    resp = await client.get("/catalog/models")
    assert resp.status_code == 200
    first = resp.json()[0]
    assert "id" in first
    assert "name" in first
