from __future__ import annotations

import logging
import os
import secrets
import time
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext

_raw_key = os.getenv("QEDU_SECRET_KEY")
if not _raw_key:
    _raw_key = secrets.token_hex(32)
    logging.warning(
        "QEDU_SECRET_KEY 未设置 — 已生成随机密钥。"
        "服务重启后所有现有 JWT 将失效。"
        "请在环境变量中设置 QEDU_SECRET_KEY 以持久化会话。"
    )
SECRET_KEY = _raw_key
ALGORITHM = "HS256"
TOKEN_EXPIRE = int(os.getenv("QEDU_TOKEN_EXPIRE", str(7 * 24 * 3600)))  # 7 days

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)


def hash_pw(pw: str) -> str:
    return pwd_ctx.hash(pw)


def verify_pw(pw: str, hashed: str) -> bool:
    return pwd_ctx.verify(pw, hashed)


def make_token(username: str) -> str:
    now = int(time.time())
    return jwt.encode(
        {"sub": username, "iat": now, "exp": now + TOKEN_EXPIRE},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _decode(token: str) -> Optional[str]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]).get("sub")
    except Exception:
        return None


def require_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> str:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    u = _decode(creds.credentials)
    if not u:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return u
