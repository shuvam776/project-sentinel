import io
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_demo_unauthenticated_status():
    """Unauthenticated users receive has_custom = False."""
    res = client.get("/api/v1/demo/status")
    assert res.status_code == 200
    data = res.json()
    assert data["has_custom"] is False


def test_demo_unauthenticated_upload_rejected():
    """Unauthenticated users cannot upload custom demo images."""
    fake_img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", fake_img)
    files = {"file": ("test.jpg", io.BytesIO(buf), "image/jpeg")}

    res = client.post("/api/v1/demo/annotate", files=files)
    assert res.status_code == 401


def test_demo_authenticated_flow():
    """Authenticated user can upload custom demo image, get status, view image, and reset."""
    test_user = "test_user_demo_123"
    headers = {"X-User-ID": test_user}

    # Create dummy image
    test_img = np.zeros((200, 300, 3), dtype=np.uint8)
    test_img[50:150, 50:150] = (255, 255, 255)
    _, buf = cv2.imencode(".jpg", test_img)
    files = {"file": ("driveway_test.jpg", io.BytesIO(buf), "image/jpeg")}

    # 1. Upload & annotate
    res = client.post("/api/v1/demo/annotate", headers=headers, files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["user_id"] == test_user
    assert "image_url" in data
    assert len(data["detections"]) > 0

    # 2. Status should be has_custom = True
    res_status = client.get("/api/v1/demo/status", headers=headers)
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["has_custom"] is True
    assert status_data["user_id"] == test_user

    # 3. Retrieve image
    res_img = client.get(f"/api/v1/demo/image?user_id={test_user}")
    assert res_img.status_code == 200
    assert res_img.headers["content-type"] == "image/jpeg"

    # 4. Reset
    res_del = client.delete("/api/v1/demo/image", headers=headers)
    assert res_del.status_code == 200

    # 5. Status should be has_custom = False again
    res_status_after = client.get("/api/v1/demo/status", headers=headers)
    assert res_status_after.json()["has_custom"] is False
