import logging
from pathlib import Path
from typing import Any
import cloudinary
import cloudinary.uploader
import cloudinary.api
from app.config import settings

logger = logging.getLogger("sentinel.cloudinary")


class CloudinaryService:
    def __init__(self):
        self._configured = False
        self._init_client()

    def _init_client(self):
        if (
            settings.CLOUDINARY_CLOUD_NAME
            and settings.CLOUDINARY_API_KEY
            and settings.CLOUDINARY_API_SECRET
        ):
            try:
                cloudinary.config(
                    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                    api_key=settings.CLOUDINARY_API_KEY,
                    api_secret=settings.CLOUDINARY_API_SECRET,
                    secure=True,
                )
                self._configured = True
                logger.info(
                    "Cloudinary client initialized for cloud: %s",
                    settings.CLOUDINARY_CLOUD_NAME,
                )
            except Exception as e:
                logger.warning("Failed to configure Cloudinary: %s", e)
                self._configured = False
        else:
            self._configured = False

    @property
    def is_configured(self) -> bool:
        return self._configured and settings.CLOUDINARY_ENABLED

    def upload_video(
        self, file_path: Path | str, public_id: str | None = None
    ) -> dict[str, Any] | None:
        """Uploads a video to Cloudinary with chunked upload for maximum speed and resilience."""
        if not self.is_configured:
            return None

        path_obj = Path(file_path)
        if not path_obj.exists():
            logger.error("Cannot upload missing video to Cloudinary: %s", file_path)
            return None

        try:
            logger.info("Uploading video to Cloudinary CDN: %s", path_obj.name)
            res = cloudinary.uploader.upload_large(
                str(path_obj),
                resource_type="video",
                folder="sentinel/videos",
                public_id=public_id,
                overwrite=True,
                chunk_size=6000000,  # 6MB chunks for high-speed streaming upload
            )
            secure_url = res.get("secure_url")
            pub_id = res.get("public_id")
            logger.info("Cloudinary video upload successful: %s -> %s", pub_id, secure_url)
            return {
                "secure_url": secure_url,
                "public_id": pub_id,
                "duration": res.get("duration"),
                "bytes": res.get("bytes"),
                "format": res.get("format"),
            }
        except Exception as e:
            logger.error("Cloudinary video upload failed for %s: %s", file_path, e)
            return None

    def upload_image(
        self,
        file_path: Path | str,
        public_id: str | None = None,
        folder: str = "sentinel/thumbnails",
    ) -> dict[str, Any] | None:
        """Uploads a thumbnail or frame image to Cloudinary."""
        if not self.is_configured:
            return None

        path_obj = Path(file_path)
        if not path_obj.exists():
            return None

        try:
            res = cloudinary.uploader.upload(
                str(path_obj),
                resource_type="image",
                folder=folder,
                public_id=public_id,
                overwrite=True,
            )
            return {
                "secure_url": res.get("secure_url"),
                "public_id": res.get("public_id"),
            }
        except Exception as e:
            logger.error("Cloudinary image upload failed for %s: %s", file_path, e)
            return None

    def delete_resource(self, public_id: str | None, resource_type: str = "video") -> bool:
        """Deletes a stored asset from Cloudinary when deleted from Sentinel."""
        if not self.is_configured or not public_id:
            return False

        try:
            res = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            success = res.get("result") in {"ok", "not found"}
            logger.info("Cloudinary delete %s (%s): %s", public_id, resource_type, res.get("result"))
            return success
        except Exception as e:
            logger.warning("Failed to delete Cloudinary asset %s: %s", public_id, e)
            return False


cloudinary_service = CloudinaryService()
