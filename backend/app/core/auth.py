import os
import json
import logging
from typing import Optional
from fastapi import Request
import firebase_admin
from firebase_admin import credentials, auth

logger = logging.getLogger("sentinel.auth")

_firebase_initialized = False


def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return True

    try:
        # Check for service account file
        sa_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase_service_account.json")
        if not os.path.isabs(sa_path):
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            sa_path = os.path.join(base_dir, sa_path)

        if os.path.exists(sa_path):
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("Firebase Admin SDK successfully initialized from service account file.")
            return True

        # Check for inline environment JSON
        sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if sa_json:
            cred_dict = json.loads(sa_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("Firebase Admin SDK successfully initialized from environment JSON.")
            return True

        logger.info("Firebase credentials not found; operating in optional auth mode.")
        return False
    except Exception as e:
        logger.warning("Could not initialize Firebase Admin SDK: %s", e)
        return False


def get_current_user_id(request: Request) -> Optional[str]:
    """
    Extracts user ID from request headers, cookies, or query parameters.
    Priority:
    1. Verified Firebase ID token in Authorization: Bearer <token>
    2. Trusted X-User-ID header passed by client session
    3. Query parameter token / uid / user_id
    4. Cookies (for HTML video/image element requests)
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if init_firebase():
            try:
                decoded = auth.verify_id_token(token)
                return decoded.get("uid")
            except Exception as e:
                logger.debug("Firebase ID token verification failed: %s", e)

    # Direct client user header fallback
    user_header = request.headers.get("X-User-ID")
    if user_header:
        return user_header.strip()

    # Query param token verification
    token_param = request.query_params.get("token")
    if token_param and init_firebase():
        try:
            decoded = auth.verify_id_token(token_param)
            return decoded.get("uid")
        except Exception as e:
            logger.debug("Firebase token query param verification failed: %s", e)

    # Direct query param user ID fallback
    for q_key in ("user_id", "uid"):
        q_val = request.query_params.get(q_key)
        if q_val:
            return q_val.strip()

    # Cookie fallback
    cookie_user = request.cookies.get("sentinel_user_id")
    if cookie_user:
        return cookie_user.strip()

    return None

