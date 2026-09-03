import logging
import os

import firebase_admin
from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.config import FIREBASE_SERVICE_ACCOUNT_PATH

logger = logging.getLogger("app.auth")

_firebase_ready = False


def init_firebase() -> None:
    global _firebase_ready
    if not os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
        logger.warning(
            "Firebase service account not found at %s — auth-protected endpoints "
            "will reject all requests until it is configured.",
            FIREBASE_SERVICE_ACCOUNT_PATH,
        )
        return
    cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
    _firebase_ready = True


def _verify(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    if not token or not _firebase_ready:
        return None
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        return None


async def get_current_user(authorization: str | None = Header(default=None)) -> str:
    uid = _verify(authorization)
    if uid is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    return uid


async def get_optional_user(authorization: str | None = Header(default=None)) -> str | None:
    return _verify(authorization)
