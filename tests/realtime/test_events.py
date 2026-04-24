import pytest
from httpx import AsyncClient

import src.socket as socket_module


@pytest.fixture(autouse=True)
def capture_events(monkeypatch):
    events = []

    async def mock_emit(event, data=None, room=None, **kwargs):
        events.append({"event": event, "data": data, "room": room})

    monkeypatch.setattr(socket_module.sio, "emit", mock_emit)
    return events


@pytest.fixture
def events(capture_events):
    return capture_events


# ---------------------------------------------------------------------------
# Entrada
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_entry_emits_spot_entry(auth_client: AsyncClient, events: list):
    await auth_client.post("/patio/entrada", json={"placa": "EVT1A23", "color_id": 1})

    names = [e["event"] for e in events]
    assert "spot:entry" in names


@pytest.mark.asyncio
async def test_entry_emits_yard_update(auth_client: AsyncClient, events: list):
    await auth_client.post("/patio/entrada", json={"placa": "EVT2A23", "color_id": 1})

    names = [e["event"] for e in events]
    assert "yard:update" in names


@pytest.mark.asyncio
async def test_entry_spot_entry_payload(auth_client: AsyncClient, events: list):
    await auth_client.post("/patio/entrada", json={"placa": "EVT3A23", "color_id": 1})

    spot = next(e["data"] for e in events if e["event"] == "spot:entry")
    assert spot["plate"] == "EVT3A23"
    assert isinstance(spot["color"], str)
    assert spot["client_type"] == "regular"
    assert spot["subscriber_status"] is None
    assert "entry_at" in spot
    assert "id" in spot


@pytest.mark.asyncio
async def test_entry_yard_update_payload(auth_client: AsyncClient, events: list):
    await auth_client.post("/patio/entrada", json={"placa": "EVT4A23", "color_id": 1})

    yard = next(e["data"] for e in events if e["event"] == "yard:update")
    assert "occupied" in yard
    assert "vehicles" in yard
    assert yard["occupied"] >= 1
    plates = [v["plate"] for v in yard["vehicles"]]
    assert "EVT4A23" in plates


@pytest.mark.asyncio
async def test_entry_events_sent_to_yard_room(auth_client: AsyncClient, events: list):
    await auth_client.post("/patio/entrada", json={"placa": "EVT5A23", "color_id": 1})

    for e in events:
        assert e["room"] == "yard"


@pytest.mark.asyncio
async def test_entry_subscriber_status_in_spot_entry(
    auth_client: AsyncClient, active_subscriber_with_vehicle: dict, events: list
):
    await auth_client.post(
        "/patio/entrada",
        json={"placa": active_subscriber_with_vehicle["plate"], "color_id": 1},
    )

    spot = next(e["data"] for e in events if e["event"] == "spot:entry")
    assert spot["client_type"] == "subscriber"
    assert spot["subscriber_status"] == "active"


# ---------------------------------------------------------------------------
# Saída
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_exit_emits_spot_exit(auth_client: AsyncClient, events: list):
    entry = await auth_client.post("/patio/entrada", json={"placa": "EXT1A23", "color_id": 1})
    entry_id = entry.json()["id"]
    events.clear()

    await auth_client.post("/patio/saida", json={"entry_id": entry_id, "payment_method": "pix"})

    names = [e["event"] for e in events]
    assert "spot:exit" in names
    assert "yard:update" in names


@pytest.mark.asyncio
async def test_exit_spot_exit_payload(auth_client: AsyncClient, events: list):
    entry = await auth_client.post("/patio/entrada", json={"placa": "EXT2A23", "color_id": 1})
    entry_id = entry.json()["id"]
    events.clear()

    await auth_client.post("/patio/saida", json={"entry_id": entry_id, "payment_method": "dinheiro"})

    spot = next(e["data"] for e in events if e["event"] == "spot:exit")
    assert spot["entry_id"] == entry_id
    assert spot["plate"] == "EXT2A23"
    assert "exit_at" in spot
    assert "amount_charged" in spot
    assert "duration_minutes" in spot


@pytest.mark.asyncio
async def test_exit_yard_update_removes_vehicle(auth_client: AsyncClient, events: list):
    await auth_client.post("/patio/entrada", json={"placa": "EXT3A23", "color_id": 1})
    entry_id = next(
        e["data"]["id"] for e in events if e["event"] == "spot:entry"
    )
    events.clear()

    await auth_client.post("/patio/saida", json={"entry_id": entry_id, "payment_method": "pix"})

    yard = next(e["data"] for e in events if e["event"] == "yard:update")
    plates = [v["plate"] for v in yard["vehicles"]]
    assert "EXT3A23" not in plates
