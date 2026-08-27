# -*- coding: utf-8 -*-
"""砺行 · 日省 — 静态站点 + 健康检查 + 本目录备份 API。"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings

settings = get_settings()
app = FastAPI(title="砺行 · 日省")
BACKUP_NAME = "lixing-autobackup.json"


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}


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
