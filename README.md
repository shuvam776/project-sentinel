# Sentinel — AI-Powered Video Intelligence SaaS

Sentinel is an engineering-first video intelligence web application that ingests prerecorded video footage, executes real-time computer vision and natural language queries against sampled video frames, and retrieves ranked timestamps, object bounding boxes, and playable subclips.

---

## 1. System Architecture & Module Responsibilities

```
                       ┌───────────────────────────────────────────┐
                       │       Sentinel Frontend (Next.js 14)      │
                       │  - Obsidian Dark Surveillance UI         │
                       │  - Video Library & Upload Manager         │
                       │  - Natural Language Search Bar            │
                       │  - Interactive Timeline & Scrubber        │
                       │  - HTML5 Video Player + BBox Overlays     │
                       └─────────────────────┬─────────────────────┘
                                             │ REST API / HTTP 206 Streaming
                                             ▼
                       ┌───────────────────────────────────────────┐
                       │         Sentinel Backend (FastAPI)        │
                       │  - Video Ingestion & Format Validation    │
                       │  - HTTP 206 Range-Request Streaming Server │
                       │  - Background Pipeline Execution          │
                       │  - Semantic Embedding & Vector Search     │
                       │  - Temporal Non-Maximum Grouping          │
                       └───────┬───────────────────────────┬───────┘
                               │                           │
             ┌──────────────────▼──────┐             ┌──────▼──────────────────┐
             │ Video Processing Engine │             │ Persistence Layer       │
             │ - OpenCV Frame Sampler  │             │ - SQLite (Metadata)     │
             │ - FFmpeg Subclip Engine │             │ - Vector Store (NumPy/  │
             │ - Timestamp Preserver   │             │   SQLite-Blob / cosine) │
             └──────────┬──────────────┘             └─────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌──────────────────┐       ┌────────────────────┐
│ Pretrained COCO  │       │ Pretrained Vision- │
│ Object Detector  │       │ Language Embedding │
│ Faster R-CNN v2  │       │ OpenAI CLIP ViT    │
│ (BSD-3-Clause)   │       │ (MIT License)      │
└──────────────────┘       └────────────────────┘
```

### Module Responsibilities

- `app/main.py`: FastAPI server entry point, CORS middleware, lifespan initialization, and `/health` route.
- `app/config.py`: Application settings (`pydantic-settings`), directory creation, model selection, threshold defaults, and hardware device auto-detection (`cuda` vs `cpu`).
- `app/database.py`: SQLAlchemy database engine with SQLite WAL & `PRAGMA foreign_keys=ON` enforcement.
- `app/worker.py`: Idempotent background pipeline for frame sampling, pretrained neural inference, embedding serialization, and incremental DB persistence.
- `app/core/video_processor.py`: OpenCV video verification, metadata extraction, 1 FPS frame sampling, thumbnail rendering, and FFmpeg fast-seek subclip generation.
- `app/core/detector.py`: PyTorch torchvision `fasterrcnn_resnet50_fpn_v2` object detector (eval mode, zero fine-tuning, COCO 80 classes).
- `app/core/embedder.py`: Hugging Face `transformers` CLIP vision-language embedder (`openai/clip-vit-base-patch32`, L2 normalized 512-dim vectors).
- `app/core/vector_store.py`: Vector serialization/deserialization and NumPy matrix dot-product cosine similarity search engine.
- `app/core/temporal_grouper.py`: 1D temporal clustering, overlap merging, clip padding, and video boundary clamping.
- `app/routers/`: FastAPI REST endpoints for `/api/v1/videos`, `/api/v1/search`, and `/api/v1/clips`.

---

## 2. Strict Pretrained Inference Guarantees (ZERO Training)

> [!IMPORTANT]
> **ZERO Model Training / ZERO Fine-Tuning Guarantee:**
> - Sentinel uses existing, pretrained model weights **strictly for evaluation and inference (`model.eval()`, `torch.no_grad()`)**.
> - No local training jobs, gradient updates, or fine-tuning pipelines exist anywhere in this repository.
> - No randomly initialized weights are used.
> - No paid external cloud AI APIs are used for video indexing or search. All inference runs locally offline on CPU or CUDA GPU.

### Model Components & Permissive Licensing

| Component | Model & Source | Weights / Architecture | License | Commercial Viability |
| :--- | :--- | :--- | :--- | :--- |
| **Object Detector** | torchvision `fasterrcnn_resnet50_fpn_v2` | Pretrained COCO (80 classes) | **BSD-3-Clause** | **Permissive**: Free for commercial SaaS use without viral copyleft. |
| **Vision-Language Embedder** | OpenAI / Hugging Face `openai/clip-vit-base-patch32` | 512-dimensional multimodal embedding | **MIT License** | **Permissive**: Permitted for commercial SaaS products without restriction. |
| **Web API Engine** | FastAPI, Starlette, Pydantic | Python 3.12 | **MIT** | **Permissive** |
| **Video Processing** | OpenCV (`opencv-python-headless`), `imageio-ffmpeg` | Precompiled FFmpeg binaries | **Apache 2.0 / LGPL 2.1+** | **Permissive** |
| **Frontend UI** | Next.js 14, React 18, Tailwind CSS | TypeScript | **MIT** | **Permissive** |

---

## 3. Technical Limitations of Sampled-Frame Video Search

> [!WARNING]
> **Sampled-Frame Search Limitations & Non-Proof of Action:**
> 1. **Temporal Sampling Precision:** Sentinel samples frames at configurable intervals (default: $1.0\text{ fps}$, i.e., 1 frame per second). If an event begins, transpires, and ends entirely within a fraction of a second between sampled frames (e.g., an object dropped and caught in 400ms), that event will not be captured in sampled frames.
> 2. **Appearance vs. Motion Vectors:** Pretrained CLIP operates on individual still image frames. Queries describing motion (such as *"a person walking"* vs *"a person running"*) are scored on posture and visual cues rather than optical flow.
> 3. **Non-Proof of Action:** Search scores represent **cosine similarity between image and text embeddings**, not legal or factual proof that a complex real-world event (such as theft, vandalism, or an accident) occurred. Sentinel explicitly labels semantic scores as visual similarity indices rather than event probabilities.

---

## 4. Hardware, CPU & CUDA Execution

Sentinel automatically detects hardware acceleration:
- **CUDA GPU Mode:** If `torch.cuda.is_available()` evaluates to `True`, PyTorch model tensors are automatically placed on `cuda:0` for fast neural inference.
- **CPU Mode:** If CUDA is unavailable, models execute seamlessly on CPU without modification.
- **Device Override:** Set `SENTINEL_DEVICE_OVERRIDE="cpu"` or `SENTINEL_DEVICE_OVERRIDE="cuda"` in `.env` to explicitly force execution mode.

---

## 5. Setup and Startup Instructions

### Prerequisites
- **Python 3.12**
- **Node.js 18+** and `npm`

### Step 1: Environment Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment and install dependencies
python -m venv .venv
.venv\Scripts\activate  # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

### Step 2: Running Background Worker & API Server
```bash
# Start FastAPI backend development server
uvicorn app.main:app --reload --port 8000
```
*Background tasks run asynchronously within FastAPI background worker tasks using shared lazy singletons for model loading.*

---

## 6. Supported Video Formats & Limits

- **Allowed File Extensions:** `.mp4`, `.mov`, `.mkv`, `.avi`, `.webm`
- **Maximum File Size:** `500 MB` (Configurable via `SENTINEL_MAX_UPLOAD_SIZE_BYTES`)
- **Format Validation:** Uploaded videos are synchronously validated for frame readability and non-zero duration/FPS/dimensions before enqueueing. Corrupted or invalid media files are immediately rejected with HTTP `400 Bad Request`.

---

## 7. Automated Test Suite Execution & Results

Sentinel includes an automated unit and integration test suite covering:
1. Valid and invalid video uploads (format validation & error handling).
2. Video metadata extraction and readability checks.
3. Precise timestamp generation for videos at varying frame rates.
4. 1D temporal clustering, padding, and boundary clamping.
5. COCO object detector class label mapping and evaluation.
6. Pretrained Faster R-CNN v2 bounding box inference.
7. Pretrained CLIP image-text embedding cosine similarity ranking.
8. Empty search results and threshold filtering.
9. Database cascade deletion and artifact cleanup.
10. Background worker failure handling and error state recording.
11. API error handling (`400 Bad Request`, `404 Not Found`, `413 Payload Too Large`).
12. HTTP 206 Range-Request video streaming.

### Execution Command
```bash
backend/.venv/Scripts/pytest backend/tests -v
```

### Actual Test Results
```
============================= test session starts =============================
platform win32 -- Python 3.12.15, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\New folder\Desktop\aiml\dl\sentinel
collected 25 items

backend/tests/test_api_lifecycle.py::test_health_endpoint PASSED         [  4%]
backend/tests/test_api_lifecycle.py::test_coco_classes_endpoint PASSED   [  8%]
backend/tests/test_api_lifecycle.py::test_video_upload_and_stream_lifecycle PASSED [ 12%]
backend/tests/test_detector_mapping.py::test_coco_classes_mapping PASSED [ 16%]
backend/tests/test_detector_mapping.py::test_coco_valid_categories PASSED [ 20%]
backend/tests/test_inference_pipeline.py::test_embedder_inference PASSED [ 24%]
backend/tests/test_inference_pipeline.py::test_detector_inference PASSED [ 28%]
backend/tests/test_temporal_grouper.py::test_empty_frames PASSED         [ 32%]
backend/tests/test_temporal_grouper.py::test_single_frame_padding_and_bounds PASSED [ 36%]
backend/tests/test_temporal_grouper.py::test_boundary_zero_and_video_duration PASSED [ 40%]
backend/tests/test_temporal_grouper.py::test_grouping_within_gap_and_splitting_across_gap PASSED [ 44%]
backend/tests/test_temporal_grouper.py::test_merging_overlapping_segments PASSED [ 48%]
backend/tests/test_validation_and_errors.py::test_invalid_video_upload_rejection PASSED [ 52%]
backend/tests/test_validation_and_errors.py::test_unsupported_extension_rejection PASSED [ 56%]
backend/tests/test_validation_and_errors.py::test_search_uncompleted_video PASSED [ 60%]
backend/tests/test_validation_and_errors.py::test_empty_search_results PASSED [ 64%]
backend/tests/test_validation_and_errors.py::test_deletion_cascade_cleans_db_records PASSED [ 68%]
backend/tests/test_validation_and_errors.py::test_worker_failure_state PASSED [ 72%]
backend/tests/test_validation_and_errors.py::test_events_endpoint PASSED [ 76%]
backend/tests/test_vector_store.py::test_serialization_roundtrip PASSED  [ 80%]
backend/tests/test_vector_store.py::test_cosine_similarity_computation PASSED [ 84%]
backend/tests/test_video_processor.py::test_video_metadata PASSED        [ 88%]
backend/tests/test_video_processor.py::test_frame_sampling PASSED        [ 92%]
backend/tests/test_video_processor.py::test_thumbnail_generation PASSED  [ 96%]
backend/tests/test_video_processor.py::test_clip_extraction PASSED       [100%]

============================= 25 passed in 29.62s =============================
```

---

## 8. API Endpoint Reference

- `POST /api/v1/videos` or `POST /api/v1/videos/upload`: Ingest MP4 video and enqueue background indexing.
- `GET /api/v1/videos`: List all indexed videos with duration and status.
- `GET /api/v1/videos/{video_id}`: Retrieve video metadata and processing status.
- `GET /api/v1/videos/{video_id}/status`: Poll processing progress (0–100%).
- `GET /api/v1/videos/{video_id}/events`: Retrieve all indexed detections and temporally grouped event segments.
- `GET /api/v1/videos/{video_id}/stream`: Stream video with HTTP Range header support (`206 Partial Content`).
- `DELETE /api/v1/videos/{video_id}`: Cascade delete video, sampled frames, detections, thumbnails, and subclips.
- `POST /api/v1/search`: Query video using natural language with optional object class filters.
- `GET /api/v1/clips/{video_id}?start=X&end=Y`: Generate and stream on-demand contextual subclip.
- `GET /api/v1/clips/{video_id}/{clip_id}`: Stream clip by ID or start/end bounds.
- `GET /api/v1/search/classes`: List 80 verified COCO detector categories.
- `GET /health`: System diagnostics reporting hardware device (CUDA/CPU) and model status.

---

## 9. Data Storage & Cleanup Procedures

- `./data/uploads/`: Original uploaded video files.
- `./data/frames/`: Extracted preview frames per second.
- `./data/thumbnails/`: Representative video thumbnails.
- `./data/clips/`: Generated contextual subclips.
- `./data/sentinel.db`: SQLite database storing videos, frames, embeddings, and detections.

Calling `DELETE /api/v1/videos/{video_id}` purges all disk artifacts and database records associated with that video.
d → range streaming (HTTP 206) → cascade deletion

To run the complete test suite:
```bash
backend/.venv/Scripts/pytest backend/tests -v
```

---

## 8. API Reference

- `POST /api/v1/videos/upload`: Ingest MP4 video and enqueue background indexing.
- `GET /api/v1/videos`: List all indexed videos with duration and status.
- `GET /api/v1/videos/{id}/status`: Poll processing progress (0–100%).
- `GET /api/v1/videos/{id}/stream`: Stream video with HTTP Range header support (`206 Partial Content`).
- `DELETE /api/v1/videos/{id}`: Cascade delete video and all derived artifacts.
- `POST /api/v1/search`: Query video using natural language with optional object class filters.
- `GET /api/v1/clips/{id}?start=X&end=Y`: Generate and stream on-demand contextual subclip.
- `GET /api/v1/search/classes`: List 80 verified COCO detector categories.
- `GET /health`: Diagnostics reporting hardware device (CUDA/CPU) and model status.

#   p r o j e c t - s e n t i n e l  
 #   p r o j e c t - s e n t i n e l  
 