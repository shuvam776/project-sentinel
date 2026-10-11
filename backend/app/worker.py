import logging
import uuid
from pathlib import Path
import cv2
from app.config import settings
from app.database import SessionLocal
from app.models.video import Video
from app.models.frame import Frame
from app.models.detection import Detection
from app.core.video_processor import VideoProcessor, VideoProcessorError
from app.core.detector import ObjectDetector
from app.core.embedder import VisionLanguageEmbedder
from app.core.vector_store import serialize_embedding
from app.core.cloudinary_service import cloudinary_service

logger = logging.getLogger("sentinel.worker")

# Shared lazy singletons for worker inference
_detector_instance: ObjectDetector | None = None
_embedder_instance: VisionLanguageEmbedder | None = None


def get_detector() -> ObjectDetector:
    global _detector_instance
    if _detector_instance is None:
        logger.info("Initializing Pretrained Object Detector (Faster R-CNN v2)...")
        _detector_instance = ObjectDetector()
    return _detector_instance


def get_embedder() -> VisionLanguageEmbedder:
    global _embedder_instance
    if _embedder_instance is None:
        logger.info("Initializing Pretrained CLIP Vision-Language Embedder...")
        _embedder_instance = VisionLanguageEmbedder()
    return _embedder_instance


def process_video_pipeline(video_id: str) -> None:
    """Complete asynchronous ingestion, sampling, detection, and embedding pipeline.

    Idempotent: Purges previous derived artifacts for this video_id before indexing.
    """
    db = SessionLocal()
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        logger.error(f"Video {video_id} not found in database.")
        db.close()
        return

    try:
        video_path = Path(video.storage_path)
        if not video_path.exists():
            raise VideoProcessorError(f"Video file missing on disk: {video_path}")

        # Step 1: Update status to processing
        video.status = "processing"
        video.progress_percent = 5
        video.current_step = "Extracting video metadata"
        db.commit()

        # Step 2: Extract metadata
        metadata = VideoProcessor.get_metadata(video_path)
        video.duration_seconds = metadata.duration_seconds
        video.fps = metadata.fps
        video.width = metadata.width
        video.height = metadata.height
        db.commit()

        # Step 3: Extract thumbnail
        thumbnail_filename = f"{video_id}_thumb.jpg"
        thumbnail_path = settings.THUMBNAILS_DIR / thumbnail_filename
        VideoProcessor.generate_thumbnail(video_path, thumbnail_path, target_time_seconds=min(1.0, metadata.duration_seconds / 2))
        video.thumbnail_path = str(thumbnail_path)
        video.progress_percent = 15
        video.current_step = "Syncing assets to Cloudinary CDN"
        db.commit()

        # Step 3b: Upload assets to Cloudinary CDN & save URLs in database
        if cloudinary_service.is_configured:
            try:
                thumb_res = cloudinary_service.upload_image(
                    thumbnail_path,
                    public_id=f"thumb_{video_id}",
                    folder="sentinel/thumbnails",
                )
                if thumb_res and "secure_url" in thumb_res:
                    video.cloudinary_thumbnail_url = thumb_res["secure_url"]
                    logger.info("Saved Cloudinary thumbnail URL: %s", video.cloudinary_thumbnail_url)

                vid_res = cloudinary_service.upload_video(
                    video_path,
                    public_id=f"video_{video_id}",
                )
                if vid_res and "secure_url" in vid_res:
                    video.cloudinary_url = vid_res["secure_url"]
                    video.cloudinary_public_id = vid_res.get("public_id")
                    logger.info("Saved Cloudinary video URL: %s (id: %s)", video.cloudinary_url, video.cloudinary_public_id)

                db.commit()
            except Exception as c_err:
                logger.warning("Cloudinary upload non-fatal warning: %s", c_err)
                db.commit()

        # Step 4: Idempotency cleanup (delete old frames and detections)
        db.query(Detection).filter(Detection.video_id == video_id).delete()
        db.query(Frame).filter(Frame.video_id == video_id).delete()
        db.commit()

        # Step 5: Load models once
        detector = get_detector()
        embedder = get_embedder()

        video.progress_percent = 25
        video.current_step = "Sampling frames & running neural inference"
        db.commit()

        # Step 6: Stream frames and perform incremental inference
        total_duration = max(1.0, metadata.duration_seconds)
        batch_size = 5
        accumulated_frames: list[Frame] = []
        accumulated_detections: list[Detection] = []

        for sample_idx, timestamp, frame_bgr in VideoProcessor.sample_frames(video_path, sample_rate=video.sample_rate):
            # Save frame thumbnail for rapid preview in timeline
            frame_img_name = f"{video_id}_f{sample_idx:05d}_{int(timestamp*100):06d}.jpg"
            frame_img_path = settings.FRAMES_DIR / frame_img_name

            # Resize frame for compact timeline preview (width 360px)
            fh, fw = frame_bgr.shape[:2]
            scale = 360.0 / max(fw, 1)
            preview_img = cv2.resize(frame_bgr, (int(fw * scale), int(fh * scale)), interpolation=cv2.INTER_AREA)
            cv2.imwrite(str(frame_img_path), preview_img, [cv2.IMWRITE_JPEG_QUALITY, 80])

            # Run Object Detection (COCO 80 classes)
            detections = detector.detect(
                frame_bgr,
                confidence_threshold=settings.DETECTION_CONFIDENCE_THRESHOLD,
            )

            # Run CLIP Image Embedding (512-dim L2 normalized)
            image_embedding = embedder.embed_image(frame_bgr)
            embedding_bytes = serialize_embedding(image_embedding)

            # Create Frame entity with explicit ID for FK reference
            frame_id = str(uuid.uuid4())
            frame_record = Frame(
                id=frame_id,
                video_id=video.id,
                frame_index=sample_idx,
                timestamp=timestamp,
                image_path=str(frame_img_path),
                embedding=embedding_bytes,
            )
            accumulated_frames.append(frame_record)

            # Create Detection entities linked to this frame
            for det in detections:
                detection_record = Detection(
                    video_id=video.id,
                    frame_id=frame_id,
                    timestamp=timestamp,
                    class_name=det.class_name,
                    class_id=det.class_id,
                    confidence=det.confidence,
                    box_x1=det.box_x1,
                    box_y1=det.box_y1,
                    box_x2=det.box_x2,
                    box_y2=det.box_y2,
                )
                accumulated_detections.append(detection_record)

            # Incremental persistence in batches
            if len(accumulated_frames) >= batch_size:
                db.add_all(accumulated_frames)
                db.add_all(accumulated_detections)
                accumulated_frames.clear()
                accumulated_detections.clear()

                # Progress percentage calculated from timestamp
                progress = int(25 + (timestamp / total_duration) * 70)
                video.progress_percent = min(95, progress)
                db.commit()

        # Flush any remaining frames/detections
        if accumulated_frames or accumulated_detections:
            db.add_all(accumulated_frames)
            db.add_all(accumulated_detections)
            db.commit()

        # Step 7: Completed
        video.status = "completed"
        video.progress_percent = 100
        video.current_step = "Indexed"
        video.error_message = None
        db.commit()
        logger.info(f"Successfully processed video {video_id} ({metadata.duration_seconds}s)")

    except Exception as e:
        logger.exception(f"Processing failed for video {video_id}: {e}")
        db.rollback()
        video.status = "failed"
        video.progress_percent = 0
        video.current_step = "Failed"
        video.error_message = str(e)
        db.commit()

    finally:
        db.close()
