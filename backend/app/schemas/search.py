from pydantic import BaseModel, Field
from app.schemas.detection import DetectionResponse


class SearchRequest(BaseModel):
    video_id: str = Field(..., description="Target video to search")
    query: str = Field(..., min_length=1, description="Natural language search query")
    filter_classes: list[str] | None = Field(default=None, description="Optional COCO object classes to filter")
    min_score: float = Field(default=0.18, ge=0.0, le=1.0, description="Minimum cosine similarity threshold")
    temporal_gap: float = Field(default=3.0, ge=0.5, le=10.0, description="Temporal gap in seconds to group adjacent frames")
    clip_padding: float = Field(default=1.5, ge=0.0, le=5.0, description="Context padding around segment in seconds")


class SearchResultSegment(BaseModel):
    segment_id: str
    video_id: str
    start_time: float
    end_time: float
    duration: float
    best_timestamp: float
    best_score: float
    score_type: str = "cosine_similarity"
    score_interpretation: str = "Semantic visual similarity index (uncalibrated embedding cosine similarity; not an event probability)"
    thumbnail_url: str | None = None
    clip_url: str | None = None
    detected_objects: list[str] = []
    detections: list[DetectionResponse] = []


class SearchResponse(BaseModel):
    query: str
    video_id: str
    total_segments: int
    segments: list[SearchResultSegment]
    disclaimer: str = (
        "Semantic similarity reflects visual-textual embedding alignment and does not constitute "
        "forensic or definitive proof that an event occurred."
    )
