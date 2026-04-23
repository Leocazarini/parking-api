from contextlib import asynccontextmanager

import structlog
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from src.catalog.router import router as catalog_router
from src.config import settings
from src.database import get_db
from src.parking.router import router as parking_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", environment=settings.ENVIRONMENT)
    yield
    logger.info("shutdown")


app = FastAPI(
    title="Parking API",
    version="1.0.0",
    lifespan=lifespan,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog_router)
app.include_router(parking_router)


@app.get("/health", tags=["health"])
async def health_check(conn: AsyncConnection = Depends(get_db)):
    await conn.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "ok"}
