import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
import numpy as np

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.video import Video
from app.models.frame import Frame
from app.models.detection import Detection
from app.core.video_processor import VideoProcessor, VideoProcessorError
from app.core.vector_store import serialize_embedding
from app.worker import process_video_pipeline


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


def test_invalid_video_upload_rejection(client):
    """Corrupt or non-video file upload must return 400 Bad Request and clean up file."""
    fake_content = b"This is not a video file context, just random text bytes."
    resp = client.post(
        "/api/v1/videos/upload",
        files={"file": ("corrupt.mp4", io.BytesIO(fake_content), "video/mp4")},
    )
    assert resp.status_code == 400
    assert "Invalid or corrupted video file" in resp.json()["detail"]


def test_unsupported_extension_rejection(client):
    """Unsupported extension must return 400 Bad Request."""
    resp = client.post(
        "/api/v1/videos/upload",
        files={"file": ("document.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    assert resp.status_code == 400
    assert "Unsupported format" in resp.json()["detail"]


def test_search_uncompleted_video(client):
    """Attempting search on a video that is queued/processing must return 400 Bad Request."""
    db = SessionLocal()
    video = Video(
        original_filename="pending.mp4",
        storage_path="data/uploads/pending.mp4",
        file_size_bytes=1000,
        status="processing",
    )
    db.add(video)
    db.commit()
    v_id = video.id
    db.close()

    try:
        resp = client.post(
            "/api/v1/search",
            json={"video_id": v_id, "query": "a car driving"},
        )
        assert resp.status_code == 400
        assert "processing status is 'processing'" in resp.json()["detail"]
    finally:
        db = SessionLocal()
        v = db.query(Video).filter(Video.id == v_id).first()
        if v:
            db.delete(v)
            db.commit()
        db.close()


def test_empty_search_results(client):
    """Search query with high min_score threshold or no matching frames returns 0 segments."""
    db = SessionLocal()
    video = Video(
        original_filename="completed.mp4",
        storage_path="data/uploads/completed.mp4",
        file_size_bytes=1000,
        status="completed",
        duration_seconds=5.0,
    )
    db.add(video)
    db.commit()
    v_id = video.id

    # Add dummy frame with normalized embedding
    rand_emb = np.random.randn(512).astype(np.float32)
    rand_emb = rand_emb / np.linalg.norm(rand_emb)
    frame = Frame(
        video_id=v_id,
        frame_index=0,
        timestamp=1.0,
        embedding=serialize_embedding(rand_emb),
    )
    db.add(frame)
    db.commit()
    db.close()

    try:
        resp = client.post(
            "/api/v1/search",
            json={"video_id": v_id, "query": "anything", "min_score": 0.99},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_segments"] == 0
        assert data["segments"] == []
    finally:
        db = SessionLocal()
        v = db.query(Video).filter(Video.id == v_id).first()
        if v:
            db.delete(v)
            db.commit()
        db.close()


def test_deletion_cascade_cleans_db_records(client):
    """Deleting a video purges its Video, Frame, and Detection DB records."""
    db = SessionLocal()
    video = Video(
        original_filename="cascade_test.mp4",
        storage_path="data/uploads/cascade_test.mp4",
        file_size_bytes=1000,
        status="completed",
    )
    db.add(video)
    db.commit()
    v_id = video.id

    frame = Frame(video_id=v_id, frame_index=0, timestamp=0.0)
    db.add(frame)
    db.commit()

    detection = Detection(
        video_id=v_id,
        frame_id=frame.id,
        timestamp=0.0,
        class_name="car",
        class_id=3,
        confidence=0.9,
        box_x1=0.1,
        box_y1=0.1,
        box_x2=0.5,
        box_y2=0.5,
    )
    db.add(detection)
    db.commit()
    db.close()

    # Call delete API
    resp = client.delete(f"/api/v1/videos/{v_id}")
    assert resp.status_code == 204

    # Verify DB records are completely purged
    db = SessionLocal()
    assert db.query(Video).filter(Video.id == v_id).first() is None
    assert db.query(Frame).filter(Frame.video_id == v_id).count() == 0
    assert db.query(Detection).filter(Detection.video_id == v_id).count() == 0
    db.close()


def test_worker_failure_state():
    """Worker processing a non-existent video file sets status='failed' and records error_message."""
    db = SessionLocal()
    video = Video(
        original_filename="missing.mp4",
        storage_path="data/uploads/missing_file_non_existent.mp4",
        file_size_bytes=1000,
        status="queued",
    )
    db.add(video)
    db.commit()
    v_id = video.id
    db.close()

    try:
        process_video_pipeline(v_id)

        db = SessionLocal()
        v = db.query(Video).filter(Video.id == v_id).first()
        assert v.status == "failed"
        assert v.error_message is not None
        assert "file missing" in v.error_message.lower()
    finally:
        db = SessionLocal()
        v = db.query(Video).filter(Video.id == v_id).first()
        if v:
            db.delete(v)
            db.commit()
        db.close()


def test_events_endpoint(client):
    """GET /api/v1/videos/{video_id}/events returns detections and grouped event segments."""
    db = SessionLocal()
    video = Video(
        original_filename="events_test.mp4",
        storage_path="data/uploads/events_test.mp4",
        file_size_bytes=1000,
        status="completed",
        duration_seconds=10.0,
    )
    db.add(video)
    db.commit()
    v_id = video.id

    frame = Frame(video_id=v_id, frame_index=0, timestamp=2.0)
    db.add(frame)
    db.commit()

    detection = Detection(
        video_id=v_id,
        frame_id=frame.id,
        timestamp=2.0,
        class_name="person",
        class_id=1,
        confidence=0.88,
        box_x1=0.1,
        box_y1=0.1,
        box_x2=0.4,
        box_y2=0.8,
    )
    db.add(detection)
    db.commit()
    db.close()

    try:
        resp = client.get(f"/api/v1/videos/{v_id}/events")
        assert resp.status_code == 200
        data = resp.json()
        assert data["video_id"] == v_id
        assert data["total_detections"] == 1
        assert data["total_events"] == 1
        assert len(data["events"]) == 1
        assert "person" in data["events"][0]["detected_objects"]
    finally:
        db = SessionLocal()
        v = db.query(Video).filter(Video.id == v_id).first()
        if v:
            db.delete(v)
            db.commit()
        db.close()
