from contextlib import asynccontextmanager

import socketio
import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth.router import router as auth_router
from src.catalog.router import router as catalog_router
from src.config import settings
from src.database import engine, get_db
from src.financial.router import router as financial_router
from src.limiter import limiter
from src.parking.router import router as parking_router
from src.socket import sio
from src.subscribers.router import router as subscribers_router
from src.subscribers.service import check_overdue
from src.users.router import router as users_router

logger = structlog.get_logger()


async def _run_overdue_check() -> None:
    async with engine.begin() as conn:
        result = await check_overdue(conn)
    logger.info("overdue_check_completed", **result)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_run_overdue_check, CronTrigger(hour=0, minute=0))
    scheduler.start()
    logger.info("startup", environment=settings.ENVIRONMENT)
    yield
    scheduler.shutdown(wait=False)
    logger.info("shutdown")


fastapi_app = FastAPI(
    title="Parking API",
    version="1.0.0",
    lifespan=lifespan,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
)

fastapi_app.state.limiter = limiter
fastapi_app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
