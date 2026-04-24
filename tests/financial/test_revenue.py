from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# GET /financial/revenue
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_revenue_requires_admin(operator_client: AsyncClient):
    today = date.today().isoformat()
    resp = await operator_client.get(
        "/financial/revenue", params={"start_date": today, "end_date": today}
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_revenue_requires_auth(client: AsyncClient):
    today = date.today().isoformat()
    resp = await client.get(
        "/financial/revenue", params={"start_date": today, "end_date": today}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_revenue_empty_period(auth_client: AsyncClient):
    far_future = "2099-01-01"
    resp = await auth_client.get(
        "/financial/revenue",
        params={"start_date": far_future, "end_date": far_future},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(data["total"]) == Decimal("0")
    assert data["entries_count"] == 0
    assert data["average_duration_minutes"] == 0.0


@pytest.mark.asyncio
async def test_revenue_totals_today(
    auth_client: AsyncClient, entries_dataset: dict
):
    today = entries_dataset["today"].isoformat()
    resp = await auth_client.get(
        "/financial/revenue", params={"start_date": today, "end_date": today}
    )
    assert resp.status_code == 200
    data = resp.json()

    # FIN1 (20) + FIN2 (20) + FIN3 (0) = 40; FIN5 sem saída não conta
    assert Decimal(data["total"]) == Decimal("40.00")
    assert data["entries_count"] == 3


@pytest.mark.asyncio
async def test_revenue_breakdown_by_payment_method(
    auth_client: AsyncClient, entries_dataset: dict
):
    today = entries_dataset["today"].isoformat()
    resp = await auth_client.get(
        "/financial/revenue", params={"start_date": today, "end_date": today}
    )
    pm = resp.json()["by_payment_method"]
    assert Decimal(pm["pix"]) == Decimal("20.00")   # FIN1 + FIN3
    assert Decimal(pm["dinheiro"]) == Decimal("20.00")  # FIN2
    assert Decimal(pm["credito"]) == Decimal("0")
    assert Decimal(pm["debito"]) == Decimal("0")


@pytest.mark.asyncio
async def test_revenue_breakdown_by_client_type(
    auth_client: AsyncClient, entries_dataset: dict
):
    today = entries_dataset["today"].isoformat()
    resp = await auth_client.get(
        "/financial/revenue", params={"start_date": today, "end_date": today}
    )
    ct = resp.json()["by_client_type"]
    assert Decimal(ct["regular"]) == Decimal("40.00")   # FIN1 + FIN2
    assert Decimal(ct["subscriber"]) == Decimal("0.00")  # FIN3


@pytest.mark.asyncio
async def test_revenue_average_duration(
    auth_client: AsyncClient, entries_dataset: dict
):
    today = entries_dataset["today"].isoformat()
    resp = await auth_client.get(
        "/financial/revenue", params={"start_date": today, "end_date": today}
    )
    # FIN1: 120 min, FIN2: 120 min, FIN3: 30 min → avg = 90
    assert resp.json()["average_duration_minutes"] == pytest.approx(90.0, abs=0.1)


@pytest.mark.asyncio
async def test_revenue_multi_day_period(
    auth_client: AsyncClient, entries_dataset: dict
):
    today = entries_dataset["today"]
    yesterday = entries_dataset["yesterday"]
    resp = await auth_client.get(
        "/financial/revenue",
        params={"start_date": yesterday.isoformat(), "end_date": today.isoformat()},
    )
    data = resp.json()
    # 40 (hoje) + 10 (ontem) = 50
    assert Decimal(data["total"]) == Decimal("50.00")
    assert data["entries_count"] == 4


@pytest.mark.asyncio
async def test_revenue_invalid_date_range(auth_client: AsyncClient):
    resp = await auth_client.get(
        "/financial/revenue",
        params={"start_date": "2026-04-10", "end_date": "2026-04-01"},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /financial/revenue/daily
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_daily_revenue_structure(
    auth_client: AsyncClient, entries_dataset: dict
):
    today = entries_dataset["today"]
    resp = await auth_client.get(
        "/financial/revenue/daily",
        params={"month": today.strftime("%Y-%m")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)

    today_entry = next((d for d in data if d["date"] == today.isoformat()), None)
    assert today_entry is not None
    assert Decimal(today_entry["total"]) == Decimal("40.00")
    assert today_entry["entries_count"] == 3


@pytest.mark.asyncio
async def test_daily_revenue_yesterday(
    auth_client: AsyncClient, entries_dataset: dict
):
    today = entries_dataset["today"]
    yesterday = entries_dataset["yesterday"]

    if today.month == yesterday.month:
        resp = await auth_client.get(
            "/financial/revenue/daily",
            params={"month": today.strftime("%Y-%m")},
        )
        data = resp.json()
        yesterday_entry = next(
            (d for d in data if d["date"] == yesterday.isoformat()), None
        )
        assert yesterday_entry is not None
        assert Decimal(yesterday_entry["total"]) == Decimal("10.00")


@pytest.mark.asyncio
async def test_daily_revenue_invalid_month_format(auth_client: AsyncClient):
    resp = await auth_client.get(
        "/financial/revenue/daily", params={"month": "2026/04"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_daily_revenue_empty_month(auth_client: AsyncClient):
    resp = await auth_client.get(
        "/financial/revenue/daily", params={"month": "2099-01"}
    )
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# GET /financial/parking-summary
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_parking_summary_counts(
    auth_client: AsyncClient, entries_dataset: dict
):
    today = entries_dataset["today"].isoformat()
    resp = await auth_client.get(
        "/financial/parking-summary",
        params={"start_date": today, "end_date": today},
    )
    assert resp.status_code == 200
    data = resp.json()

    # FIN1, FIN2, FIN3, FIN5 — todos de hoje (FIN5 sem saída ainda conta como entrada)
    assert data["total_entries"] == 4
    assert data["regular_entries"] == 3   # FIN1, FIN2, FIN5
    assert data["subscriber_entries"] == 1  # FIN3


@pytest.mark.asyncio
async def test_parking_summary_free_exits(
    auth_client: AsyncClient, entries_dataset: dict
):
    today = entries_dataset["today"].isoformat()
    resp = await auth_client.get(
        "/financial/parking-summary",
        params={"start_date": today, "end_date": today},
    )
    # FIN3: subscriber com amount_charged = 0
    assert resp.json()["free_exits"] == 1


@pytest.mark.asyncio
async def test_parking_summary_average_stay(
    auth_client: AsyncClient, entries_dataset: dict
):
    today = entries_dataset["today"].isoformat()
    resp = await auth_client.get(
        "/financial/parking-summary",
        params={"start_date": today, "end_date": today},
    )
    # FIN1: 120 min, FIN2: 120 min, FIN3: 30 min (FIN5 sem saída não entra na média)
    assert resp.json()["average_stay_minutes"] == pytest.approx(90.0, abs=0.1)


@pytest.mark.asyncio
async def test_parking_summary_peak_hour(
    auth_client: AsyncClient, entries_dataset: dict
):
    today = entries_dataset["today"].isoformat()
    resp = await auth_client.get(
        "/financial/parking-summary",
        params={"start_date": today, "end_date": today},
    )
    data = resp.json()
    # FIN1 h=8, FIN2 h=10, FIN3 h=10, FIN5 h=14 → peak = 10
    assert data["peak_hour"] == 10


@pytest.mark.asyncio
async def test_parking_summary_empty_period(auth_client: AsyncClient):
    resp = await auth_client.get(
        "/financial/parking-summary",
        params={"start_date": "2099-01-01", "end_date": "2099-01-01"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_entries"] == 0
    assert data["peak_hour"] is None


# ---------------------------------------------------------------------------
# GET /financial/subscribers/revenue
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_subscriber_revenue(
    auth_client: AsyncClient, subscriber_payments_dataset: dict
):
    ds = subscriber_payments_dataset
    resp = await auth_client.get(
        "/financial/subscribers/revenue",
        params={"month": ds["current_month"].strftime("%Y-%m")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(data["total_received"]) == Decimal("300.00")
    assert data["payments_count"] == 2
    assert data["overdue_count"] == 1


@pytest.mark.asyncio
async def test_subscriber_revenue_empty_month(auth_client: AsyncClient):
    resp = await auth_client.get(
        "/financial/subscribers/revenue", params={"month": "2099-01"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(data["total_received"]) == Decimal("0")
    assert data["payments_count"] == 0


@pytest.mark.asyncio
async def test_subscriber_revenue_requires_admin(operator_client: AsyncClient):
    resp = await operator_client.get(
        "/financial/subscribers/revenue", params={"month": "2026-04"}
    )
    assert resp.status_code == 403
