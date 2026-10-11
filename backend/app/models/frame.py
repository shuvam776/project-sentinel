from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Float, Integer, LargeBinary, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Frame(Base):
    __tablename__ = "frames"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    frame_index = Column(Integer, nullable=False)
    timestamp = Column(Float, nullable=False, index=True)
    image_path = Column(String(500), nullable=True)
    embedding = Column(LargeBinary, nullable=True)  # Serialized float32 numpy vector (512-dim)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    video = relationship("Video", back_populates="frames")
    detections = relationship("Detection", back_populates="frame", cascade="all, delete-orphan", passive_deletes=True)
