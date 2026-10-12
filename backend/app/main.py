import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from sqlalchemy import text
from app.database import engine, Base
from app.routers import videos, search, clips, demo
import torch

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sentinel")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database tables, runs column migrations, and verifies device availability on startup."""
    logger.info(f"Initializing Sentinel Backend (Device: {settings.DEVICE})...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.warning(
            "Could not connect to database (%s). If using remote Supabase PostgreSQL, "
            "verify network connectivity to port 6543/5432.", e
        )

    # Safe migration: ensure new Cloudinary and user_id columns exist in existing SQLite databases
    if engine.dialect.name == "sqlite":
        try:
            with engine.connect() as conn:
                for col_name, col_type in [
                    ("cloudinary_url", "VARCHAR(500)"),
                    ("cloudinary_public_id", "VARCHAR(200)"),
                    ("cloudinary_thumbnail_url", "VARCHAR(500)"),
                    ("user_id", "VARCHAR(128)"),
                ]:
                    try:
                        conn.execute(text(f"ALTER TABLE videos ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception:
                        pass  # Column already exists
        except Exception:
            pass

    # Initialize Google Firebase Auth
    try:
        from app.core.auth import init_firebase
        init_firebase()
    except Exception as e:
        logger.warning("Firebase init warning: %s", e)
    yield
    logger.info("Sentinel Backend shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Sentinel AI-Powered Video Intelligence SaaS API",
    lifespan=lifespan,
)

# Enable CORS for Next.js web application (supports localhost and Vercel deployments)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api/v1
app.include_router(videos.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(clips.router, prefix=settings.API_V1_STR)
app.include_router(demo.router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
def health_check():
    """System health check and inference environment diagnostics."""
    cuda_available = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_available else "CPU"

    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "device": settings.DEVICE,
        "cuda_available": cuda_available,
        "device_name": device_name,
        "clip_model": settings.CLIP_MODEL_NAME,
        "detector_model": settings.DETECTOR_MODEL_NAME,
        "training_mode": "INFERENCE_ONLY (Zero Training / Zero Fine-Tuning)",
    }
