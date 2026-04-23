from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncConnection

from src.catalog import service
from src.catalog.schemas import ColorResponse, ModelResponse
from src.database import get_db

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/colors", response_model=list[ColorResponse])
async def list_colors(conn: AsyncConnection = Depends(get_db)):
    return await service.get_all_colors(conn)


@router.get("/models", response_model=list[ModelResponse])
async def list_models(conn: AsyncConnection = Depends(get_db)):
    return await service.get_all_models(conn)
