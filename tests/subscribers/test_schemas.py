"""Testes focados em validações de schema dos endpoints de mensalistas."""
from datetime import date

import pytest
from httpx import AsyncClient

BASE = {
    "name": "Teste Schema",
    "cpf": "55566677788",
    "due_day": 10,
}

TODAY = date.today().isoformat()
CURRENT_MONTH = date.today().replace(day=1).isoformat()


# ---------------------------------------------------------------------------
# SubscriberCreate — validações de nome
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_subscriber_empty_name(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "name": ""})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_subscriber_name_too_long(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "name": "A" * 256})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# SubscriberCreate — validações de CPF
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_subscriber_invalid_cpf(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "cpf": "123"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# SubscriberCreate — validações de telefone
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_subscriber_phone_null_becomes_none(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "phone": None})
    assert resp.status_code == 201
    assert resp.json()["phone"] is None


@pytest.mark.asyncio
async def test_create_subscriber_phone_empty_becomes_none(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "phone": ""})
    assert resp.status_code == 201
    assert resp.json()["phone"] is None


@pytest.mark.asyncio
async def test_create_subscriber_invalid_phone(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "phone": "12345"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# SubscriberCreate — validações de e-mail
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_subscriber_email_null_becomes_none(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "email": None})
    assert resp.status_code == 201
    assert resp.json()["email"] is None


@pytest.mark.asyncio
async def test_create_subscriber_email_empty_becomes_none(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "email": ""})
    assert resp.status_code == 201
    assert resp.json()["email"] is None


@pytest.mark.asyncio
async def test_create_subscriber_invalid_email(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "email": "notanemail"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# SubscriberCreate — validações de CEP
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_subscriber_valid_zip_code(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "zip_code": "01310100"})
    assert resp.status_code == 201
    assert resp.json()["zip_code"] == "01310-100"


@pytest.mark.asyncio
async def test_create_subscriber_invalid_zip_code(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "zip_code": "123"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_subscriber_zip_code_null_becomes_none(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "zip_code": None})
    assert resp.status_code == 201
    assert resp.json()["zip_code"] is None


# ---------------------------------------------------------------------------
# SubscriberCreate — validações de estado (UF)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_subscriber_valid_state_normalized(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "state": "sp"})
    assert resp.status_code == 201
    assert resp.json()["state"] == "SP"


@pytest.mark.asyncio
async def test_create_subscriber_invalid_state(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "state": "SPP"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_subscriber_state_null_becomes_none(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "state": None})
    assert resp.status_code == 201
    assert resp.json()["state"] is None


# ---------------------------------------------------------------------------
# SubscriberCreate — validações de campos de endereço
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_subscriber_address_null_becomes_none(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/subscribers",
        json={**BASE, "street": "", "neighborhood": None, "city": ""},
    )
    assert resp.status_code == 201
    assert resp.json()["street"] is None
    assert resp.json()["neighborhood"] is None


@pytest.mark.asyncio
async def test_create_subscriber_number_null_becomes_none(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "number": ""})
    assert resp.status_code == 201
    assert resp.json()["number"] is None


@pytest.mark.asyncio
async def test_create_subscriber_complement_null_becomes_none(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "complement": ""})
    assert resp.status_code == 201
    assert resp.json()["complement"] is None


@pytest.mark.asyncio
async def test_create_subscriber_valid_address(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/subscribers",
        json={**BASE, "street": "Rua das Flores", "city": "São Paulo", "neighborhood": "Centro"},
    )
    assert resp.status_code == 201
    assert resp.json()["street"] == "Rua das Flores"


@pytest.mark.asyncio
async def test_create_subscriber_street_too_long(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "street": "A" * 256})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_subscriber_valid_number(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "number": "123"})
    assert resp.status_code == 201
    assert resp.json()["number"] == "123"


@pytest.mark.asyncio
async def test_create_subscriber_number_too_long(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "number": "12345678901"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_subscriber_valid_complement(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "complement": "Apto 12"})
    assert resp.status_code == 201
    assert resp.json()["complement"] == "Apto 12"


@pytest.mark.asyncio
async def test_create_subscriber_complement_too_long(auth_client: AsyncClient):
    resp = await auth_client.post("/subscribers", json={**BASE, "complement": "A" * 101})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# SubscriberUpdate — validações
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_subscriber_name_too_long(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"name": "A" * 256}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_subscriber_phone_empty_becomes_none(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"phone": ""}
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_update_subscriber_invalid_phone(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"phone": "12345"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_subscriber_email_empty_becomes_none(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"email": ""}
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_update_subscriber_invalid_email(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"email": "bad"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_subscriber_invalid_due_day(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"due_day": 32}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_subscriber_name_empty_becomes_none(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"name": ""}
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_update_subscriber_valid_name(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"name": "Novo Nome"}
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Novo Nome"


@pytest.mark.asyncio
async def test_update_subscriber_valid_email(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"email": "novo@exemplo.com"}
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "novo@exemplo.com"


@pytest.mark.asyncio
async def test_update_subscriber_valid_due_day(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"due_day": 20}
    )
    assert resp.status_code == 200
    assert resp.json()["due_day"] == 20


@pytest.mark.asyncio
async def test_update_subscriber_valid_zip(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"zip_code": "01310100"}
    )
    assert resp.status_code == 200
    assert resp.json()["zip_code"] == "01310-100"


@pytest.mark.asyncio
async def test_update_subscriber_zip_null_becomes_none(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"zip_code": ""}
    )
    assert resp.status_code == 200
    assert resp.json()["zip_code"] is None


@pytest.mark.asyncio
async def test_update_subscriber_invalid_zip(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"zip_code": "123"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_subscriber_valid_state(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"state": "rj"}
    )
    assert resp.status_code == 200
    assert resp.json()["state"] == "RJ"


@pytest.mark.asyncio
async def test_update_subscriber_invalid_state(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"state": "RJX"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_subscriber_state_null_becomes_none(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.put(
        f"/subscribers/{active_subscriber['id']}", json={"state": ""}
    )
    assert resp.status_code == 200
    assert resp.json()["state"] is None


# ---------------------------------------------------------------------------
# VehicleCreate — placa inválida
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_add_vehicle_invalid_plate(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.post(
        f"/subscribers/{active_subscriber['id']}/vehicles",
        json={"plate": "INVALIDA"},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# PaymentCreate — validações
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_payment_zero_amount(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.post(
        f"/subscribers/{active_subscriber['id']}/payments",
        json={
            "amount": "0",
            "reference_month": CURRENT_MONTH,
            "payment_date": TODAY,
            "payment_method": "pix",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_payment_negative_amount(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.post(
        f"/subscribers/{active_subscriber['id']}/payments",
        json={
            "amount": "-10",
            "reference_month": CURRENT_MONTH,
            "payment_date": TODAY,
            "payment_method": "pix",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_payment_amount_too_large(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.post(
        f"/subscribers/{active_subscriber['id']}/payments",
        json={
            "amount": "100000",
            "reference_month": CURRENT_MONTH,
            "payment_date": TODAY,
            "payment_method": "pix",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_payment_notes_empty_becomes_none(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.post(
        f"/subscribers/{active_subscriber['id']}/payments",
        json={
            "amount": "150",
            "reference_month": CURRENT_MONTH,
            "payment_date": TODAY,
            "payment_method": "pix",
            "notes": "",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["notes"] is None


@pytest.mark.asyncio
async def test_create_payment_notes_too_long(
    auth_client: AsyncClient, active_subscriber: dict
):
    resp = await auth_client.post(
        f"/subscribers/{active_subscriber['id']}/payments",
        json={
            "amount": "150",
            "reference_month": CURRENT_MONTH,
            "payment_date": TODAY,
            "payment_method": "pix",
            "notes": "A" * 501,
        },
    )
    assert resp.status_code == 422
