import os
from pathlib import Path
import pytest

# Guarantee tests run against isolated, ultra-fast local SQLite database
test_db_path = Path(__file__).resolve().parent.parent / "data" / "test_sentinel.db"
test_db_path.parent.mkdir(parents=True, exist_ok=True)
os.environ["SENTINEL_DATABASE_URL"] = f"sqlite:///{test_db_path.as_posix()}"
os.environ["SENTINEL_CLOUDINARY_ENABLED"] = "false"

from tests.create_sample_video import generate_test_video

@pytest.fixture(scope="session", autouse=True)
def ensure_test_assets():
    test_video = Path("data/test_sample.mp4")
    if not test_video.exists():
        generate_test_video(test_video)
    yield
