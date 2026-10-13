from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
import numpy as np

from app.config import settings
from app.database import get_db
from app.models.video import Video
from app.models.frame import Frame
from app.models.detection import Detection
from app.schemas.search import SearchRequest, SearchResponse, SearchResultSegment
from app.schemas.detection import DetectionResponse, BoundingBox
from app.core.embedder import VisionLanguageEmbedder
from app.core.vector_store import deserialize_embedding, compute_cosine_similarity
from app.core.temporal_grouper import TemporalGrouper, FrameMatch
from app.core.detector import COCO_CLASSES_91
from app.worker import get_embedder

router = APIRouter(prefix="/search", tags=["Search & Intelligence"])


@router.post("", response_model=SearchResponse)
def search_video(
    request_data: SearchRequest,
    req: Request,
    db: Session = Depends(get_db),
):
    """Executes semantic natural-language search over sampled video frames.

    Optionally filters by confirmed COCO object detections.
    Ranks matching frames using cosine similarity and clusters them into temporal segments.
    """
    video = db.query(Video).filter(Video.id == request_data.video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    if video.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video processing status is '{video.status}'. Search is only available once indexing is 'completed'.",
        )

    # 1. Fetch all frames with embeddings for this video
    frames = db.query(Frame).filter(Frame.video_id == video.id).order_by(Frame.timestamp.asc()).all()
    if not frames:
        return SearchResponse(
            query=request_data.query,
            video_id=video.id,
            total_segments=0,
            segments=[],
        )

    # 2. Embed the text query using frozen pretrained CLIP
    embedder = get_embedder()
    query_vector = embedder.embed_text(request_data.query)

    # 3. Stack frame embeddings and compute cosine similarity
    valid_frames: list[Frame] = []
    vector_list: list[np.ndarray] = []

    for f in frames:
        vec = deserialize_embedding(f.embedding)
        if vec is not None and vec.shape[0] == 512:
            valid_frames.append(f)
            vector_list.append(vec)

    if not vector_list:
        return SearchResponse(
            query=request_data.query,
            video_id=video.id,
            total_segments=0,
            segments=[],
        )

    target_matrix = np.vstack(vector_list)  # (N, 512)
    scores = compute_cosine_similarity(query_vector, target_matrix)  # (N,)

    # 4. Fetch detections for this video to support class filtering and metadata enrichment
    all_detections = db.query(Detection).filter(Detection.video_id == video.id).all()
    detections_by_frame: dict[str, list[Detection]] = {}
    for d in all_detections:
        detections_by_frame.setdefault(d.frame_id, []).append(d)

    # 5. Filter frames by minimum score and optional class filter
    filter_classes_set = set(c.lower() for c in request_data.filter_classes) if request_data.filter_classes else None

    candidate_frame_matches: list[FrameMatch] = []
    base_url = str(req.base_url).rstrip("/")

    for i, frame in enumerate(valid_frames):
        score = float(scores[i])
        if score < request_data.min_score:
            continue

        frame_dets = detections_by_frame.get(frame.id, [])
        frame_classes = [d.class_name.lower() for d in frame_dets]

        # Apply class filter if specified
        if filter_classes_set is not None:
            if not any(fc in filter_classes_set for fc in frame_classes):
                continue

        # Format image preview URL (relative so client resolves to current origin)
        img_url = f"{settings.API_V1_STR}/search/frames/{frame.id}/image" if frame.image_path else None

        candidate_frame_matches.append(
            FrameMatch(
                timestamp=frame.timestamp,
                score=score,
                frame_index=frame.frame_index,
                image_path=img_url,
                detected_classes=frame_classes,
            )
        )

    # 6. Temporal Grouping into non-overlapping segments
    grouper = TemporalGrouper(
        temporal_gap=request_data.temporal_gap,
        clip_padding=request_data.clip_padding,
    )
    segments = grouper.group_frames(
        candidate_frame_matches,
        video_duration=video.duration_seconds or 0.0,
    )

    # 7. Convert to response schemas with associated bounding box detections
    result_segments: list[SearchResultSegment] = []
    for s in segments:
        # Find keyframe detections
        best_frame_dets: list[DetectionResponse] = []
        # Find frame closest to best_timestamp
        closest_frame = min(valid_frames, key=lambda f: abs(f.timestamp - s.best_timestamp), default=None)
        if closest_frame:
            frame_dets = detections_by_frame.get(closest_frame.id, [])
            for d in frame_dets:
                best_frame_dets.append(
                    DetectionResponse(
                        id=d.id,
                        video_id=d.video_id,
                        frame_id=d.frame_id,
                        timestamp=d.timestamp,
                        class_name=d.class_name,
                        class_id=d.class_id,
                        confidence=d.confidence,
                        box=BoundingBox(
                            x1=d.box_x1,
                            y1=d.box_y1,
                            x2=d.box_x2,
                            y2=d.box_y2,
                        ),
                    )
                )

        clip_url = f"{settings.API_V1_STR}/clips/{video.id}?start={s.start_time}&end={s.end_time}"

        result_segments.append(
            SearchResultSegment(
                segment_id=s.segment_id,
                video_id=video.id,
                start_time=s.start_time,
                end_time=s.end_time,
                duration=s.duration,
                best_timestamp=s.best_timestamp,
                best_score=s.best_score,
                thumbnail_url=s.image_path,
                clip_url=clip_url,
                detected_objects=s.detected_classes,
                detections=best_frame_dets,
            )
        )

    return SearchResponse(
        query=request_data.query,
        video_id=video.id,
        total_segments=len(result_segments),
        segments=result_segments,
    )


@router.get("/frames/{frame_id}/image")
def get_frame_image(
    frame_id: str,
    db: Session = Depends(get_db),
):
    """Serves the sampled frame preview JPEG."""
    frame = db.query(Frame).filter(Frame.id == frame_id).first()
    if not frame or not frame.image_path or not Path(frame.image_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frame image not found")
    return FileResponse(frame.image_path, media_type="image/jpeg")


@router.get("/detections/{video_id}", response_model=list[DetectionResponse])
def get_video_detections(
    video_id: str,
    class_name: str | None = Query(None, description="Filter by class name"),
    min_confidence: float = Query(0.40, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    """Retrieves all detections for a video with optional class and confidence filters."""
    query = db.query(Detection).filter(Detection.video_id == video_id, Detection.confidence >= min_confidence)
    if class_name:
        query = query.filter(Detection.class_name.ilike(class_name))

    detections = query.order_by(Detection.timestamp.asc()).all()
    return [
        DetectionResponse(
            id=d.id,
            video_id=d.video_id,
            frame_id=d.frame_id,
            timestamp=d.timestamp,
            class_name=d.class_name,
            class_id=d.class_id,
            confidence=d.confidence,
            box=BoundingBox(
                x1=d.box_x1,
                y1=d.box_y1,
                x2=d.box_x2,
                y2=d.box_y2,
            ),
        )
        for d in detections
    ]


@router.get("/classes", response_model=list[str])
def get_supported_classes():
    """Returns the list of verified COCO detector classes."""
    classes = [c for c in COCO_CLASSES_91 if c not in ("__background__", "N/A")]
    return sorted(list(set(classes)))
