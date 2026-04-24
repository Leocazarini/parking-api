import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from jose import jwt

from src.config import settings


@pytest.mark.asyncio
async def test_get_me_with_valid_token(auth_client: AsyncClient, admin_user: dict):
    resp = await auth_client.get("/users/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == admin_user["id"]
    assert data["username"] == admin_user["username"]
    assert data["role"] == "admin"
    assert data["is_active"] is True
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_get_me_operator(operator_client: AsyncClient, operator_user: dict):
    resp = await operator_client.get("/users/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == operator_user["username"]
    assert data["role"] == "operator"


@pytest.mark.asyncio
async def test_get_me_without_token_returns_401(client: AsyncClient):
    resp = await client.get("/users/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_invalid_token_returns_401(client: AsyncClient):
    resp = await client.get(
        "/users/me", headers={"Authorization": "Bearer token.invalido.aqui"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_expired_token_returns_401(client: AsyncClient, admin_user: dict):
    expired_payload = {
        "sub": str(admin_user["id"]),
        "role": "admin",
        "type": "access",
        "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.JWT_ALG)

    resp = await client.get(
        "/users/me", headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_refresh_token_returns_401(client: AsyncClient, admin_user: dict):
    from src.auth.service import create_refresh_token
    refresh_token, _ = create_refresh_token(user_id=admin_user["id"])

    resp = await client.get(
        "/users/me", headers={"Authorization": f"Bearer {refresh_token}"}
    )
    assert resp.status_code == 401
