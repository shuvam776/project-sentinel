import cv2
import numpy as np
from pathlib import Path


def generate_test_video(output_path: str | Path, duration_seconds: int = 6, fps: int = 10) -> str:
    """Generates a small synthetic MP4 video containing clear visual objects:

    - A red car moving from left to right in seconds 0-3
    - A person figure walking across in seconds 3-6
    """
    out_p = Path(output_path)
    out_p.parent.mkdir(parents=True, exist_ok=True)

    width, height = 480, 270
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(out_p), fourcc, fps, (width, height))

    total_frames = duration_seconds * fps

    for i in range(total_frames):
        # Background: dark slate gray
        frame = np.full((height, width, 3), (40, 40, 45), dtype=np.uint8)

        # Floor / road line
        cv2.line(frame, (0, 200), (width, 200), (80, 80, 80), 2)

        t = i / fps

        if t < 3.0:
            # Seconds 0-3: A red car moving
            car_x = int(30 + (t / 3.0) * (width - 160))
            car_y = 150
            # Red car body
            cv2.rectangle(frame, (car_x, car_y), (car_x + 90, car_y + 35), (20, 20, 220), -1)
            cv2.rectangle(frame, (car_x + 15, car_y - 20), (car_x + 75, car_y), (20, 20, 220), -1)
            # Wheels
            cv2.circle(frame, (car_x + 20, car_y + 35), 10, (10, 10, 10), -1)
            cv2.circle(frame, (car_x + 70, car_y + 35), 10, (10, 10, 10), -1)
            # Label
            cv2.putText(frame, "RED CAR", (car_x, car_y - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

        else:
            # Seconds 3-6: A person walking
            person_x = int(50 + ((t - 3.0) / 3.0) * (width - 150))
            person_y = 110
            # Head
            cv2.circle(frame, (person_x + 15, person_y), 12, (200, 200, 200), -1)
            # Body
            cv2.rectangle(frame, (person_x, person_y + 12), (person_x + 30, person_y + 60), (180, 100, 50), -1)
            # Legs
            cv2.line(frame, (person_x + 8, person_y + 60), (person_x + 5, person_y + 90), (150, 150, 150), 3)
            cv2.line(frame, (person_x + 22, person_y + 60), (person_x + 25, person_y + 90), (150, 150, 150), 3)
            # Label
            cv2.putText(frame, "PERSON", (person_x - 10, person_y - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Timestamp overlay
        cv2.putText(frame, f"t={t:.1f}s", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)

        out.write(frame)

    out.release()
    return str(out_p)


if __name__ == "__main__":
    generate_test_video("data/test_sample.mp4")
    print("Test video created at data/test_sample.mp4")

