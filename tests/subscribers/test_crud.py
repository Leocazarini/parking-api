import pytest
from httpx import AsyncClient


SUBSCRIBER_PAYLOAD = {
    "name": "Carlos Oliveira",
    "cpf": "11122233344",
    "phone": "11988887777",
    "email": "carlos@test.com",
    "due_day": 15,
}


@pytest.mark.asyncio
async def test_create_subscriber(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json=SUBSCRIBER_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Carlos Oliveira"
    assert data["cpf"] == "11122233344"
    assert data["status"] == "active"
    assert data["due_day"] == 15


@pytest.mark.asyncio
async def test_create_subscriber_cpf_with_mask(auth_client: AsyncClient):
    payload = {**SUBSCRIBER_PAYLOAD, "cpf": "111.222.333-44"}
    resp = await auth_client.post("/subscribers", json=payload)
    assert resp.status_code == 201
    assert resp.json()["cpf"] == "11122233344"


@pytest.mark.asyncio
async def test_create_subscriber_duplicate_cpf(auth_client: AsyncClient):
    await auth_client.post("/subscribers", json=SUBSCRIBER_PAYLOAD)
    resp = await auth_client.post("/subscribers", json=SUBSCRIBER_PAYLOAD)
    assert resp.status_code == 409
    assert "11122233344" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_create_subscriber_invalid_due_day(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**SUBSCRIBER_PAYLOAD, "due_day": 29})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_subscribers(auth_client: AsyncClient, active_subscriber: dict):
    resp = await auth_client.get("/subscribers")
    assert resp.status_code == 200
    ids = [s["id"] for s in resp.json()]
    assert active_subscriber["id"] in ids


@pytest.mark.asyncio
async def test_get_subscriber_detail(auth_client: AsyncClient, active_subscriber: dict):
    resp = await auth_client.get(f"/subscribers/{active_subscriber['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == active_subscriber["id"]
    assert "vehicles" in data
    assert "payments" in data


@pytest.mark.asyncio
async def test_get_subscriber_not_found(auth_client: AsyncClient):
    resp = await auth_client.get("/subscribers/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_subscriber(auth_client: AsyncClient, active_subscriber: dict):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}",
        json={"phone": "11911112222"},
    )
    assert resp.status_code == 200
    assert resp.json()["phone"] == "11911112222"


@pytest.mark.asyncio
async def test_delete_subscriber_soft(auth_client: AsyncClient, active_subscriber: dict):
    resp = await auth_client.delete(f"/subscribers/{active_subscriber['id']}")
    assert resp.status_code == 204

    detail = await auth_client.get(f"/subscribers/{active_subscriber['id']}")
    assert detail.json()["is_active"] is False
    assert detail.json()["status"] == "active"


@pytest.mark.asyncio
async def test_reactivate_subscriber(auth_client: AsyncClient, active_subscriber: dict):
    await auth_client.delete(f"/subscribers/{active_subscriber['id']}")
    resp = await auth_client.patch(f"/subscribers/{active_subscriber['id']}/reactivate")
    assert resp.status_code == 200
    assert resp.json()["is_active"] is True


@pytest.mark.asyncio
async def test_delete_subscriber_not_found(auth_client: AsyncClient):
    resp = await auth_client.delete("/subscribers/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_subscribers_require_admin(operator_client: AsyncClient):
    resp = await operator_client.get("/subscribers")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_subscribers_require_auth(client: AsyncClient):
    resp = await client.get("/subscribers")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_add_vehicle(auth_client: AsyncClient, active_subscriber: dict):
    resp = await auth_client.post(
        f"/subscribers/{active_subscriber['id']}/vehicles",
        json={"plate": "VHC1A23"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["plate"] == "VHC1A23"
    assert data["subscriber_id"] == active_subscriber["id"]


@pytest.mark.asyncio
async def test_add_vehicle_duplicate_plate(
    auth_client: AsyncClient, active_subscriber_with_vehicle: dict
):
    resp = await auth_client.post(
        f"/subscribers/{active_subscriber_with_vehicle['id']}/vehicles",
        json={"plate": active_subscriber_with_vehicle["plate"]},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_list_vehicles(
    auth_client: AsyncClient, active_subscriber_with_vehicle: dict
):
    resp = await auth_client.get(
        f"/subscribers/{active_subscriber_with_vehicle['id']}/vehicles"
    )
    assert resp.status_code == 200
    plates = [v["plate"] for v in resp.json()]
    assert active_subscriber_with_vehicle["plate"] in plates


@pytest.mark.asyncio
async def test_remove_vehicle(
    auth_client: AsyncClient, active_subscriber_with_vehicle: dict
):
    resp = await auth_client.delete(
        f"/subscribers/{active_subscriber_with_vehicle['id']}/vehicles/{active_subscriber_with_vehicle['vehicle_id']}"
    )
    assert resp.status_code == 204

    vehicles = await auth_client.get(
        f"/subscribers/{active_subscriber_with_vehicle['id']}/vehicles"
    )
    assert vehicles.json() == []
