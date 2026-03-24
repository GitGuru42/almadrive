from __future__ import annotations

import os
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials


security = HTTPBasic(auto_error=False)


def _get_admin_creds() -> tuple[str, str]:
    user = (os.getenv("ADMIN_USERNAME") or "").strip()
    pwd = (os.getenv("ADMIN_PASSWORD") or "").strip()
    return user, pwd


def require_admin(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    admin_user, admin_pwd = _get_admin_creds()
    if not admin_user or not admin_pwd:
        # Fail closed: if admin creds are not configured, nobody gets write access.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin credentials are not configured",
        )

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Basic"},
        )

    ok_user = secrets.compare_digest(credentials.username or "", admin_user)
    ok_pwd = secrets.compare_digest(credentials.password or "", admin_pwd)
    if not (ok_user and ok_pwd):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
