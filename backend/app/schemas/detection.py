from pydantic import BaseModel, Field, ConfigDict


class BoundingBox(BaseModel):
    x1: float = Field(..., ge=0.0, le=1.0, description="Normalized left coordinate")
    y1: float = Field(..., ge=0.0, le=1.0, description="Normalized top coordinate")
    x2: float = Field(..., ge=0.0, le=1.0, description="Normalized right coordinate")
    y2: float = Field(..., ge=0.0, le=1.0, description="Normalized bottom coordinate")


class DetectionResponse(BaseModel):
    id: str
    video_id: str
    frame_id: str
    timestamp: float
    class_name: str
    class_id: int
    confidence: float
    box: BoundingBox

    model_config = ConfigDict(from_attributes=True)


class FrameDetectionsResponse(BaseModel):
    timestamp: float
    frame_index: int
    detections: list[DetectionResponse]
