import pytest
from app.core.temporal_grouper import TemporalGrouper, FrameMatch, TemporalSegment


def test_empty_frames():
    grouper = TemporalGrouper()
    segments = grouper.group_frames([], video_duration=60.0)
    assert segments == []


def test_single_frame_padding_and_bounds():
    grouper = TemporalGrouper(temporal_gap=3.0, clip_padding=1.5, min_segment_duration=1.0)
    frames = [
        FrameMatch(timestamp=5.0, score=0.85, frame_index=5, detected_classes=["car"]),
    ]
    segments = grouper.group_frames(frames, video_duration=10.0)

    assert len(segments) == 1
    s = segments[0]
    assert s.start_time == 3.5  # 5.0 - 1.5
    assert s.end_time == 6.5    # 5.0 + 1.5
    assert s.best_score == 0.85
    assert s.best_timestamp == 5.0
    assert s.detected_classes == ["car"]


def test_boundary_zero_and_video_duration():
    grouper = TemporalGrouper(temporal_gap=3.0, clip_padding=2.0)
    # Frame right at the beginning
    frames_start = [FrameMatch(timestamp=0.5, score=0.9, frame_index=0)]
    seg_start = grouper.group_frames(frames_start, video_duration=10.0)[0]
    assert seg_start.start_time == 0.0  # max(0, 0.5 - 2.0)

    # Frame right at the end
    frames_end = [FrameMatch(timestamp=9.8, score=0.9, frame_index=9)]
    seg_end = grouper.group_frames(frames_end, video_duration=10.0)[0]
    assert seg_end.end_time == 10.0  # min(10.0, 9.8 + 2.0)


def test_grouping_within_gap_and_splitting_across_gap():
    grouper = TemporalGrouper(temporal_gap=2.0, clip_padding=1.0)
    frames = [
        # Cluster 1: timestamps 2.0, 3.0, 4.0 (diffs <= 2.0)
        FrameMatch(timestamp=2.0, score=0.60, frame_index=2, detected_classes=["person"]),
        FrameMatch(timestamp=3.0, score=0.85, frame_index=3, detected_classes=["backpack"]),
        FrameMatch(timestamp=4.0, score=0.70, frame_index=4, detected_classes=["person"]),
        # Gap: from 4.0 to 12.0 is 8.0s > 2.0s
        # Cluster 2: timestamp 12.0
        FrameMatch(timestamp=12.0, score=0.75, frame_index=12, detected_classes=["car"]),
    ]

    segments = grouper.group_frames(frames, video_duration=30.0)
    assert len(segments) == 2

    # Verify ranked by best_score descending
    assert segments[0].best_score == 0.85
    assert segments[0].best_timestamp == 3.0
    assert set(segments[0].detected_classes) == {"person", "backpack"}
    assert segments[0].start_time == 1.0  # 2.0 - 1.0
    assert segments[0].end_time == 5.0    # 4.0 + 1.0

    assert segments[1].best_score == 0.75
    assert segments[1].best_timestamp == 12.0
    assert segments[1].detected_classes == ["car"]
    assert segments[1].start_time == 11.0
    assert segments[1].end_time == 13.0


def test_merging_overlapping_segments():
    grouper = TemporalGrouper(temporal_gap=2.0, clip_padding=3.0)
    # Timestamps with gap > 2.0 so separate clusters, but large padding causes overlap
    frames = [
        FrameMatch(timestamp=2.0, score=0.70, frame_index=2, detected_classes=["person"]),
        FrameMatch(timestamp=5.0, score=0.90, frame_index=5, detected_classes=["dog"]),
    ]
    # Cluster 1: [2.0 - 3.0, 2.0 + 3.0] = [0.0, 5.0]
    # Cluster 2: [5.0 - 3.0, 5.0 + 3.0] = [2.0, 8.0]
    # These overlap and must be merged into [0.0, 8.0]
    segments = grouper.group_frames(frames, video_duration=20.0)
    assert len(segments) == 1
    assert segments[0].start_time == 0.0
    assert segments[0].end_time == 8.0
    assert segments[0].best_score == 0.90
    assert segments[0].best_timestamp == 5.0
    assert set(segments[0].detected_classes) == {"person", "dog"}

