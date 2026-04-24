from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth import service
from src.auth.dependencies import get_current_user
from src.auth.schemas import LoginRequest, RefreshRequest, TokenResponse
from src.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, conn: AsyncConnection = Depends(get_db)):
    user = await service.authenticate(conn, data.username, data.password)
    return await service.issue_tokens(conn, user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, conn: AsyncConnection = Depends(get_db)):
    return await service.refresh_tokens(conn, data.refresh_token)


@router.post("/logout", status_code=204)
async def logout(
    current_user: dict = Depends(get_current_user),
    conn: AsyncConnection = Depends(get_db),
):
    await service.revoke_refresh_token(conn, current_user["id"])
