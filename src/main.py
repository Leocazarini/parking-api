from contextlib import asynccontextmanager

import socketio
import structlog
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth.router import router as auth_router
from src.catalog.router import router as catalog_router
from src.config import settings
from src.database import get_db
from src.financial.router import router as financial_router
from src.parking.router import router as parking_router
from src.socket import sio
from src.subscribers.router import router as subscribers_router
from src.users.router import router as users_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", environment=settings.ENVIRONMENT)
    yield
    logger.info("shutdown")


fastapi_app = FastAPI(
    title="Parking API",
    version="1.0.0",
    lifespan=lifespan,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.include_router(auth_router)
fastapi_app.include_router(catalog_router)
fastapi_app.include_router(parking_router)
fastapi_app.include_router(subscribers_router)
fastapi_app.include_router(financial_router)
fastapi_app.include_router(users_router)


@fastapi_app.get("/health", tags=["health"])
async def health_check(conn: AsyncConnection = Depends(get_db)):
    await conn.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "ok"}


# ASGI app: socketio wraps FastAPI, WebSocket upgrades vão para o sio
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
