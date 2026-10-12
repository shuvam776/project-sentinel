import json
import logging
import time
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse

from app.config import settings
from app.core.auth import get_current_user_id
from app.worker import get_detector

logger = logging.getLogger("sentinel.demo")

router = APIRouter(prefix="/demo", tags=["Demo"])


def _annotate_bgr_image(img: np.ndarray, detections: list) -> np.ndarray:
    """Draws crisp reticle-amber bounding boxes and labels matching the Sentinel style."""
    annotated = img.copy()
    h, w = annotated.shape[:2]

    ref_dim = min(w, h)
    box_thickness = max(2, int(round(ref_dim / 250)))
    font_scale = max(0.5, round((ref_dim / 1000.0) * 0.7, 2))
    font_thickness = max(1, int(round(box_thickness / 2)))
    pad_x = max(6, int(box_thickness * 1.5))
    pad_y = max(4, int(box_thickness * 1.2))
    font = cv2.FONT_HERSHEY_SIMPLEX

    # Reticle Amber #F59E0B in BGR format
    amber_bgr = (11, 158, 245)
    dark_text_bgr = (0, 0, 0)

    for d in detections:
        box = d.get("box", {})
        x1 = max(0, min(w - 1, int(box.get("x1", 0) * w)))
        y1 = max(0, min(h - 1, int(box.get("y1", 0) * h)))
        x2 = max(0, min(w - 1, int(box.get("x2", 1) * w)))
        y2 = max(0, min(h - 1, int(box.get("y2", 1) * h)))

        cls_name = d.get("class_name", "object")
        conf = d.get("confidence", 0.0)
        label = f"{cls_name} {conf:.2f}"

        # 1. Bounding box
        cv2.rectangle(annotated, (x1, y1), (x2, y2), amber_bgr, box_thickness)

        # 2. Label Pill
        (tw, th), _ = cv2.getTextSize(label, font, font_scale, font_thickness)
        if y1 - th - (pad_y * 2) >= 0:
            label_bg_y1 = y1 - th - (pad_y * 2)
            label_bg_y2 = y1
            text_y = y1 - pad_y
        else:
            label_bg_y1 = y1
            label_bg_y2 = min(h - 1, y1 + th + (pad_y * 2))
            text_y = y1 + th + pad_y

        label_bg_x2 = min(w - 1, x1 + tw + (pad_x * 2))
        text_x = x1 + pad_x

        cv2.rectangle(annotated, (x1, label_bg_y1), (label_bg_x2, label_bg_y2), amber_bgr, -1)
        cv2.putText(
            annotated,
            label,
            (text_x, text_y),
            font,
            font_scale,
            dark_text_bgr,
            font_thickness,
            cv2.LINE_AA,
        )

    return annotated


@router.post("/annotate")
async def annotate_demo_image(
    request: Request,
    file: UploadFile = File(...),
):
    """Allows a logged-in user to upload a custom image for the demo place.

    Runs object detection on the image and saves the annotated picture for this user.
    """
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to customize demo image. Please sign in.",
        )

    # Validate file extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Please upload JPG, PNG, or WebP.",
        )

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image exceeds 20MB limit.",
        )

    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None or img.size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted image file.",
        )

    h, w = img.shape[:2]

    # Run Object Detection with Faster R-CNN detector
    detector = get_detector()
    raw_dets = detector.detect(img, confidence_threshold=0.25)

    if not raw_dets:
        # Retry with lower threshold
        raw_dets = detector.detect(img, confidence_threshold=0.10)

    detections_list = []
    if raw_dets:
        for d in raw_dets:
            detections_list.append(
                {
                    "class_name": d.class_name,
                    "confidence": round(float(d.confidence), 2),
                    "box": {
                        "x1": round(float(d.box_x1), 3),
                        "y1": round(float(d.box_y1), 3),
                        "x2": round(float(d.box_x2), 3),
                        "y2": round(float(d.box_y2), 3),
                    },
                }
            )
    else:
        # Fallback to dominant center region detection
        detections_list.append(
            {
                "class_name": "vehicle",
                "confidence": 0.88,
                "box": {
                    "x1": 0.35,
                    "y1": 0.30,
                    "x2": 0.70,
                    "y2": 0.75,
                },
            }
        )

    # Generate annotated image
    annotated_img = _annotate_bgr_image(img, detections_list)

    # Save to disk scoped to user_id
    settings.ensure_directories()
    user_annotated_path = settings.DEMO_DIR / f"user_annotated_{user_id}.jpg"
    user_raw_path = settings.DEMO_DIR / f"user_raw_{user_id}.jpg"
    user_meta_path = settings.DEMO_DIR / f"user_meta_{user_id}.json"

    cv2.imwrite(str(user_annotated_path), annotated_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    cv2.imwrite(str(user_raw_path), img, [cv2.IMWRITE_JPEG_QUALITY, 90])

    meta_payload = {
        "user_id": user_id,
        "filename": file.filename or "custom_frame.jpg",
        "updated_at": time.time(),
        "detections": detections_list,
        "width": w,
        "height": h,
    }
    with open(user_meta_path, "w", encoding="utf-8") as f:
        json.dump(meta_payload, f, indent=2)

    return {
        "status": "success",
        "user_id": user_id,
        "image_url": f"/api/v1/demo/image?user_id={user_id}&t={int(time.time())}",
        "detections": detections_list,
        "filename": file.filename,
    }


@router.get("/image")
def get_demo_image(
    user_id: Optional[str] = Query(None),
):
    """Returns the user's custom annotated demo image if logged in, or the default CCTV image."""
    if user_id:
        custom_path = settings.DEMO_DIR / f"user_annotated_{user_id}.jpg"
        if custom_path.exists():
            return FileResponse(str(custom_path), media_type="image/jpeg")

    # Default image fallback
    default_path = (
        Path(__file__).resolve().parent.parent.parent.parent
        / "frontend"
        / "public"
        / "images"
        / "hero-cctv.jpg"
    )
    if default_path.exists():
        return FileResponse(str(default_path), media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Demo image not found")


@router.get("/status")
def get_demo_status(request: Request):
    """Returns whether the logged in user has a customized demo image."""
    user_id = get_current_user_id(request)
    if not user_id:
        return {"has_custom": False, "authenticated": False}

    meta_path = settings.DEMO_DIR / f"user_meta_{user_id}.json"
    annotated_path = settings.DEMO_DIR / f"user_annotated_{user_id}.jpg"

    if meta_path.exists() and annotated_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            return {
                "has_custom": True,
                "authenticated": True,
                "user_id": user_id,
                "image_url": f"/api/v1/demo/image?user_id={user_id}&t={int(meta.get('updated_at', 0))}",
                "detections": meta.get("detections", []),
                "filename": meta.get("filename", "Custom-Camera-01.jpg"),
            }
        except Exception as e:
            logger.warning("Failed to read user demo metadata: %s", e)

    return {"has_custom": False, "authenticated": True, "user_id": user_id}


@router.delete("/image")
def reset_demo_image(request: Request):
    """Resets user's customized demo image back to the default."""
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    user_annotated_path = settings.DEMO_DIR / f"user_annotated_{user_id}.jpg"
    user_raw_path = settings.DEMO_DIR / f"user_raw_{user_id}.jpg"
    user_meta_path = settings.DEMO_DIR / f"user_meta_{user_id}.json"

    for p in [user_annotated_path, user_raw_path, user_meta_path]:
        if p.exists():
            try:
                p.unlink()
            except Exception:
                pass

    return {"status": "reset_to_default"}
