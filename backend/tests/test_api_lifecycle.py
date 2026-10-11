from fastapi.testclient import TestClient
from pathlib import Path
import pytest
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.video import Video
from app.models.frame import Frame
from app.models.detection import Detection
from app.core.vector_store import serialize_embedding
import numpy as np


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["device"] in ("cuda", "cpu")
    assert "INFERENCE_ONLY" in data["training_mode"]
    assert data["detector_model"] == "fasterrcnn_resnet50_fpn_v2"
    assert "clip" in data["clip_model"].lower()


def test_coco_classes_endpoint(client):
    response = client.get("/api/v1/search/classes")
    assert response.status_code == 200
    classes = response.json()
    assert isinstance(classes, list)
    assert "person" in classes
    assert "car" in classes
    assert "backpack" in classes


def test_video_upload_and_stream_lifecycle(client):
    test_video_file = Path("data/test_sample.mp4")
    assert test_video_file.exists()

    # 1. Upload
    with open(test_video_file, "rb") as f:
        resp = client.post(
            "/api/v1/videos/upload",
            files={"file": ("test_sample.mp4", f, "video/mp4")},
            params={"sample_rate": 1.0},
        )
    assert resp.status_code == 201
    video_data = resp.json()
    video_id = video_data["id"]
    assert video_data["status"] in ("queued", "processing", "completed")

    # 2. Get status
    status_resp = client.get(f"/api/v1/videos/{video_id}/status")
    assert status_resp.status_code == 200
    assert "progress_percent" in status_resp.json()

    # 3. Stream range request (bytes=0-1024)
    stream_resp = client.get(
        f"/api/v1/videos/{video_id}/stream",
        headers={"Range": "bytes=0-1024"},
    )
    assert stream_resp.status_code == 206
    assert "Content-Range" in stream_resp.headers
    assert len(stream_resp.content) == 1025

    # 4. Delete video
    del_resp = client.delete(f"/api/v1/videos/{video_id}")
    assert del_resp.status_code == 204

    # 5. Verify deleted
    get_del = client.get(f"/api/v1/videos/{video_id}")
    assert get_del.status_code == 404
