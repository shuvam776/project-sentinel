import numpy as np


def serialize_embedding(embedding: np.ndarray) -> bytes:
    """Serializes a float32 numpy vector into bytes."""
    return embedding.astype(np.float32).tobytes()


def deserialize_embedding(data: bytes | None) -> np.ndarray | None:
    """Deserializes bytes into a float32 numpy vector."""
    if data is None:
        return None
    return np.frombuffer(data, dtype=np.float32)


def compute_cosine_similarity(
    query_vector: np.ndarray,
    target_vectors: np.ndarray,
) -> np.ndarray:
    """Computes cosine similarity between a single query vector and matrix of target vectors.

    Assumes vectors are already L2 normalized.
    If query_vector is (D,) and target_vectors is (N, D), returns (N,) array of cosine scores in [-1.0, 1.0].
    """
    if target_vectors.ndim == 1:
        target_vectors = target_vectors.reshape(1, -1)

    # Matrix-vector dot product: (N, D) @ (D,) -> (N,)
    scores = np.dot(target_vectors, query_vector)
    return scores
