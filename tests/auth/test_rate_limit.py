import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_allows_five_attempts(client: AsyncClient):
    for _ in range(5):
        resp = await client.post(
            "/auth/login", json={"username": "qualquer", "password": "errada"}
        )
        assert resp.status_code != 429


@pytest.mark.asyncio
async def test_login_blocks_sixth_attempt(client: AsyncClient):
    for _ in range(5):
        await client.post(
            "/auth/login", json={"username": "qualquer", "password": "errada"}
        )

    resp = await client.post(
        "/auth/login", json={"username": "qualquer", "password": "errada"}
    )
    assert resp.status_code == 429


@pytest.mark.asyncio
async def test_rate_limit_does_not_apply_to_refresh(client: AsyncClient, admin_user: dict):
    login_resp = await client.post(
        "/auth/login",
        json={"username": admin_user["username"], "password": admin_user["password"]},
    )
    refresh_token = login_resp.json()["refresh_token"]

    for _ in range(10):
        await client.post("/auth/refresh", json={"refresh_token": "token.invalido"})

    # The real refresh token still works (rotation means only first use is valid)
    resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
