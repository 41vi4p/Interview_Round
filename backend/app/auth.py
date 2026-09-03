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
    # os.path.isfile (not exists): a Docker bind mount of a not-yet-created
    # host file creates an empty directory at this path, which exists() would
    # accept and Certificate() would then fail to parse.
    try:
        if not os.path.isfile(FIREBASE_SERVICE_ACCOUNT_PATH):
            raise FileNotFoundError(FIREBASE_SERVICE_ACCOUNT_PATH)
        cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        _firebase_ready = True
    except Exception:
        logger.warning(
            "Firebase not configured at %s — auth-protected endpoints will "
            "reject all requests until it is configured.",
            FIREBASE_SERVICE_ACCOUNT_PATH,
        )


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
