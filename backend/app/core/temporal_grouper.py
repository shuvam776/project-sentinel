from dataclasses import dataclass, field
import uuid


@dataclass
class FrameMatch:
    timestamp: float
    score: float
    frame_index: int
    image_path: str | None = None
    detected_classes: list[str] = field(default_factory=list)


@dataclass
class TemporalSegment:
    segment_id: str
    start_time: float
    end_time: float
    duration: float
    best_timestamp: float
    best_score: float
    frame_count: int
    image_path: str | None = None
    detected_classes: list[str] = field(default_factory=list)


class TemporalGrouper:
    """Groups candidate matching frames into coherent temporal segments."""

    def __init__(
        self,
        temporal_gap: float = 3.0,
        clip_padding: float = 1.5,
        min_segment_duration: float = 1.0,
    ):
        self.temporal_gap = temporal_gap
        self.clip_padding = clip_padding
        self.min_segment_duration = min_segment_duration

    def group_frames(
        self,
        frames: list[FrameMatch],
        video_duration: float,
    ) -> list[TemporalSegment]:
        """Groups candidate frames into temporal segments, bounded by video_duration.

        Args:
            frames: List of matching frames with timestamps and scores.
            video_duration: Total video duration in seconds.

        Returns:
            Ranked list of non-overlapping temporal segments.
        """
        if not frames:
            return []

        # 1. Sort strictly by timestamp
        sorted_frames = sorted(frames, key=lambda f: f.timestamp)

        # 2. Cluster frames within temporal_gap
        clusters: list[list[FrameMatch]] = []
        current_cluster: list[FrameMatch] = [sorted_frames[0]]

        for f in sorted_frames[1:]:
            prev_timestamp = current_cluster[-1].timestamp
            if f.timestamp - prev_timestamp <= self.temporal_gap:
                current_cluster.append(f)
            else:
                clusters.append(current_cluster)
                current_cluster = [f]

        if current_cluster:
            clusters.append(current_cluster)

        # 3. Create raw segments with padding and safe bounds
        raw_segments: list[TemporalSegment] = []
        for cluster in clusters:
            min_t = min(f.timestamp for f in cluster)
            max_t = max(f.timestamp for f in cluster)

            # Apply safe clip padding, bounded by 0.0 and video_duration
            start_time = max(0.0, round(min_t - self.clip_padding, 2))
            end_time = min(video_duration, round(max_t + self.clip_padding, 2))

            # Ensure minimum duration if video is long enough
            if end_time - start_time < self.min_segment_duration:
                end_time = min(video_duration, round(start_time + self.min_segment_duration, 2))

            # Select frame with highest similarity score as the segment keyframe
            best_frame = max(cluster, key=lambda f: f.score)

            # Aggregate detected classes across the cluster
            all_classes: set[str] = set()
            for f in cluster:
                all_classes.update(f.detected_classes)

            raw_segments.append(
                TemporalSegment(
                    segment_id=str(uuid.uuid4())[:8],
                    start_time=start_time,
                    end_time=end_time,
                    duration=round(end_time - start_time, 2),
                    best_timestamp=best_frame.timestamp,
                    best_score=round(best_frame.score, 4),
                    frame_count=len(cluster),
                    image_path=best_frame.image_path,
                    detected_classes=sorted(list(all_classes)),
                )
            )

        # 4. Merge overlapping segments
        merged_segments = self._merge_overlapping(raw_segments, video_duration)

        # 5. Sort segments descending by best_score
        merged_segments.sort(key=lambda s: s.best_score, reverse=True)

        return merged_segments

    def _merge_overlapping(
        self,
        segments: list[TemporalSegment],
        video_duration: float,
    ) -> list[TemporalSegment]:
        """Merges segments whose temporal boundaries overlap."""
        if not segments:
            return []

        # Sort by start_time
        segments_by_start = sorted(segments, key=lambda s: s.start_time)
        merged: list[TemporalSegment] = [segments_by_start[0]]

        for current in segments_by_start[1:]:
            prev = merged[-1]
            if current.start_time <= prev.end_time:
                # Overlap detected: extend end_time and combine metadata
                new_end = min(video_duration, max(prev.end_time, current.end_time))
                prev.end_time = round(new_end, 2)
                prev.duration = round(prev.end_time - prev.start_time, 2)
                prev.frame_count += current.frame_count

                # Update best score and timestamp if current is higher
                if current.best_score > prev.best_score:
                    prev.best_score = current.best_score
                    prev.best_timestamp = current.best_timestamp
                    prev.image_path = current.image_path

                # Union detected classes
                combined_classes = set(prev.detected_classes).union(current.detected_classes)
                prev.detected_classes = sorted(list(combined_classes))
            else:
                merged.append(current)

        return merged
