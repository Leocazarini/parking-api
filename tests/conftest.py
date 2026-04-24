import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import StaticPool

from src.auth.service import create_access_token, hash_password
from src.auth.tables import user_table
from src.catalog.tables import vehicle_color, vehicle_model
from src.database import get_db, metadata
from src.main import app
from src.parking.tables import parking_config

COLORS = [
    "Amarelo", "Azul", "Azul Marinho", "Bege", "Branco",
    "Bronze", "Champagne", "Cinza", "Creme", "Dourado",
    "Grafite", "Grená", "Laranja", "Lilás", "Marrom",
    "Prata", "Preto", "Rosa", "Roxo", "Verde",
    "Verde Musgo", "Vermelho", "Vinho",
]

MODELS = [
    "208", "2008", "3008", "Aircross", "Amarok",
    "Argo", "ASX", "Biz", "C3", "Captur",
    "Celta", "CG 160", "City", "Civic", "Cobalt",
    "Commander", "Compass", "Corolla", "Corsa", "CR-V",
    "Creta", "Cronos", "Cruze", "Doblò", "Ducato",
    "Duster", "EcoSport", "Etios", "Factor 150", "Fastback",
    "Fazer 250", "Fiesta", "Fit", "Focus", "Fox",
    "Frontier", "Gol", "Golf", "HB20", "HB20S",
    "Hilux", "HR-V", "i30", "Ka", "Kicks",
    "Kwid", "L200 Triton", "Logan", "March", "Mobi",
    "Montana", "Nivus", "Onix", "Onix Plus", "Oroch",
    "Outlander", "Palio", "Pajero Sport", "PCX", "Polo",
    "Prisma", "Pulse", "RAV4", "Ranger", "Renegade",
    "S10", "Sandero", "Saveiro", "Siena", "Sportage",
    "Spin", "Strada", "SW4", "T-Cross", "Toro",
    "Tracker", "Tucson", "Uno", "Up!", "Versa",
    "Virtus", "Voyage", "WR-V", "XRE 300", "Yaris",
]


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)
        await conn.execute(vehicle_color.insert(), [{"name": c} for c in COLORS])
        await conn.execute(vehicle_model.insert(), [{"name": m} for m in MODELS])
        await conn.execute(
            parking_config.insert().values(
                id=1, hourly_rate="10.00", daily_rate="50.00", tolerance_minutes=5
            )
        )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_engine):
    async def override_get_db():
        async with db_engine.begin() as conn:
            yield conn

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_user(db_engine):
    async with db_engine.begin() as conn:
        result = await conn.execute(
            user_table.insert().values(
                username="admin",
                email="admin@test.com",
                hashed_password=hash_password("admin123"),
                role="admin",
                is_active=True,
            )
        )
        user_id = result.inserted_primary_key[0]
    return {"id": user_id, "username": "admin", "password": "admin123", "role": "admin"}


@pytest_asyncio.fixture
async def operator_user(db_engine):
    async with db_engine.begin() as conn:
        result = await conn.execute(
            user_table.insert().values(
                username="operador",
                email="operador@test.com",
                hashed_password=hash_password("op123"),
                role="operator",
                is_active=True,
            )
        )
        user_id = result.inserted_primary_key[0]
    return {"id": user_id, "username": "operador", "password": "op123", "role": "operator"}


@pytest_asyncio.fixture
async def admin_token(admin_user):
    return create_access_token(user_id=admin_user["id"], role="admin")


@pytest_asyncio.fixture
async def operator_token(operator_user):
    return create_access_token(user_id=operator_user["id"], role="operator")


@pytest_asyncio.fixture
async def auth_client(client, admin_token):
    client.headers["Authorization"] = f"Bearer {admin_token}"
    return client


@pytest_asyncio.fixture
async def operator_client(client, operator_token):
    client.headers["Authorization"] = f"Bearer {operator_token}"
    return client
