import torch
from transformers import CLIPModel, CLIPProcessor
from PIL import Image
import numpy as np
from app.config import settings


class VisionLanguageEmbedder:
    """Pretrained OpenAI CLIP model for text and image embedding.

    Zero training or fine-tuning performed. Loaded strictly in eval() mode.
    Licensed under MIT License (Permissive).
    """

    def __init__(self, model_name: str | None = None, device: str | None = None):
        self.model_name = model_name or settings.CLIP_MODEL_NAME
        self.device = device or settings.DEVICE

        # Load pretrained CLIP model and processor
        self.processor = CLIPProcessor.from_pretrained(self.model_name)
        self.model = CLIPModel.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()

        # Freeze all parameters
        for param in self.model.parameters():
            param.requires_grad = False

    @torch.no_grad()
    def embed_text(self, text: str) -> np.ndarray:
        """Embeds natural language query into normalized 512-dim vector."""
        inputs = self.processor(text=[text], return_tensors="pt", padding=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        text_features = self.model.get_text_features(**inputs)
        if hasattr(text_features, "pooler_output") and text_features.pooler_output is not None:
            text_features = text_features.pooler_output

        # L2 normalization for cosine similarity
        norm = text_features.norm(p=2, dim=-1, keepdim=True)
        text_features = text_features / torch.clamp(norm, min=1e-8)

        embedding = text_features.squeeze(0).cpu().numpy().astype(np.float32)
        return embedding

    @torch.no_grad()
    def embed_image(self, bgr_image: np.ndarray) -> np.ndarray:
        """Embeds single BGR image into normalized 512-dim vector."""
        import cv2
        rgb = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb)

        inputs = self.processor(images=pil_img, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        image_features = self.model.get_image_features(**inputs)
        if hasattr(image_features, "pooler_output") and image_features.pooler_output is not None:
            image_features = image_features.pooler_output

        norm = image_features.norm(p=2, dim=-1, keepdim=True)
        image_features = image_features / torch.clamp(norm, min=1e-8)

        embedding = image_features.squeeze(0).cpu().numpy().astype(np.float32)
        return embedding

    @torch.no_grad()
    def embed_images_batch(self, bgr_images: list[np.ndarray]) -> list[np.ndarray]:
        """Embeds a batch of BGR images into normalized 512-dim vectors."""
        if not bgr_images:
            return []

        import cv2
        pil_images = [Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)) for img in bgr_images]

        inputs = self.processor(images=pil_images, return_tensors="pt", padding=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        image_features = self.model.get_image_features(**inputs)
        if hasattr(image_features, "pooler_output") and image_features.pooler_output is not None:
            image_features = image_features.pooler_output

        norm = image_features.norm(p=2, dim=-1, keepdim=True)
        image_features = image_features / torch.clamp(norm, min=1e-8)

        embeddings = image_features.cpu().numpy().astype(np.float32)
        return [embeddings[i] for i in range(len(bgr_images))]
