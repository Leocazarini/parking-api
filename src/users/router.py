from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth.dependencies import get_current_user, require_admin
from src.database import get_db
from src.users import service
from src.users.schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.get("", response_model=list[UserResponse])
async def list_users(
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.list_users(conn)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.create_user(conn, data.model_dump())


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.get_user(conn, user_id)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.update_user(conn, user_id, data.model_dump())


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: int,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    await service.deactivate_user(conn, user_id)
