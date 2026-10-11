import subprocess
from pathlib import Path
from typing import Generator
import cv2
import imageio_ffmpeg
from app.config import settings


class VideoProcessorError(Exception):
    """Raised when video processing fails."""
    pass


class VideoMetadata:
    def __init__(
        self,
        duration_seconds: float,
        fps: float,
        width: int,
        height: int,
        total_frames: int,
    ):
        self.duration_seconds = duration_seconds
        self.fps = fps
        self.width = width
        self.height = height
        self.total_frames = total_frames


class VideoProcessor:
    """Handles video validation, metadata extraction, frame sampling, and clip generation."""

    @staticmethod
    def get_ffmpeg_path() -> str:
        """Returns the absolute path to the bundled FFmpeg binary."""
        return imageio_ffmpeg.get_ffmpeg_exe()

    @classmethod
    def get_metadata(cls, video_path: str | Path) -> VideoMetadata:
        """Extracts duration, FPS, and dimensions using OpenCV and verifies readability."""
        path_str = str(video_path)
        cap = cv2.VideoCapture(path_str)
        if not cap.isOpened():
            raise VideoProcessorError(f"Could not open video file: {video_path}")

        try:
            fps = float(cap.get(cv2.CAP_PROP_FPS))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            if fps <= 0 or total_frames <= 0 or width <= 0 or height <= 0:
                raise VideoProcessorError(
                    f"Invalid video metadata: fps={fps}, frames={total_frames}, {width}x{height}"
                )

            ret, frame = cap.read()
            if not ret or frame is None:
                raise VideoProcessorError(f"Video file appears corrupt or unreadable: {video_path}")

            duration_seconds = round(total_frames / fps, 2)
            return VideoMetadata(
                duration_seconds=duration_seconds,
                fps=round(fps, 2),
                width=width,
                height=height,
                total_frames=total_frames,
            )
        finally:
            cap.release()

    @classmethod
    def sample_frames(
        cls,
        video_path: str | Path,
        sample_rate: float = 1.0,
    ) -> Generator[tuple[int, float, cv2.Mat], None, None]:
        """Iteratively samples frames at specified sample_rate (frames per second).

        Yields (frame_index, timestamp_seconds, bgr_image).
        Memory-safe: does not load the entire video into RAM.
        """
        path_str = str(video_path)
        cap = cv2.VideoCapture(path_str)
        if not cap.isOpened():
            raise VideoProcessorError(f"Failed to open video file for frame sampling: {video_path}")

        try:
            original_fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if original_fps <= 0:
                raise VideoProcessorError(f"Invalid FPS ({original_fps}) in video file.")

            # Calculate frame step interval
            frame_step = max(1, int(round(original_fps / sample_rate)))

            curr_frame = 0
            sample_index = 0

            while curr_frame < total_frames:
                cap.set(cv2.CAP_PROP_POS_FRAMES, curr_frame)
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                # Precise timestamp in seconds
                timestamp = round(curr_frame / original_fps, 2)
                yield sample_index, timestamp, frame

                sample_index += 1
                curr_frame += frame_step

        finally:
            cap.release()

    @classmethod
    def generate_thumbnail(
        cls,
        video_path: str | Path,
        output_path: str | Path,
        target_time_seconds: float = 1.0,
    ) -> str:
        """Extracts a single representative frame as thumbnail."""
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise VideoProcessorError(f"Could not open video for thumbnail: {video_path}")

        try:
            fps = cap.get(cv2.CAP_PROP_FPS)
            target_frame = int(target_time_seconds * fps) if fps > 0 else 0
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
            ret, frame = cap.read()

            if not ret or frame is None:
                # Fallback to first frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()

            if not ret or frame is None:
                raise VideoProcessorError("Could not read any frame for thumbnail extraction.")

            # Resize thumbnail for lightweight delivery
            h, w = frame.shape[:2]
            scale = 480.0 / max(w, 1)
            thumb_w = int(w * scale)
            thumb_h = int(h * scale)
            resized = cv2.resize(frame, (thumb_w, thumb_h), interpolation=cv2.INTER_AREA)

            output_p = Path(output_path)
            output_p.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(output_p), resized, [cv2.IMWRITE_JPEG_QUALITY, 85])
            return str(output_p)
        finally:
            cap.release()

    @classmethod
    def extract_subclip(
        cls,
        video_path: str | Path,
        output_clip_path: str | Path,
        start_seconds: float,
        end_seconds: float,
    ) -> str:
        """Extracts a video subclip using FFmpeg fast seek."""
        ffmpeg_exe = cls.get_ffmpeg_path()
        out_p = Path(output_clip_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)

        duration = max(0.5, end_seconds - start_seconds)

        # -ss before -i for fast keyframe seek, -t for duration, stream copy if possible or reencode for safety
        cmd = [
            ffmpeg_exe,
            "-y",  # Overwrite output
            "-ss", str(start_seconds),
            "-i", str(video_path),
            "-t", str(duration),
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "23",
            "-c:a", "aac",
            "-movflags", "+faststart",
            str(out_p),
        ]

        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            raise VideoProcessorError(f"FFmpeg clip extraction failed: {result.stderr[-500:]}")

        if not out_p.exists() or out_p.stat().st_size == 0:
            raise VideoProcessorError("Generated clip file is missing or empty.")

        # Validate generated clip integrity
        try:
            cls.get_metadata(out_p)
        except Exception as e:
            if out_p.exists():
                out_p.unlink()
            raise VideoProcessorError(f"Generated subclip failed integrity validation: {e}")

        return str(out_p)

    @classmethod
    def generate_annotated_video(
        cls,
        video_path: str | Path,
        output_path: str | Path,
        detections: list[dict],
        sample_rate: float = 1.0,
    ) -> str:
        """Generates an MP4 video file with burned-in cyan bounding boxes, class labels, and confidence scores."""
        path_str = str(video_path)
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)

        raw_out_path = out_p.parent / f"temp_{out_p.name}"

        cap = cv2.VideoCapture(path_str)
        if not cap.isOpened():
            raise VideoProcessorError(f"Failed to open video for annotation: {video_path}")

        try:
            fps = float(cap.get(cv2.CAP_PROP_FPS))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            if fps <= 0 or width <= 0 or height <= 0:
                raise VideoProcessorError("Invalid video metadata for drawing annotations.")

            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(str(raw_out_path), fourcc, fps, (width, height))
            if not writer.isOpened():
                raise VideoProcessorError("Failed to initialize OpenCV VideoWriter.")

            # Calculate dynamic styling scaled to video resolution (bold, thick high-contrast annotations)
            ref_dim = min(width, height)
            box_thickness = max(4, int(round(ref_dim / 190)))  # Substantial bounding box (4px for 720p, 5-6px for 1080p)
            font_scale = max(0.65, round((ref_dim / 1080.0) * 0.85, 2))
            font_thickness = max(2, int(round(box_thickness / 2.2)))  # Semi-bold clean readable text
            pad_x = max(8, int(box_thickness * 1.8))
            pad_y = max(5, int(box_thickness * 1.3))
            font = cv2.FONT_HERSHEY_SIMPLEX

            def get_class_bgr(cls_str: str) -> tuple[int, int, int]:
                nl = cls_str.lower()
                if "person" in nl or "human" in nl:
                    return (78, 131, 194)  # Warm Sand / Skin tone #C2834E
                elif "bag" in nl or "backpack" in nl or "suitcase" in nl:
                    return (8, 179, 234)   # Tactical Gold #EAB308
                else:
                    return (11, 158, 245)  # Reticle Amber #F59E0B

            dark_bgr = (15, 15, 15)  # Contrast dark text

            window = 0.75  # seconds
            frame_idx = 0

            while True:
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                t = round(frame_idx / fps, 2)
                
                # Active detections for current timestamp
                active_dets = [
                    d for d in detections
                    if abs(d["timestamp"] - t) <= window
                ]

                # Draw detections on frame
                for d in active_dets:
                    box = d.get("box", {})
                    x1 = max(0, min(width - 1, int(box.get("x1", 0) * width)))
                    y1 = max(0, min(height - 1, int(box.get("y1", 0) * height)))
                    x2 = max(0, min(width - 1, int(box.get("x2", 1) * width)))
                    y2 = max(0, min(height - 1, int(box.get("y2", 1) * height)))

                    cls_name = d.get("class_name", "object")
                    conf = d.get("confidence", 0.0)
                    label = f"{cls_name} {conf:.2f}"
                    class_color = get_class_bgr(cls_name)

                    # 1. Bounding Box (thicker, crisp outline)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), class_color, box_thickness)

                    # 2. Label Pill (size scaled and bold, styled like the website badge)
                    (tw, th), baseline = cv2.getTextSize(label, font, font_scale, font_thickness)

                    # Position pill above box or flip inside if near top boundary
                    if y1 - th - (pad_y * 2) >= 0:
                        label_bg_y1 = y1 - th - (pad_y * 2)
                        label_bg_y2 = y1
                        text_y = y1 - pad_y
                    else:
                        label_bg_y1 = y1
                        label_bg_y2 = min(height - 1, y1 + th + (pad_y * 2))
                        text_y = y1 + th + pad_y

                    label_bg_x2 = min(width - 1, x1 + tw + (pad_x * 2))
                    text_x = x1 + pad_x

                    # Solid class label pill
                    cv2.rectangle(frame, (x1, label_bg_y1), (label_bg_x2, label_bg_y2), class_color, -1)
                    # Bold anti-aliased text
                    cv2.putText(
                        frame,
                        label,
                        (text_x, text_y),
                        font,
                        font_scale,
                        dark_bgr,
                        font_thickness,
                        cv2.LINE_AA,
                    )

                writer.write(frame)
                frame_idx += 1

            writer.release()

        finally:
            cap.release()

        # Re-encode with FFmpeg for libx264 + faststart browser playback & download compatibility
        ffmpeg_exe = cls.get_ffmpeg_path()
        cmd = [
            ffmpeg_exe,
            "-y",
            "-i", str(raw_out_path),
            "-i", str(path_str),
            "-map", "0:v:0",
            "-map", "1:a:0?",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "23",
            "-c:a", "aac",
            "-shortest",
            "-movflags", "+faststart",
            str(out_p),
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        if raw_out_path.exists():
            raw_out_path.unlink()

        if result.returncode != 0 or not out_p.exists():
            raise VideoProcessorError(f"FFmpeg annotated video encoding failed: {result.stderr[-300:]}")

        return str(out_p)

