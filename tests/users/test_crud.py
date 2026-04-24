import pytest
from httpx import AsyncClient

NEW_USER = {
    "username": "novo_op",
    "email": "novo@test.com",
    "password": "senha123",
    "role": "operator",
}


@pytest.mark.asyncio
async def test_list_users(auth_client: AsyncClient, admin_user: dict):
    resp = await auth_client.get("/users")
    assert resp.status_code == 200
    ids = [u["id"] for u in resp.json()]
    assert admin_user["id"] in ids


@pytest.mark.asyncio
async def test_list_users_requires_admin(operator_client: AsyncClient):
    resp = await operator_client.get("/users")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_users_requires_auth(client: AsyncClient):
    resp = await client.get("/users")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_user(auth_client: AsyncClient):
    resp = await auth_client.post("/users", json=NEW_USER)
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "novo_op"
    assert data["role"] == "operator"
    assert data["is_active"] is True
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_create_user_duplicate_username(auth_client: AsyncClient):
    await auth_client.post("/users", json=NEW_USER)
    resp = await auth_client.post("/users", json=NEW_USER)
    assert resp.status_code == 409
    assert "novo_op" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_create_user_duplicate_email(auth_client: AsyncClient):
    await auth_client.post("/users", json=NEW_USER)
    resp = await auth_client.post(
        "/users", json={**NEW_USER, "username": "outro_nome"}
    )
    assert resp.status_code == 409
    assert "novo@test.com" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_create_user_invalid_role(auth_client: AsyncClient):
    resp = await auth_client.post("/users", json={**NEW_USER, "role": "superadmin"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_user(auth_client: AsyncClient, admin_user: dict):
    resp = await auth_client.get(f"/users/{admin_user['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == admin_user["id"]


@pytest.mark.asyncio
async def test_get_user_not_found(auth_client: AsyncClient):
    resp = await auth_client.get("/users/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_user_role(auth_client: AsyncClient):
    create = await auth_client.post("/users", json=NEW_USER)
    user_id = create.json()["id"]

    resp = await auth_client.put(f"/users/{user_id}", json={"role": "admin"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


@pytest.mark.asyncio
async def test_update_user_is_active(auth_client: AsyncClient):
    create = await auth_client.post("/users", json=NEW_USER)
    user_id = create.json()["id"]

    resp = await auth_client.put(f"/users/{user_id}", json={"is_active": False})
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


@pytest.mark.asyncio
async def test_deactivate_user(auth_client: AsyncClient):
    create = await auth_client.post("/users", json=NEW_USER)
    user_id = create.json()["id"]

    resp = await auth_client.delete(f"/users/{user_id}")
    assert resp.status_code == 204

    detail = await auth_client.get(f"/users/{user_id}")
    assert detail.json()["is_active"] is False


@pytest.mark.asyncio
async def test_deactivate_user_not_found(auth_client: AsyncClient):
    resp = await auth_client.delete("/users/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_me_still_works(auth_client: AsyncClient, admin_user: dict):
    resp = await auth_client.get("/users/me")
    assert resp.status_code == 200
    assert resp.json()["id"] == admin_user["id"]
