"""Auth endpoints for Cooktube backend (Google OAuth + session cookies)."""
from datetime import datetime, timedelta
import os
from typing import Optional

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

router = APIRouter()

# Dependency to get current authenticated user
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    payload = _verify_token(token) if token else None
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    user = {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "picture": payload.get("picture"),
    }
    return user

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "dev_cooktube_secret_change_me")
ACCESS_TOKEN_TTL = os.getenv("ACCESS_TOKEN_TTL", "15m")
REFRESH_TOKEN_TTL = os.getenv("REFRESH_TOKEN_TTL", "7d")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
# Optional explicit redirect URI override (should match one registered in Google console)
OAUTH_REDIRECT_URI = os.getenv("OAUTH_REDIRECT_URI")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN")
# Cookie policy (lax | none | strict). Use 'none' for cross-site frontends and enable Secure automatically in that case.
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()


class OkResponse(BaseModel):
    ok: bool


def _parse_ttl(ttl: str) -> timedelta:
    # Supports e.g., "15m", "7d", "3600" (seconds)
    try:
        if ttl.endswith("m"):
            return timedelta(minutes=int(ttl[:-1]))
        if ttl.endswith("h"):
            return timedelta(hours=int(ttl[:-1]))
        if ttl.endswith("d"):
            return timedelta(days=int(ttl[:-1]))
        # seconds
        return timedelta(seconds=int(ttl))
    except Exception:
        # default
        return timedelta(minutes=15)


def _issue_tokens(user: dict) -> tuple[str, str, datetime, datetime]:
    now = datetime.utcnow()
    access_exp = now + _parse_ttl(ACCESS_TOKEN_TTL)
    refresh_exp = now + _parse_ttl(REFRESH_TOKEN_TTL)
    payload = {
        "sub": user["id"],
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "exp": access_exp,
        "iat": now,
    }
    access = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    refresh_payload = {
        "sub": user["id"],
        "type": "refresh",
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "exp": refresh_exp,
        "iat": now,
    }
    refresh = jwt.encode(refresh_payload, JWT_SECRET, algorithm="HS256")
    return access, refresh, access_exp, refresh_exp


def _verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None


def _set_auth_cookies(resp: Response, access: str, refresh: str, access_exp: datetime, refresh_exp: datetime) -> None:
    # If SameSite=None is requested, cookies must be Secure or browsers will drop them.
    secure_env = os.getenv("NODE_ENV", "development") == "production"
    secure = True if COOKIE_SAMESITE == "none" else secure_env
    samesite = COOKIE_SAMESITE if COOKIE_SAMESITE in {"lax", "none", "strict"} else "lax"
    # Note: cookies are set for the backend host; frontend must call the backend API domain for cookies to be sent
    resp.set_cookie(
        key="access_token",
        value=access,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
        max_age=int((access_exp - datetime.utcnow()).total_seconds()),
    )
    resp.set_cookie(
        key="refresh_token",
        value=refresh,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
        max_age=int((refresh_exp - datetime.utcnow()).total_seconds()),
    )


def _clear_auth_cookies(resp: Response) -> None:
    secure = os.getenv("NODE_ENV", "development") == "production"
    resp.delete_cookie("access_token", path="/", samesite="lax")
    resp.delete_cookie("refresh_token", path="/", samesite="lax")


@router.get("/me")
async def me(request: Request):
    token = request.cookies.get("access_token")
    payload = _verify_token(token) if token else None
    if not payload:
        return JSONResponse({"message": "Unauthorized"}, status_code=status.HTTP_401_UNAUTHORIZED)
    user = {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "picture": payload.get("picture"),
    }
    return {"user": user}


@router.post("/refresh", response_model=OkResponse)
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    payload = _verify_token(token) if token else None
    if not payload or payload.get("type") != "refresh":
        return JSONResponse({"message": "Unauthorized"}, status_code=status.HTTP_401_UNAUTHORIZED)
    # In a real app, look up the user; here we reconstruct minimal user
    user = {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "picture": payload.get("picture"),
    }
    access, refresh_tok, aexp, rexp = _issue_tokens(user)
    _set_auth_cookies(response, access, refresh_tok, aexp, rexp)
    return {"ok": True}


@router.post("/logout", response_model=OkResponse)
async def logout(response: Response):
    _clear_auth_cookies(response)
    return {"ok": True}


@router.get("/google/callback")
async def google_callback(request: Request):
    # Extract params
    code = request.query_params.get("code")
    state = request.query_params.get("state") or "/"

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Missing Google OAuth credentials")

    # Compute redirect_uri; if not explicitly configured, try to infer from request host
    if OAUTH_REDIRECT_URI:
        redirect_uri = OAUTH_REDIRECT_URI
    else:
        # Build callback URL pointing to this endpoint
        scheme = "https" if request.url.scheme == "https" else "http"
        redirect_uri = f"{scheme}://{request.headers.get('host')}/api/auth/google/callback"

    # Exchange code for tokens
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_res.text}")
        token_data = token_res.json()
        id_token = token_data.get("id_token")
        if not id_token:
            raise HTTPException(status_code=400, detail="Missing id_token in response")

        # Validate ID token via tokeninfo endpoint
        info_res = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token}
        )
        if info_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid ID token")
        info = info_res.json()

    if info.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="ID token audience mismatch")

    user = {
        "id": info.get("sub"),
        "email": info.get("email"),
        "name": info.get("name") or info.get("email"),
        "picture": info.get("picture"),
    }

    access, refresh, aexp, rexp = _issue_tokens(user)
    # Redirect back to the frontend origin if configured; otherwise use relative path
    redir_base = FRONTEND_ORIGIN.rstrip("/") if FRONTEND_ORIGIN else ""
    final_url = f"{redir_base}{state or '/'}"
    resp = RedirectResponse(url=final_url, status_code=302)
    _set_auth_cookies(resp, access, refresh, aexp, rexp)
    return resp
