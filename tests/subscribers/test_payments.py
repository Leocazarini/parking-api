from datetime import date

import pytest
from httpx import AsyncClient

from tests.subscribers.conftest import first_of_current_month


def payment_payload(reference_month: date | None = None) -> dict:
    ref = reference_month or first_of_current_month()
    return {
        "amount": "120.00",
        "reference_month": ref.isoformat(),
        "payment_date": date.today().isoformat(),
        "payment_method": "pix",
    }


@pytest.mark.asyncio
async def test_create_payment(auth_client: AsyncClient, active_subscriber: dict):
    resp = await auth_client.post(
        f"/subscribers/{active_subscriber['id']}/payments",
        json=payment_payload(),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["subscriber_id"] == active_subscriber["id"]
    assert data["payment_method"] == "pix"
    assert "reference_month" in data


@pytest.mark.asyncio
async def test_create_payment_with_notes(auth_client: AsyncClient, active_subscriber: dict):
    payload = {**payment_payload(), "notes": "Pagamento em dinheiro trocado"}
    resp = await auth_client.post(
        f"/subscribers/{active_subscriber['id']}/payments", json=payload
    )
    assert resp.status_code == 201
    assert resp.json()["notes"] == "Pagamento em dinheiro trocado"


@pytest.mark.asyncio
async def test_list_payments(auth_client: AsyncClient, active_subscriber: dict):
    await auth_client.post(
        f"/subscribers/{active_subscriber['id']}/payments", json=payment_payload()
    )
    resp = await auth_client.get(f"/subscribers/{active_subscriber['id']}/payments")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_payment_activates_overdue_subscriber(
    auth_client: AsyncClient, overdue_subscriber: dict
):
    resp = await auth_client.post(
        f"/subscribers/{overdue_subscriber['id']}/payments",
        json=payment_payload(first_of_current_month()),
    )
    assert resp.status_code == 201

    detail = await auth_client.get(f"/subscribers/{overdue_subscriber['id']}")
    assert detail.json()["status"] == "active"


@pytest.mark.asyncio
async def test_payment_past_month_does_not_activate_overdue(
    auth_client: AsyncClient, overdue_subscriber: dict
):
    today = date.today()
    if today.month == 1:
        past_month = date(today.year - 1, 12, 1)
    else:
        past_month = date(today.year, today.month - 1, 1)

    resp = await auth_client.post(
        f"/subscribers/{overdue_subscriber['id']}/payments",
        json=payment_payload(past_month),
    )
    assert resp.status_code == 201

    detail = await auth_client.get(f"/subscribers/{overdue_subscriber['id']}")
    assert detail.json()["status"] == "overdue"


@pytest.mark.asyncio
async def test_payment_for_not_found_subscriber(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/subscribers/99999/payments", json=payment_payload()
    )
    assert resp.status_code == 404
