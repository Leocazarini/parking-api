import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_color(auth_client: AsyncClient):
    resp = await auth_client.post("/catalog/colors", json={"name": "Turquesa"})
    assert resp.status_code == 201
    assert resp.json()["name"] == "Turquesa"


@pytest.mark.asyncio
async def test_create_color_duplicate(auth_client: AsyncClient):
    await auth_client.post("/catalog/colors", json={"name": "Coral"})
    resp = await auth_client.post("/catalog/colors", json={"name": "Coral"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_create_color_requires_admin(operator_client: AsyncClient):
    resp = await operator_client.post("/catalog/colors", json={"name": "Turquesa"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_color(auth_client: AsyncClient):
    create = await auth_client.post("/catalog/colors", json={"name": "Ciano"})
    color_id = create.json()["id"]

    resp = await auth_client.put(f"/catalog/colors/{color_id}", json={"name": "Ciano Escuro"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Ciano Escuro"


@pytest.mark.asyncio
async def test_update_color_not_found(auth_client: AsyncClient):
    resp = await auth_client.put("/catalog/colors/99999", json={"name": "Teste"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_color_not_in_use(auth_client: AsyncClient):
    create = await auth_client.post("/catalog/colors", json={"name": "Removível"})
    color_id = create.json()["id"]

    resp = await auth_client.delete(f"/catalog/colors/{color_id}")
    assert resp.status_code == 204

    colors = await auth_client.get("/catalog/colors")
    names = [c["name"] for c in colors.json()]
    assert "Removível" not in names


@pytest.mark.asyncio
async def test_delete_color_in_use_returns_409(auth_client: AsyncClient):
    create = await auth_client.post("/catalog/colors", json={"name": "Em Uso"})
    color_id = create.json()["id"]
    await auth_client.post("/patio/entrada", json={"placa": "CLR9Z99", "color_id": color_id})

    resp = await auth_client.delete(f"/catalog/colors/{color_id}")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_delete_color_not_found(auth_client: AsyncClient):
    resp = await auth_client.delete("/catalog/colors/99999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_model(auth_client: AsyncClient):
    resp = await auth_client.post("/catalog/models", json={"name": "Pickup Elétrica"})
    assert resp.status_code == 201
    assert resp.json()["name"] == "Pickup Elétrica"


@pytest.mark.asyncio
async def test_create_model_duplicate(auth_client: AsyncClient):
    await auth_client.post("/catalog/models", json={"name": "Cupê Esportivo"})
    resp = await auth_client.post("/catalog/models", json={"name": "Cupê Esportivo"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_update_model(auth_client: AsyncClient):
    create = await auth_client.post("/catalog/models", json={"name": "Minivan Clássica"})
    model_id = create.json()["id"]

    resp = await auth_client.put(f"/catalog/models/{model_id}", json={"name": "Minivan Premium"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Minivan Premium"


@pytest.mark.asyncio
async def test_update_model_not_found(auth_client: AsyncClient):
    resp = await auth_client.put("/catalog/models/99999", json={"name": "Teste"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_model_not_in_use(auth_client: AsyncClient):
    create = await auth_client.post("/catalog/models", json={"name": "Modelo Removível"})
    model_id = create.json()["id"]

    resp = await auth_client.delete(f"/catalog/models/{model_id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_model_in_use_returns_409(auth_client: AsyncClient):
    # Cria modelo, depois vincula a veículo de mensalista
    create_model = await auth_client.post("/catalog/models", json={"name": "Modelo Em Uso"})
    model_id = create_model.json()["id"]

    sub = await auth_client.post(
        "/subscribers",
        json={"name": "Teste", "cpf": "77766655544", "due_day": 10},
    )
    await auth_client.post(
        f"/subscribers/{sub.json()['id']}/vehicles",
        json={"plate": "MDL9Z99", "model_id": model_id},
    )

    resp = await auth_client.delete(f"/catalog/models/{model_id}")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_delete_model_not_found(auth_client: AsyncClient):
    resp = await auth_client.delete("/catalog/models/99999")
    assert resp.status_code == 404
