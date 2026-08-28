# -*- coding: utf-8 -*-
"""砺行 · 日省 — Logto 登录 + Turso 云同步 + 静态站点。"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Union

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from logto import LogtoClient, LogtoConfig, Storage, UserInfoScope
from starlette.middleware.sessions import SessionMiddleware

from .config import get_settings
from .db import get_state, ping_db, put_state, upsert_user
from . import audio_proxy

PUBLIC_PREFIXES = (
    "/health",
    "/sign-in",
    "/callback",
    "/sign-out",
    "/assets/",
    "/brand/",
    "/manifest.json",
    "/sw.js",
    "/icons/",
    "/cloud-ui.css",
)

PUBLIC_PATHS = {"/", "/index.html", "/workspace.html", "/qr.html", "/api/me", "/__backup", "/api/audio/config"}

BACKUP_NAME = "lixing-autobackup.json"

settings = get_settings()
app = FastAPI(title="砺行 · 日省")


class SessionStorage(Storage):
    def __init__(self, session: dict) -> None:
        self._session = session

    def get(self, key: str) -> Union[str, None]:
        val = self._session.get(key)
        return None if val is None else str(val)

    def set(self, key: str, value: Union[str, None]) -> None:
        if value is None:
            self._session.pop(key, None)
        else:
            self._session[key] = value

    def delete(self, key: str) -> None:
        self._session.pop(key, None)


def logto_client(request: Request) -> LogtoClient:
    return LogtoClient(
        LogtoConfig(
            endpoint=settings.logto_endpoint,
            appId=settings.logto_app_id,
            appSecret=settings.logto_app_secret,
            scopes=[UserInfoScope.email, UserInfoScope.phone],
        ),
        storage=SessionStorage(request.session),
    )


def auth_configured() -> bool:
    return bool(settings.logto_endpoint and settings.logto_app_id and settings.logto_app_secret)


def current_sub(request: Request) -> str | None:
    if not auth_configured():
        return None
    client = logto_client(request)
    if not client.isAuthenticated():
        return None
    claims = client.getIdTokenClaims()
    return claims.sub if claims else None


@app.middleware("http")
async def require_auth(request: Request, call_next):
    path = request.url.path
    if path in PUBLIC_PATHS or path.startswith(PUBLIC_PREFIXES):
        return await call_next(request)
    if path.endswith(
        (".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".json", ".svg", ".webmanifest", ".ttf", ".woff", ".woff2")
    ):
        return await call_next(request)
    if not settings.auth_required or not auth_configured():
        return await call_next(request)
    if path.startswith("/api/"):
        if current_sub(request):
            return await call_next(request)
        return JSONResponse({"detail": "未登录", "authenticated": False}, status_code=401)
    if current_sub(request):
        return await call_next(request)
    return RedirectResponse("/sign-in")


app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie="life_density_session",
    https_only=settings.logto_redirect_uri.startswith("https://"),
    same_site="lax",
    max_age=14 * 24 * 3600,
)


@app.get("/health")
async def health():
    body = {"status": "ok", "app": settings.app_name, "auth": auth_configured()}
    try:
        body["db"] = ping_db()
    except Exception as exc:  # noqa: BLE001
        body["db_error"] = str(exc)
    return body


@app.get("/api/audio/config")
async def audio_config():
    return {"available": audio_proxy.token_configured()}


@app.post("/api/audio/transcribe")
async def audio_transcribe(audio_file: UploadFile = File(...)):
    raw = await audio_file.read()
    name = audio_file.filename or "voice.webm"
    result = audio_proxy.transcribe_blob(raw, filename=name)
    if not result.get("ok"):
        return JSONResponse(result, status_code=502)
    return result


@app.get("/sign-in")
async def sign_in(request: Request):
    if not auth_configured():
        return JSONResponse({"detail": "未配置 Logto"}, status_code=503)
    client = logto_client(request)
    url = await client.signIn(redirectUri=settings.logto_redirect_uri)
    return RedirectResponse(url)


@app.get("/callback")
async def callback(request: Request):
    if not request.query_params.get("code"):
        return RedirectResponse("/sign-in")
    client = logto_client(request)
    try:
        await client.handleSignInCallback(str(request.url))
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            {"detail": "登录回调失败", "reason": str(exc), "sign_in": "/sign-in"},
            status_code=400,
        )
    claims = client.getIdTokenClaims()
    if claims and claims.sub:
        upsert_user(
            claims.sub,
            getattr(claims, "email", None),
            getattr(claims, "name", None),
            getattr(claims, "phone_number", None),
        )
    return RedirectResponse("/")


@app.get("/sign-out")
async def sign_out(request: Request):
    if not auth_configured():
        return RedirectResponse("/")
    client = logto_client(request)
    url = await client.signOut(postLogoutRedirectUri=settings.logto_post_logout_uri)
    return RedirectResponse(url)


@app.get("/api/me")
async def me(request: Request):
    meta = {
        "auth_configured": auth_configured(),
        "auth_required": settings.auth_required,
    }
    sub = current_sub(request)
    if not sub:
        return {**meta, "authenticated": False}
    client = logto_client(request)
    claims = client.getIdTokenClaims()
    return {
        **meta,
        "authenticated": True,
        "sub": sub,
        "email": getattr(claims, "email", None) if claims else None,
        "phone": getattr(claims, "phone_number", None) if claims else None,
        "name": getattr(claims, "name", None) if claims else None,
    }


@app.get("/api/state")
async def read_state(request: Request):
    sub = current_sub(request)
    if not sub:
        return JSONResponse({"detail": "未登录"}, status_code=401)
    raw, updated_at = get_state(sub)
    data = json.loads(raw) if raw else None
    return {"data": data, "updated_at": updated_at}


@app.put("/api/state")
async def write_state(request: Request):
    sub = current_sub(request)
    if not sub:
        return JSONResponse({"detail": "未登录"}, status_code=401)
    body = await request.json()
    data = body.get("data", body)
    if not isinstance(data, dict):
        return JSONResponse({"detail": "data 须为对象"}, status_code=400)
    updated_at = put_state(sub, json.dumps(data, ensure_ascii=False))
    return {"ok": True, "updated_at": updated_at}


@app.post("/__backup")
async def backup(request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "invalid json"}, status_code=400)
    if not isinstance(payload, dict):
        return JSONResponse({"ok": False, "error": "expected object"}, status_code=400)
    if "data" not in payload:
        payload = {
            "app": "lixing-rixing",
            "version": 3,
            "exportedAt": datetime.now(tz=timezone.utc).isoformat(),
            "auto": True,
            "data": payload,
        }
    else:
        payload.setdefault("app", "lixing-rixing")
        payload.setdefault("auto", True)
        payload["exportedAt"] = datetime.now(tz=timezone.utc).isoformat()
    out = settings.static_dir / BACKUP_NAME
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    out.write_text(text, encoding="utf-8")
    return {"ok": True, "path": str(out), "bytes": len(text.encode("utf-8"))}


static_dir = settings.static_dir
if static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")


def main() -> None:
    import uvicorn

    port = int(os.getenv("PORT", settings.port))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    main()
