import cv2
import numpy as np
import pytest
from app.core.detector import ObjectDetector
from app.core.embedder import VisionLanguageEmbedder
from app.core.vector_store import compute_cosine_similarity


@pytest.fixture(scope="module")
def sample_frames():
    cap = cv2.VideoCapture("data/test_sample.mp4")
    assert cap.isOpened(), "Could not open test_sample.mp4"

    # Frame at t=1.0s (car)
    cap.set(cv2.CAP_PROP_POS_FRAMES, 10)
    ret1, car_frame = cap.read()

    # Frame at t=4.5s (person)
    cap.set(cv2.CAP_PROP_POS_FRAMES, 45)
    ret2, person_frame = cap.read()

    cap.release()
    assert ret1 and car_frame is not None
    assert ret2 and person_frame is not None
    return car_frame, person_frame


def test_embedder_inference(sample_frames):
    car_frame, person_frame = sample_frames

    embedder = VisionLanguageEmbedder()

    # Embed frames
    car_emb = embedder.embed_image(car_frame)
    person_emb = embedder.embed_image(person_frame)

    assert car_emb.shape == (512,)
    assert person_emb.shape == (512,)
    # Verify L2 normalization
    assert pytest.approx(float(np.linalg.norm(car_emb)), 1e-4) == 1.0
    assert pytest.approx(float(np.linalg.norm(person_emb)), 1e-4) == 1.0

    # Embed text queries
    query_car = embedder.embed_text("A red car driving on a road")
    query_person = embedder.embed_text("A person walking")

    assert query_car.shape == (512,)
    assert query_person.shape == (512,)
    assert pytest.approx(float(np.linalg.norm(query_car)), 1e-4) == 1.0
    assert pytest.approx(float(np.linalg.norm(query_person)), 1e-4) == 1.0

    # Test cosine similarity
    score_car_on_car = float(compute_cosine_similarity(query_car, car_emb)[0])
    score_car_on_person = float(compute_cosine_similarity(query_car, person_emb)[0])

    print(f"Query 'car' -> car frame: {score_car_on_car:.4f}, person frame: {score_car_on_person:.4f}")
    assert score_car_on_car > score_car_on_person, "Car query should rank car frame higher than person frame"


def test_detector_inference(sample_frames):
    car_frame, person_frame = sample_frames

    detector = ObjectDetector()
    # Detection on frames with confidence >= 0.1 to inspect candidate proposals
    dets_car = detector.detect(car_frame, confidence_threshold=0.2)
    dets_person = detector.detect(person_frame, confidence_threshold=0.2)

    assert isinstance(dets_car, list)
    assert isinstance(dets_person, list)
    for d in dets_car + dets_person:
        assert 0.0 <= d.box_x1 <= 1.0
        assert 0.0 <= d.box_y1 <= 1.0
        assert 0.0 <= d.box_x2 <= 1.0
        assert 0.0 <= d.box_y2 <= 1.0
        assert 0.0 <= d.confidence <= 1.0
        assert isinstance(d.class_name, str)

