from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth.dependencies import get_current_user, require_admin
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
    HistoryResponse,
)

router = APIRouter(prefix="/patio", tags=["patio"])


@router.get("/ativos", response_model=list[ActiveEntryResponse])
async def list_active_entries(
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return await service.get_active_entries(conn)


@router.post("/entrada", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
async def register_entry(
    data: EntryCreate,
    conn: AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await service.create_entry(
        conn, placa=data.placa, color_id=data.color_id, model_id=data.model_id, operator_id=current_user["id"]
    )


@router.post("/saida", response_model=ExitResponse)
async def register_exit(
    data: ExitCreate,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return await service.create_exit(
        conn, entry_id=data.entry_id, payment_method=data.payment_method
    )


@router.get("/historico", response_model=HistoryResponse)
async def get_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    plate: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    client_type: str | None = Query(None),
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return await service.get_history(conn, page, page_size, plate, date_from, date_to, client_type)


@router.get("/config", response_model=ConfigResponse)
async def get_config(conn: AsyncConnection = Depends(get_db)):
    return await service.get_config(conn)


@router.put("/config", response_model=ConfigResponse)
async def update_config(
    data: ConfigUpdate,
    conn: AsyncConnection = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    return await service.update_config(conn, current_user["id"], data.model_dump())
