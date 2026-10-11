from pathlib import Path
import pytest
from app.core.video_processor import VideoProcessor, VideoProcessorError


def test_video_metadata():
    video_path = Path("data/test_sample.mp4")
    assert video_path.exists()

    meta = VideoProcessor.get_metadata(video_path)
    assert meta.duration_seconds == pytest.approx(6.0, 0.5)
    assert meta.fps == 10.0
    assert meta.width == 480
    assert meta.height == 270
    assert meta.total_frames == 60


def test_frame_sampling():
    video_path = Path("data/test_sample.mp4")
    # Sample at 1.0 fps
    samples = list(VideoProcessor.sample_frames(video_path, sample_rate=1.0))
    # In 6 seconds at 1 fps, expected ~6 samples
    assert len(samples) >= 5
    first_idx, first_t, first_frame = samples[0]
    assert first_idx == 0
    assert first_t == 0.0
    assert first_frame.shape == (270, 480, 3)

    # Check that timestamps strictly increase
    timestamps = [s[1] for s in samples]
    assert timestamps == sorted(timestamps)


def test_thumbnail_generation(tmp_path):
    video_path = Path("data/test_sample.mp4")
    thumb_path = tmp_path / "thumb.jpg"
    res = VideoProcessor.generate_thumbnail(video_path, thumb_path, target_time_seconds=1.0)
    assert Path(res).exists()
    assert Path(res).stat().st_size > 0


def test_clip_extraction(tmp_path):
    video_path = Path("data/test_sample.mp4")
    clip_path = tmp_path / "clip.mp4"
    res = VideoProcessor.extract_subclip(video_path, clip_path, start_seconds=1.0, end_seconds=3.0)
    assert Path(res).exists()
    assert Path(res).stat().st_size > 0
    # Verify extracted clip is valid
    clip_meta = VideoProcessor.get_metadata(clip_path)
    assert clip_meta.duration_seconds > 1.0

