import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_logout_blocks_subsequent_refresh(client: AsyncClient, admin_user: dict):
    login_resp = await client.post(
        "/auth/login",
        json={"username": admin_user["username"], "password": admin_user["password"]},
    )
    tokens = login_resp.json()

    await client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )

    resp = await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rotates_token(client: AsyncClient, admin_user: dict):
    login_resp = await client.post(
        "/auth/login",
        json={"username": admin_user["username"], "password": admin_user["password"]},
    )
    original_refresh = login_resp.json()["refresh_token"]

    refresh_resp = await client.post("/auth/refresh", json={"refresh_token": original_refresh})
    assert refresh_resp.status_code == 200
    assert refresh_resp.json()["refresh_token"] != original_refresh


@pytest.mark.asyncio
async def test_reuse_old_refresh_token_returns_401(client: AsyncClient, admin_user: dict):
    login_resp = await client.post(
        "/auth/login",
        json={"username": admin_user["username"], "password": admin_user["password"]},
    )
    original_refresh = login_resp.json()["refresh_token"]

    # Use the token once (rotates it)
    await client.post("/auth/refresh", json={"refresh_token": original_refresh})

    # Try to reuse the consumed token
    resp = await client.post("/auth/refresh", json={"refresh_token": original_refresh})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_reuse_detection_revokes_all_user_tokens(client: AsyncClient, admin_user: dict):
    login_resp = await client.post(
        "/auth/login",
        json={"username": admin_user["username"], "password": admin_user["password"]},
    )
    original_refresh = login_resp.json()["refresh_token"]

    # "Attacker" uses the token to get a new pair
    refresh_resp = await client.post("/auth/refresh", json={"refresh_token": original_refresh})
    new_refresh = refresh_resp.json()["refresh_token"]

    # "Victim" presents the old token → reuse detected → all tokens revoked
    await client.post("/auth/refresh", json={"refresh_token": original_refresh})

    # Attacker's new token should also be invalid now
    resp = await client.post("/auth/refresh", json={"refresh_token": new_refresh})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_purge_tokens_returns_deleted_count(auth_client: AsyncClient):
    resp = await auth_client.post("/auth/jobs/purge-tokens")
    assert resp.status_code == 200
    assert "deleted" in resp.json()
    assert isinstance(resp.json()["deleted"], int)


@pytest.mark.asyncio
async def test_purge_tokens_requires_admin(client: AsyncClient, operator_client: AsyncClient):
    resp = await operator_client.post("/auth/jobs/purge-tokens")
    assert resp.status_code == 403
