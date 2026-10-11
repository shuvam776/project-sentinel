import os
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status, Query, Request
from fastapi.responses import FileResponse, Response, StreamingResponse, RedirectResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.video import Video
from app.models.frame import Frame
from app.models.detection import Detection
from app.schemas.video import VideoResponse, VideoStatusResponse, VideoListResponse, VideoEventsResponse, EventSegmentResponse
from app.core.video_processor import VideoProcessor, VideoProcessorError
from app.core.temporal_grouper import TemporalGrouper, FrameMatch
from app.core.cloudinary_service import cloudinary_service
from sqlalchemy import or_
from app.core.auth import get_current_user_id
from app.worker import process_video_pipeline

router = APIRouter(prefix="/videos", tags=["Videos"])


def _to_video_response(video: Video, request: Request) -> VideoResponse:
    base_url = str(request.base_url).rstrip("/")
    thumb_url = video.cloudinary_thumbnail_url or (f"{base_url}{settings.API_V1_STR}/videos/{video.id}/thumbnail" if video.thumbnail_path else None)
    stream_url = video.cloudinary_url or f"{base_url}{settings.API_V1_STR}/videos/{video.id}/stream"
    annotated_stream_url = f"{base_url}{settings.API_V1_STR}/videos/{video.id}/stream_annotated"
    download_url = video.cloudinary_url or f"{base_url}{settings.API_V1_STR}/videos/{video.id}/download"
    annotated_download_url = f"{base_url}{settings.API_V1_STR}/videos/{video.id}/download_annotated"

    return VideoResponse(
        id=video.id,
        original_filename=video.original_filename,
        file_size_bytes=video.file_size_bytes,
        mime_type=video.mime_type,
        duration_seconds=video.duration_seconds,
        fps=video.fps,
        width=video.width,
        height=video.height,
        sample_rate=video.sample_rate,
        status=video.status,
        progress_percent=video.progress_percent,
        current_step=video.current_step,
        error_message=video.error_message,
        thumbnail_url=thumb_url,
        stream_url=stream_url,
        annotated_stream_url=annotated_stream_url,
        download_url=download_url,
        annotated_download_url=annotated_download_url,
        cloudinary_url=video.cloudinary_url,
        cloudinary_public_id=video.cloudinary_public_id,
        cloudinary_thumbnail_url=video.cloudinary_thumbnail_url,
        created_at=video.created_at,
        updated_at=video.updated_at,
    )



@router.post("", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
@router.post("/upload", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    sample_rate: float = Query(default=1.0, ge=0.2, le=5.0, description="Frames to sample per second"),
    db: Session = Depends(get_db),
):
    """Uploads an MP4/compatible video file and enqueues background processing."""
    filename = file.filename or "video.mp4"
    ext = Path(filename).suffix.lower()

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Allowed: {sorted(list(settings.ALLOWED_EXTENSIONS))}",
        )

    video_id = str(uuid.uuid4())
    stored_filename = f"{video_id}{ext}"
    dest_path = settings.UPLOAD_DIR / stored_filename

    # Stream upload directly to disk while checking file size
    bytes_written = 0
    with open(dest_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            bytes_written += len(chunk)
            if bytes_written > settings.MAX_UPLOAD_SIZE_BYTES:
                buffer.close()
                if dest_path.exists():
                    dest_path.unlink()
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Video exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB",
                )
            buffer.write(chunk)

    # Validate video format and readability using OpenCV/VideoProcessor
    try:
        VideoProcessor.get_metadata(dest_path)
    except VideoProcessorError as err:
        if dest_path.exists():
            dest_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or corrupted video file: {str(err)}",
        )

    video = Video(
        id=video_id,
        user_id=get_current_user_id(request),
        original_filename=filename,
        storage_path=str(dest_path),
        file_size_bytes=bytes_written,
        mime_type=file.content_type or "video/mp4",
        sample_rate=sample_rate,
        status="queued",
        progress_percent=0,
        current_step="Queued for processing",
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    # Spawn asynchronous background processing pipeline
    background_tasks.add_task(process_video_pipeline, video_id)

    return _to_video_response(video, request)


@router.get("", response_model=VideoListResponse)
def list_videos(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Lists uploaded videos sorted by creation date."""
    user_id = get_current_user_id(request)
    base_query = db.query(Video)
    if user_id:
        base_query = base_query.filter(or_(Video.user_id == user_id, Video.user_id.is_(None)))

    total = base_query.count()
    videos = base_query.order_by(Video.created_at.desc()).offset(skip).limit(limit).all()
    return VideoListResponse(
        videos=[_to_video_response(v, request) for v in videos],
        total=total,
    )


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(
    video_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Retrieves metadata, processing status, and URLs for a specific video."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    return _to_video_response(video, request)


@router.get("/{video_id}/status", response_model=VideoStatusResponse)
def get_video_status(
    video_id: str,
    db: Session = Depends(get_db),
):
    """Retrieves current processing status and progress for polling."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    return VideoStatusResponse(
        id=video.id,
        status=video.status,
        progress_percent=video.progress_percent,
        current_step=video.current_step,
        error_message=video.error_message,
    )


@router.get("/{video_id}/thumbnail")
def get_video_thumbnail(
    video_id: str,
    db: Session = Depends(get_db),
):
    """Serves representative video thumbnail JPEG via Cloudinary CDN or local file fallback."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail not found")

    if video.cloudinary_thumbnail_url:
        return RedirectResponse(url=video.cloudinary_thumbnail_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    if not video.thumbnail_path or not Path(video.thumbnail_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail not found")
    return FileResponse(video.thumbnail_path, media_type="image/jpeg")


def _stream_file_range(file_path: Path, mime_type: str, request: Request) -> Response:
    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        try:
            range_str = range_header.replace("bytes=", "").strip()
            parts = range_str.split("-")
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
            start = max(0, start)
            end = min(file_size - 1, end)
            content_length = (end - start) + 1
        except Exception:
            start = 0
            end = file_size - 1
            content_length = file_size

        def iterfile():
            with open(file_path, "rb") as f:
                f.seek(start)
                bytes_left = content_length
                chunk_size = 1024 * 1024  # 1MB
                while bytes_left > 0:
                    read_size = min(chunk_size, bytes_left)
                    data = f.read(read_size)
                    if not data:
                        break
                    bytes_left -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": mime_type,
        }
        return StreamingResponse(iterfile(), status_code=206, headers=headers)

    return FileResponse(
        str(file_path),
        media_type=mime_type,
        headers={"Accept-Ranges": "bytes"},
    )


def _get_or_create_annotated_video(
    video: Video,
    db: Session,
    classes: str | None = None,
    force: bool = False,
) -> Path:
    video_path = Path(video.storage_path)
    if not video_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file missing on disk")

    selected_classes: list[str] = []
    if classes:
        selected_classes = [c.strip().lower() for c in classes.split(",") if c.strip()]

    if selected_classes:
        classes_slug = "_".join(sorted(selected_classes))
        annotated_filename = f"{video.id}_annotated_{classes_slug}.mp4"
    else:
        annotated_filename = f"{video.id}_annotated.mp4"

    annotated_path = settings.CLIPS_DIR / annotated_filename

    if force or not annotated_path.exists():
        query = db.query(Detection).filter(Detection.video_id == video.id)
        if selected_classes:
            query = query.filter(Detection.class_name.in_(selected_classes))
        detections = query.all()

        det_dicts = [
            {
                "timestamp": d.timestamp,
                "class_name": d.class_name,
                "confidence": d.confidence,
                "box": {
                    "x1": d.box_x1,
                    "y1": d.box_y1,
                    "x2": d.box_x2,
                    "y2": d.box_y2,
                },
            }
            for d in detections
        ]

        try:
            VideoProcessor.generate_annotated_video(
                video_path=video_path,
                output_path=annotated_path,
                detections=det_dicts,
                sample_rate=video.sample_rate or 1.0,
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate annotated video with detections: {str(e)}",
            )

    return annotated_path


@router.get("/{video_id}/stream")
def stream_video(
    video_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Streams original video with HTTP Range header support or redirects to Cloudinary CDN."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    video_path = Path(video.storage_path) if video.storage_path else None
    if not video_path or not video_path.exists():
        if video.cloudinary_url:
            return RedirectResponse(url=video.cloudinary_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file missing on disk")

    if video.cloudinary_url and not request.headers.get("range"):
        return RedirectResponse(url=video.cloudinary_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    return _stream_file_range(video_path, video.mime_type or "video/mp4", request)


@router.get("/{video_id}/stream_annotated")
def stream_annotated_video(
    video_id: str,
    request: Request,
    classes: str | None = Query(default=None, description="Comma-separated class names to filter annotations"),
    force: bool = Query(default=False, description="Force re-generation of annotated video"),
    db: Session = Depends(get_db),
):
    """Streams video with burned-in cyan bounding boxes, class labels, and confidence scores (HTTP 206 Partial Content)."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    annotated_path = _get_or_create_annotated_video(video, db, classes=classes, force=force)
    return _stream_file_range(annotated_path, "video/mp4", request)


@router.get("/{video_id}/download")
def download_video(
    video_id: str,
    db: Session = Depends(get_db),
):
    """Serves original video file with direct browser download via Cloudinary CDN or local file."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    if video.cloudinary_url:
        return RedirectResponse(url=video.cloudinary_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    video_path = Path(video.storage_path) if video.storage_path else None
    if not video_path or not video_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file missing on disk")

    return FileResponse(
        path=str(video_path),
        filename=video.original_filename,
        media_type=video.mime_type,
    )


@router.get("/{video_id}/download_annotated")
def download_annotated_video(
    video_id: str,
    classes: str | None = Query(default=None, description="Comma-separated class names to filter annotations"),
    force: bool = Query(default=False, description="Force re-generation of annotated video"),
    db: Session = Depends(get_db),
):
    """Generates (if needed) and serves video with burned-in cyan bounding boxes, class labels, and confidence scores for selected classes."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    annotated_path = _get_or_create_annotated_video(video, db, classes=classes, force=force)
    if classes:
        clean_slug = "_".join([c.strip() for c in classes.split(",") if c.strip()])
        out_name = f"annotated_{clean_slug}_{video.original_filename}"
    else:
        out_name = f"annotated_{video.original_filename}"

    return FileResponse(
        path=str(annotated_path),
        filename=out_name,
        media_type="video/mp4",
    )



@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(
    video_id: str,
    db: Session = Depends(get_db),
):
    """Deletes video, all extracted frames, detections, thumbnails, and clips."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    # 1. Remove Cloudinary resources if uploaded
    if video.cloudinary_public_id:
        try:
            cloudinary_service.delete_resource(video.cloudinary_public_id, resource_type="video")
        except Exception:
            pass
    try:
        cloudinary_service.delete_resource(f"sentinel/thumbnails/thumb_{video.id}", resource_type="image")
    except Exception:
        pass

    # 2. Remove files from disk
    try:
        if video.storage_path and Path(video.storage_path).exists():
            Path(video.storage_path).unlink()
        if video.thumbnail_path and Path(video.thumbnail_path).exists():
            Path(video.thumbnail_path).unlink()

        # Clean frame files for this video
        for f in settings.FRAMES_DIR.glob(f"{video_id}_*"):
            try:
                f.unlink()
            except OSError:
                pass

        # Clean clip files for this video
        for c in settings.CLIPS_DIR.glob(f"{video_id}_*"):
            try:
                c.unlink()
            except OSError:
                pass
    except Exception as e:
        # Continue with DB deletion even if file cleanup has warnings
        pass

    # 3. Database cascade delete
    db.query(Detection).filter(Detection.video_id == video_id).delete()
    db.query(Frame).filter(Frame.video_id == video_id).delete()
    db.delete(video)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{video_id}/reprocess", response_model=VideoStatusResponse)
def reprocess_video(
    video_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Re-enqueues processing for an existing video (idempotent)."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    video.status = "queued"
    video.progress_percent = 0
    video.current_step = "Re-queued for processing"
    video.error_message = None
    db.commit()

    background_tasks.add_task(process_video_pipeline, video_id)
    return VideoStatusResponse(
        id=video.id,
        status=video.status,
        progress_percent=video.progress_percent,
        current_step=video.current_step,
        error_message=video.error_message,
    )


@router.get("/{video_id}/events", response_model=VideoEventsResponse)
def get_video_events(
    video_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Retrieves all object detections and temporally grouped event segments for a video."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    detections = db.query(Detection).filter(Detection.video_id == video_id).order_by(Detection.timestamp.asc()).all()

    # Group detections by frame into FrameMatch items
    frame_matches_by_timestamp: dict[float, FrameMatch] = {}
    base_url = str(request.base_url).rstrip("/")

    for d in detections:
        t = d.timestamp
        if t not in frame_matches_by_timestamp:
            img_url = f"{base_url}{settings.API_V1_STR}/search/frames/{d.frame_id}/image" if d.frame_id else None
            frame_matches_by_timestamp[t] = FrameMatch(
                timestamp=t,
                score=1.0,
                frame_index=0,
                image_path=img_url,
                detected_classes=[d.class_name.lower()],
            )
        else:
            if d.class_name.lower() not in frame_matches_by_timestamp[t].detected_classes:
                frame_matches_by_timestamp[t].detected_classes.append(d.class_name.lower())

    grouper = TemporalGrouper(
        temporal_gap=settings.TEMPORAL_GAP_SECONDS,
        clip_padding=settings.CLIP_PADDING_SECONDS,
    )
    segments = grouper.group_frames(
        list(frame_matches_by_timestamp.values()),
        video_duration=video.duration_seconds or 0.0,
    )

    event_responses = []
    for s in segments:
        clip_url = f"{base_url}{settings.API_V1_STR}/clips/{video.id}?start={s.start_time}&end={s.end_time}"
        event_responses.append(
            EventSegmentResponse(
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
            )
        )

    return VideoEventsResponse(
        video_id=video.id,
        total_detections=len(detections),
        total_events=len(event_responses),
        events=event_responses,
    )

