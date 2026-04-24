from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth.dependencies import require_admin
from src.catalog import service
from src.catalog.schemas import (
    CatalogItemCreate,
    CatalogItemUpdate,
    ColorResponse,
    ModelResponse,
)
from src.database import get_db

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/colors", response_model=list[ColorResponse])
async def list_colors(conn: AsyncConnection = Depends(get_db)):
    return await service.get_all_colors(conn)


@router.post("/colors", response_model=ColorResponse, status_code=status.HTTP_201_CREATED)
async def create_color(
    data: CatalogItemCreate,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.create_color(conn, data.name)


@router.put("/colors/{color_id}", response_model=ColorResponse)
async def update_color(
    color_id: int,
    data: CatalogItemUpdate,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.update_color(conn, color_id, data.name)


@router.delete("/colors/{color_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_color(
    color_id: int,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    await service.delete_color(conn, color_id)


@router.get("/models", response_model=list[ModelResponse])
async def list_models(conn: AsyncConnection = Depends(get_db)):
    return await service.get_all_models(conn)


@router.post("/models", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    data: CatalogItemCreate,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.create_model(conn, data.name)


@router.put("/models/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: int,
    data: CatalogItemUpdate,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.update_model(conn, model_id, data.name)


@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: int,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    await service.delete_model(conn, model_id)
