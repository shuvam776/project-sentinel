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
from app.core.auth import get_current_user_id
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
    Ranks matching frames using cosine similarity with class-frequency density weighting,
    and clusters them into temporal segments. Supports searching single video or entire library.
    """
    user_id = get_current_user_id(req)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to search video footage.",
        )

    # 1. Determine target video scope
    if request_data.video_id and request_data.video_id.strip() and request_data.video_id.lower() != "all":
        video = db.query(Video).filter(Video.id == request_data.video_id.strip()).first()
        if not video:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
        if video.user_id and video.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. This video is private to another account.",
            )
        if video.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video processing status is '{video.status}'. Search is only available once indexing is 'completed'.",
            )
        target_videos = [video]
    else:
        target_videos = db.query(Video).filter(Video.status == "completed", Video.user_id == user_id).all()

    if not target_videos:
        return SearchResponse(
            query=request_data.query,
            video_id=request_data.video_id or "all",
            total_segments=0,
            segments=[],
        )

    # 2. Embed the text query using frozen pretrained CLIP
    embedder = get_embedder()
    query_vector = embedder.embed_text(request_data.query)

    filter_classes_set = set(c.lower() for c in request_data.filter_classes) if request_data.filter_classes else None
    query_lower = request_data.query.lower()

    all_result_segments: list[SearchResultSegment] = []

    for video in target_videos:
        # Fetch all frames with embeddings for this video
        frames = db.query(Frame).filter(Frame.video_id == video.id).order_by(Frame.timestamp.asc()).all()
        if not frames:
            continue

        # Stack frame embeddings and compute cosine similarity
        valid_frames: list[Frame] = []
        vector_list: list[np.ndarray] = []

        for f in frames:
            vec = deserialize_embedding(f.embedding)
            if vec is not None and vec.shape[0] == 512:
                valid_frames.append(f)
                vector_list.append(vec)

        if not vector_list:
            continue

        target_matrix = np.vstack(vector_list)  # (N, 512)
        scores = compute_cosine_similarity(query_vector, target_matrix)  # (N,)

        # Fetch detections for this video
        all_detections = db.query(Detection).filter(Detection.video_id == video.id).all()
        detections_by_frame: dict[str, list[Detection]] = {}
        for d in all_detections:
            detections_by_frame.setdefault(d.frame_id, []).append(d)

        candidate_frame_matches: list[FrameMatch] = []

        for i, frame in enumerate(valid_frames):
            base_score = float(scores[i])
            frame_dets = detections_by_frame.get(frame.id, [])
            frame_classes = [d.class_name.lower() for d in frame_dets]

            # Apply class filter if specified
            if filter_classes_set is not None:
                if not any(fc in filter_classes_set for fc in frame_classes):
                    continue

            # Count relevant detections matching filter classes or query words
            matching_dets = [
                d for d in frame_dets
                if (filter_classes_set and d.class_name.lower() in filter_classes_set)
                or (d.class_name.lower() in query_lower)
            ]
            match_count = len(matching_dets)

            # Frequency density boost: frames with MORE detections of the target class get prioritized
            if match_count > 0:
                boost = 1.0 + min(0.40, 0.10 * match_count)
                score = base_score * boost
            else:
                score = base_score

            if score < request_data.min_score:
                continue

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

        if not candidate_frame_matches:
            continue

        # Temporal Grouping into non-overlapping segments
        grouper = TemporalGrouper(
            temporal_gap=request_data.temporal_gap,
            clip_padding=request_data.clip_padding,
        )
        segments = grouper.group_frames(
            candidate_frame_matches,
            video_duration=video.duration_seconds or 0.0,
        )

        for s in segments:
            # Find keyframe detections
            best_frame_dets: list[DetectionResponse] = []
            closest_frame = min(valid_frames, key=lambda f: abs(f.timestamp - s.best_timestamp), default=None)
            seg_match_count = 0

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
                    if (filter_classes_set and d.class_name.lower() in filter_classes_set) or (d.class_name.lower() in query_lower):
                        seg_match_count += 1

            clip_url = f"{settings.API_V1_STR}/clips/{video.id}?start={s.start_time}&end={s.end_time}"

            all_result_segments.append(
                SearchResultSegment(
                    segment_id=s.segment_id,
                    video_id=video.id,
                    video_name=video.original_filename,
                    start_time=s.start_time,
                    end_time=s.end_time,
                    duration=s.duration,
                    best_timestamp=s.best_timestamp,
                    best_score=round(s.best_score, 4),
                    thumbnail_url=s.image_path,
                    clip_url=clip_url,
                    detected_objects=s.detected_classes,
                    detections=best_frame_dets,
                    class_match_count=seg_match_count,
                )
            )

    # Sort results: prioritize segments with higher class match density first, then highest score
    all_result_segments.sort(
        key=lambda s: (s.class_match_count, s.best_score),
        reverse=True,
    )

    return SearchResponse(
        query=request_data.query,
        video_id=request_data.video_id or "all",
        total_segments=len(all_result_segments),
        segments=all_result_segments,
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
    request: Request,
    class_name: str | None = Query(None, description="Filter by class name"),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    """Retrieves all detections for a video with optional class and confidence filters."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    user_id = get_current_user_id(request)
    if video.user_id and (not user_id or video.user_id != user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. This video is private to another account.",
        )

    query = db.query(Detection).filter(Detection.video_id == video_id)

    if min_confidence > 0.0:
        query = query.filter(Detection.confidence >= min_confidence)
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
