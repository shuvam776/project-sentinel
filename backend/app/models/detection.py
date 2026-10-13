from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Detection(Base):
    __tablename__ = "detections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    frame_id = Column(String(36), ForeignKey("frames.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(Float, nullable=False, index=True)

    class_name = Column(String(50), nullable=False, index=True)
    class_id = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)

    # Normalized bounding box coordinates [0.0, 1.0]
    box_x1 = Column(Float, nullable=False)
    box_y1 = Column(Float, nullable=False)
    box_x2 = Column(Float, nullable=False)
    box_y2 = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    video = relationship("Video", back_populates="detections")
    frame = relationship("Frame", back_populates="detections")
