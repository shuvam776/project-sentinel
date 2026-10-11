from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import torch


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Sentinel Video Intelligence"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # Storage Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    FRAMES_DIR: Path = DATA_DIR / "frames"
    CLIPS_DIR: Path = DATA_DIR / "clips"
    THUMBNAILS_DIR: Path = DATA_DIR / "thumbnails"

    # Database
    DATABASE_URL: str = f"sqlite:///{(DATA_DIR / 'sentinel.db').as_posix()}"

    # Video Processing Parameters
    DEFAULT_SAMPLE_RATE: float = Field(default=1.0, description="Frames sampled per second of video")
    MAX_UPLOAD_SIZE_BYTES: int = 500 * 1024 * 1024  # 500 MB
    ALLOWED_EXTENSIONS: set[str] = {".mp4", ".mov", ".mkv", ".avi", ".webm"}

    # Machine Learning / Inference
    DEVICE_OVERRIDE: str | None = None  # Force "cuda" or "cpu" if set
    CLIP_MODEL_NAME: str = "openai/clip-vit-base-patch32"
    DETECTOR_MODEL_NAME: str = "fasterrcnn_resnet50_fpn_v2"
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.50
    SIMILARITY_THRESHOLD: float = 0.20  # Minimum cosine similarity for semantic candidate

    # Temporal Grouping
    TEMPORAL_GAP_SECONDS: float = 3.0
    CLIP_PADDING_SECONDS: float = 1.5

    # Cloudinary Cloud Storage Integration
    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None
    CLOUDINARY_ENABLED: bool = True

    # Supabase Cloud Integration
    SUPABASE_URL: str | None = None
    SUPABASE_KEY: str | None = None

    @property
    def DEVICE(self) -> str:
        if self.DEVICE_OVERRIDE:
            return self.DEVICE_OVERRIDE
        return "cuda" if torch.cuda.is_available() else "cpu"

    def ensure_directories(self) -> None:
        """Create necessary directories if they do not exist."""
        for directory in [self.DATA_DIR, self.UPLOAD_DIR, self.FRAMES_DIR, self.CLIPS_DIR, self.THUMBNAILS_DIR]:
            directory.mkdir(parents=True, exist_ok=True)

    model_config = SettingsConfigDict(
        env_prefix="SENTINEL_",
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
settings.ensure_directories()
