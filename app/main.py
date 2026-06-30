import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db.database import init_db
from app.routes import activities, sync, races

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=(
        "Query and visualize your Garmin running activities. "
        "Use POST /api/v1/sync to pull data from Garmin Connect, "
        "then explore via the /api/v1/activities endpoints."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logging.getLogger(__name__).exception("Unhandled exception on %s", request.url)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


app.include_router(activities.router, prefix="/api/v1")
app.include_router(sync.router, prefix="/api/v1")
app.include_router(races.router, prefix="/api/v1")


@app.get("/health", tags=["health"], summary="Health check")
async def health():
    return {"status": "healthy", "version": settings.api_version}
