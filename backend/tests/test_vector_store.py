import numpy as np
import pytest
from app.core.vector_store import serialize_embedding, deserialize_embedding, compute_cosine_similarity


def test_serialization_roundtrip():
    original = np.random.randn(512).astype(np.float32)
    # Normalize
    original = original / np.linalg.norm(original)

    raw_bytes = serialize_embedding(original)
    assert isinstance(raw_bytes, bytes)
    assert len(raw_bytes) == 512 * 4  # 512 float32 = 2048 bytes

    recovered = deserialize_embedding(raw_bytes)
    assert recovered is not None
    assert recovered.shape == (512,)
    assert recovered.dtype == np.float32
    np.testing.assert_allclose(original, recovered, rtol=1e-5)


def test_cosine_similarity_computation():
    # Unit vector along axis 0
    query = np.zeros(512, dtype=np.float32)
    query[0] = 1.0

    target1 = np.zeros(512, dtype=np.float32)
    target1[0] = 1.0  # Identical -> cosine = 1.0

    target2 = np.zeros(512, dtype=np.float32)
    target2[1] = 1.0  # Orthogonal -> cosine = 0.0

    target3 = np.zeros(512, dtype=np.float32)
    target3[0] = -1.0  # Opposite -> cosine = -1.0

    targets = np.vstack([target1, target2, target3])
    scores = compute_cosine_similarity(query, targets)

    assert len(scores) == 3
    assert pytest.approx(float(scores[0]), 1e-4) == 1.0
    assert pytest.approx(float(scores[1]), 1e-4) == 0.0
    assert pytest.approx(float(scores[2]), 1e-4) == -1.0

