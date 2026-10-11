from dataclasses import dataclass
import torch
import torchvision
from torchvision.models.detection import (
    fasterrcnn_resnet50_fpn_v2,
    FasterRCNN_ResNet50_FPN_V2_Weights,
)
from PIL import Image
import numpy as np
from app.config import settings


# Verified COCO Class Names (80 categories, 1-indexed in Faster R-CNN v2)
COCO_CLASSES_91 = [
    "__background__", "person", "bicycle", "car", "motorcycle", "airplane", "bus",
    "train", "truck", "boat", "traffic light", "fire hydrant", "N/A", "stop sign",
    "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe", "N/A", "backpack", "umbrella", "N/A", "N/A",
    "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "N/A", "wine glass", "cup", "fork", "knife", "spoon", "bowl",
    "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza",
    "donut", "cake", "chair", "couch", "potted plant", "bed", "N/A", "dining table",
    "N/A", "N/A", "toilet", "N/A", "tv", "laptop", "mouse", "remote", "keyboard",
    "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "N/A",
    "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]


@dataclass
class DetectionItem:
    class_id: int
    class_name: str
    confidence: float
    box_x1: float  # Normalized 0.0 - 1.0
    box_y1: float
    box_x2: float
    box_y2: float


class ObjectDetector:
    """Pretrained Faster R-CNN ResNet-50 FPN v2 detector with COCO weights.

    Zero training or fine-tuning performed. Loaded strictly in eval() mode.
    Licensed under BSD-3-Clause (Permissive).
    """

    def __init__(self, device: str | None = None):
        self.device = device or settings.DEVICE
        self.weights = FasterRCNN_ResNet50_FPN_V2_Weights.DEFAULT
        self.transforms = self.weights.transforms()
        self.categories = self.weights.meta.get("categories", COCO_CLASSES_91)

        # Load pretrained model once per worker
        self.model = fasterrcnn_resnet50_fpn_v2(weights=self.weights)
        self.model.to(self.device)
        self.model.eval()

        # Freeze all parameters
        for param in self.model.parameters():
            param.requires_grad = False

    @torch.no_grad()
    def detect(
        self,
        bgr_image: np.ndarray,
        confidence_threshold: float = 0.50,
    ) -> list[DetectionItem]:
        """Runs object detection on a BGR image frame.

        Args:
            bgr_image: numpy array (H, W, 3) in BGR format (from OpenCV).
            confidence_threshold: minimum score to retain detection.

        Returns:
            List of detected objects with normalized bounding boxes and labels.
        """
        h, w = bgr_image.shape[:2]
        if h == 0 or w == 0:
            return []

        # Convert BGR to RGB PIL Image
        rgb_image = cv2_to_pil(bgr_image)
        input_tensor = self.transforms(rgb_image).to(self.device)

        # Run inference in eval mode
        predictions = self.model([input_tensor])[0]

        boxes = predictions["boxes"].cpu().numpy()
        scores = predictions["scores"].cpu().numpy()
        labels = predictions["labels"].cpu().numpy()

        results: list[DetectionItem] = []
        for box, score, label_id in zip(boxes, scores, labels):
            score_val = float(score)
            if score_val < confidence_threshold:
                continue

            class_idx = int(label_id)
            if 0 <= class_idx < len(self.categories):
                class_name = self.categories[class_idx]
            else:
                class_name = f"unknown_{class_idx}"

            # Skip dummy background or invalid classes
            if class_name in ("__background__", "N/A"):
                continue

            # Normalize bounding box coordinates to [0.0, 1.0]
            x1 = max(0.0, min(1.0, float(box[0] / w)))
            y1 = max(0.0, min(1.0, float(box[1] / h)))
            x2 = max(0.0, min(1.0, float(box[2] / w)))
            y2 = max(0.0, min(1.0, float(box[3] / h)))

            results.append(
                DetectionItem(
                    class_id=class_idx,
                    class_name=class_name,
                    confidence=round(score_val, 4),
                    box_x1=round(x1, 4),
                    box_y1=round(y1, 4),
                    box_x2=round(x2, 4),
                    box_y2=round(y2, 4),
                )
            )

        return results


def cv2_to_pil(bgr_img: np.ndarray) -> Image.Image:
    """Converts OpenCV BGR image to RGB PIL Image."""
    import cv2
    rgb = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)
