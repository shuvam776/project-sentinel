from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.video import Video
from app.core.video_processor import VideoProcessor, VideoProcessorError

router = APIRouter(prefix="/clips", tags=["Clips"])


@router.get("/{video_id}")
def get_video_clip(
    video_id: str,
    request: Request,
    start: float = Query(..., ge=0.0, description="Clip start timestamp in seconds"),
    end: float = Query(..., ge=0.0, description="Clip end timestamp in seconds"),
    db: Session = Depends(get_db),
):
    """Generates on-demand or serves cached contextual subclip for a timestamp interval."""
    if end <= start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"End timestamp ({end}s) must be greater than start timestamp ({start}s)",
        )

    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    video_path = Path(video.storage_path)
    if not video_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source video missing on disk")

    # Safe boundaries
    safe_start = max(0.0, start)
    safe_end = min(video.duration_seconds or end, end)
    if safe_end <= safe_start:
        safe_end = min(video.duration_seconds or (safe_start + 1.0), safe_start + 1.0)

    # Unique clip cache filename
    start_tag = f"{int(safe_start*100):06d}"
    end_tag = f"{int(safe_end*100):06d}"
    clip_filename = f"{video_id}_{start_tag}_{end_tag}.mp4"
    clip_path = settings.CLIPS_DIR / clip_filename

    # Generate if not cached
    if not clip_path.exists():
        try:
            VideoProcessor.extract_subclip(
                video_path=video_path,
                output_clip_path=clip_path,
                start_seconds=safe_start,
                end_seconds=safe_end,
            )
        except VideoProcessorError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate clip: {str(e)}",
            )

    # Stream clip
    file_size = clip_path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        try:
            range_str = range_header.replace("bytes=", "").strip()
            parts = range_str.split("-")
            start_byte = int(parts[0]) if parts[0] else 0
            end_byte = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
            start_byte = max(0, start_byte)
            end_byte = min(file_size - 1, end_byte)
            content_length = (end_byte - start_byte) + 1
        except Exception:
            start_byte = 0
            end_byte = file_size - 1
            content_length = file_size

        def iter_clip():
            with open(clip_path, "rb") as f:
                f.seek(start_byte)
                bytes_left = content_length
                chunk_size = 512 * 1024
                while bytes_left > 0:
                    read_size = min(chunk_size, bytes_left)
                    data = f.read(read_size)
                    if not data:
                        break
                    bytes_left -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start_byte}-{end_byte}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": "video/mp4",
        }
        return StreamingResponse(iter_clip(), status_code=206, headers=headers)

    return FileResponse(
        str(clip_path),
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"},
    )


@router.get("/{video_id}/{clip_id}")
def get_video_clip_by_id(
    video_id: str,
    clip_id: str,
    request: Request,
    start: float = Query(0.0, ge=0.0, description="Clip start timestamp in seconds"),
    end: float = Query(10.0, ge=0.0, description="Clip end timestamp in seconds"),
    db: Session = Depends(get_db),
):
    """Serves a generated clip for a video by clip_id with optional start and end query bounds."""
    return get_video_clip(video_id=video_id, request=request, start=start, end=end, db=db)

