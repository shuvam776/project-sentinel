import pytest
from app.core.detector import COCO_CLASSES_91


def test_coco_classes_mapping():
    assert len(COCO_CLASSES_91) == 91

    # Verify critical categories from requirements
    required_classes = [
        "person",
        "car",
        "bus",
        "truck",
        "bicycle",
        "motorcycle",
        "backpack",
        "handbag",
        "suitcase",
    ]
    for cls in required_classes:
        assert cls in COCO_CLASSES_91, f"Required class '{cls}' missing from detector ontology!"


def test_coco_valid_categories():
    valid = [c for c in COCO_CLASSES_91 if c not in ("__background__", "N/A")]
    # Standard COCO has exactly 80 valid thing categories
    assert len(valid) == 80

