import calendar
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth.dependencies import require_admin
from src.database import get_db
from src.financial import service
from src.financial.schemas import (
    DailyRevenueItem,
    HourlyRevenueItem,
    MonthPaymentItem,
    OverdueSubscriberItem,
    ParkingSummaryResponse,
    RevenueResponse,
    SubscriberRevenueResponse,
)

router = APIRouter(prefix="/financial", tags=["financial"])


@router.get("/revenue", response_model=RevenueResponse)
async def get_revenue(
    start_date: date = Query(...),
    end_date: date = Query(...),
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_date não pode ser anterior a start_date",
        )
    return await service.get_revenue(conn, start_date, end_date)


@router.get("/revenue/daily", response_model=list[DailyRevenueItem])
async def get_daily_revenue(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    year, month_num = map(int, month.split("-"))
    month_start = date(year, month_num, 1)
    month_end = date(year, month_num, calendar.monthrange(year, month_num)[1])
    return await service.get_daily_revenue(conn, month_start, month_end)


@router.get("/parking-summary", response_model=ParkingSummaryResponse)
async def get_parking_summary(
    start_date: date = Query(...),
    end_date: date = Query(...),
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_date não pode ser anterior a start_date",
        )
    return await service.get_parking_summary(conn, start_date, end_date)


@router.get("/revenue/hourly", response_model=list[HourlyRevenueItem])
async def get_hourly_revenue(
    ref_date: date = Query(default=None),
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    if ref_date is None:
        ref_date = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    return await service.get_hourly_revenue(conn, ref_date)


@router.get("/subscribers/revenue", response_model=SubscriberRevenueResponse)
async def get_subscriber_revenue(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    year, month_num = map(int, month.split("-"))
    month_start = date(year, month_num, 1)
    month_end = date(year, month_num, calendar.monthrange(year, month_num)[1])
    return await service.get_subscriber_revenue(conn, month_start, month_end)


@router.get("/subscribers/overdue-list", response_model=list[OverdueSubscriberItem])
async def get_overdue_subscribers_list(
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return await service.get_overdue_subscribers(conn)


@router.get("/subscribers/payments-list", response_model=list[MonthPaymentItem])
async def get_month_payments_list(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    conn: AsyncConnection = Depends(get_db),
    _: dict = Depends(require_admin),
):
    year, month_num = map(int, month.split("-"))
    month_start = date(year, month_num, 1)
    month_end = date(year, month_num, calendar.monthrange(year, month_num)[1])
    return await service.get_month_payments(conn, month_start, month_end)
