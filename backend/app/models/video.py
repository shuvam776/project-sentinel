from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Video(Base):
    __tablename__ = "videos"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(50), nullable=False, default="video/mp4")

    duration_seconds = Column(Float, nullable=True)
    fps = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    sample_rate = Column(Float, default=1.0)

    status = Column(String(30), default="queued", index=True)  # queued, processing, completed, failed
    progress_percent = Column(Integer, default=0)
    current_step = Column(String(100), default="Queued")
    error_message = Column(String(1000), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)

    # Cloudinary Cloud CDN storage
    cloudinary_url = Column(String(500), nullable=True)
    cloudinary_public_id = Column(String(200), nullable=True)
    cloudinary_thumbnail_url = Column(String(500), nullable=True)

    # User isolation (Google Firebase UID)
    user_id = Column(String(128), nullable=True, index=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Cascade delete so deleting a video cleans up all derived frames and detections
    frames = relationship("Frame", back_populates="video", cascade="all, delete-orphan", passive_deletes=True)
    detections = relationship("Detection", back_populates="video", cascade="all, delete-orphan", passive_deletes=True)
