from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth.dependencies import require_admin
from src.database import get_db
from src.subscribers import service
from src.subscribers.schemas import (
    OverdueJobResponse,
    PaymentCreate,
    PaymentResponse,
    SubscriberCreate,
    SubscriberDetail,
    SubscriberResponse,
    SubscriberUpdate,
    VehicleCreate,
    VehicleResponse,
)

router = APIRouter(prefix="/subscribers", tags=["subscribers"])


# Registrada antes de /{subscriber_id} para evitar conflito de rota
@router.post(
    "/jobs/check-overdue",
    response_model=OverdueJobResponse,
    tags=["subscribers"],
)
async def run_overdue_job(
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.check_overdue(conn)


@router.get("", response_model=list[SubscriberResponse])
async def list_subscribers(
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.list_subscribers(conn)


@router.post("", response_model=SubscriberResponse, status_code=status.HTTP_201_CREATED)
async def create_subscriber(
    data: SubscriberCreate,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.create_subscriber(conn, data.model_dump())


@router.get("/{subscriber_id}", response_model=SubscriberDetail)
async def get_subscriber(
    subscriber_id: int,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.get_subscriber(conn, subscriber_id)


@router.put("/{subscriber_id}", response_model=SubscriberDetail)
async def update_subscriber(
    subscriber_id: int,
    data: SubscriberUpdate,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.update_subscriber(conn, subscriber_id, data.model_dump())


@router.delete("/{subscriber_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscriber(
    subscriber_id: int,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    await service.delete_subscriber(conn, subscriber_id)


@router.patch("/{subscriber_id}/reactivate", response_model=SubscriberDetail)
async def reactivate_subscriber(
    subscriber_id: int,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.reactivate_subscriber(conn, subscriber_id)


@router.get("/{subscriber_id}/vehicles", response_model=list[VehicleResponse])
async def list_vehicles(
    subscriber_id: int,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.list_vehicles(conn, subscriber_id)


@router.post(
    "/{subscriber_id}/vehicles",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_vehicle(
    subscriber_id: int,
    data: VehicleCreate,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.add_vehicle(conn, subscriber_id, data.model_dump())


@router.delete(
    "/{subscriber_id}/vehicles/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_vehicle(
    subscriber_id: int,
    vehicle_id: int,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    await service.remove_vehicle(conn, subscriber_id, vehicle_id)


@router.post(
    "/{subscriber_id}/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_payment(
    subscriber_id: int,
    data: PaymentCreate,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.create_payment(conn, subscriber_id, data.model_dump())


@router.get("/{subscriber_id}/payments", response_model=list[PaymentResponse])
async def list_payments(
    subscriber_id: int,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.list_payments(conn, subscriber_id)


@router.delete(
    "/{subscriber_id}/payments/{payment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_payment(
    subscriber_id: int,
    payment_id: int,
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    await service.remove_payment(conn, subscriber_id, payment_id)
