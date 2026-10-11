from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class VideoBase(BaseModel):
    original_filename: str
    file_size_bytes: int
    mime_type: str = "video/mp4"


class VideoUpdateRequest(BaseModel):
    original_filename: str = Field(..., min_length=1, max_length=255, description="New video display filename")


class VideoStatusResponse(BaseModel):
    id: str
    status: str
    progress_percent: int
    current_step: str
    error_message: str | None = None


class VideoResponse(BaseModel):
    id: str
    original_filename: str
    file_size_bytes: int
    mime_type: str
    duration_seconds: float | None = None
    fps: float | None = None
    width: int | None = None
    height: int | None = None
    sample_rate: float
    status: str
    progress_percent: int
    current_step: str
    error_message: str | None = None
    thumbnail_url: str | None = None
    stream_url: str
    annotated_stream_url: str | None = None
    download_url: str | None = None
    annotated_download_url: str | None = None
    cloudinary_url: str | None = None
    cloudinary_public_id: str | None = None
    cloudinary_thumbnail_url: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VideoListResponse(BaseModel):
    videos: list[VideoResponse]
    total: int


class EventSegmentResponse(BaseModel):
    segment_id: str
    video_id: str
    start_time: float
    end_time: float
    duration: float
    best_timestamp: float
    best_score: float = 1.0
    thumbnail_url: str | None = None
    clip_url: str | None = None
    detected_objects: list[str] = []


class VideoEventsResponse(BaseModel):
    video_id: str
    total_detections: int
    total_events: int
    events: list[EventSegmentResponse] = []

