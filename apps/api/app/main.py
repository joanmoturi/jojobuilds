import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError

from .config import settings
from .db import engine
from .routes_auth import router as auth_router
from .routes_core import router as core_router
from .routes_finance import router as finance_router
from .routes_operations import router as operations_router

app = FastAPI(
    title="JOJOBUILDS API",
    version="0.1.0",
    docs_url="/docs" if settings.app_env != "production" else None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token", "X-Organization", "Authorization"],
)
logger = logging.getLogger("jojobuilds")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    length = request.headers.get("content-length", "")
    if length and (not length.isdigit() or int(length) > 6 * 1024 * 1024):
        return JSONResponse({"detail": "Request is too large"}, status_code=413)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.exception_handler(IntegrityError)
async def integrity_error(request: Request, error: IntegrityError):
    logger.warning("database_constraint_conflict path=%s", request.url.path)
    return JSONResponse(
        {"detail": "Conflicting record or invalid relationship. Refresh and check your input."},
        status_code=409,
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "JOJOBUILDS"}


@app.get("/ready")
def ready():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1 FROM organizations LIMIT 1"))
    except OperationalError:
        return JSONResponse(
            {"status": "not_ready", "detail": "Database unavailable or migrations missing"},
            status_code=503,
        )
    return {"status": "ready"}


app.include_router(auth_router)
app.include_router(core_router)
app.include_router(finance_router)
app.include_router(operations_router)
