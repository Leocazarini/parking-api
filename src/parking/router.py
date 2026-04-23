from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncConnection

from src.database import get_db
from src.parking import service
from src.parking.schemas import (
    ActiveEntryResponse,
    ConfigResponse,
    ConfigUpdate,
    EntryCreate,
    EntryResponse,
    ExitCreate,
    ExitResponse,
)

router = APIRouter(prefix="/patio", tags=["patio"])


@router.get("/ativos", response_model=list[ActiveEntryResponse])
async def list_active_entries(conn: AsyncConnection = Depends(get_db)):
    return await service.get_active_entries(conn)


@router.post("/entrada", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
async def register_entry(data: EntryCreate, conn: AsyncConnection = Depends(get_db)):
    return await service.create_entry(conn, placa=data.placa, color_id=data.color_id)


@router.post("/saida", response_model=ExitResponse)
async def register_exit(data: ExitCreate, conn: AsyncConnection = Depends(get_db)):
    return await service.create_exit(
        conn, entry_id=data.entry_id, payment_method=data.payment_method
    )


@router.get("/config", response_model=ConfigResponse)
async def get_config(conn: AsyncConnection = Depends(get_db)):
    return await service.get_config(conn)


@router.put("/config", response_model=ConfigResponse)
async def update_config(data: ConfigUpdate, conn: AsyncConnection = Depends(get_db)):
    return await service.update_config(conn, data.model_dump())
