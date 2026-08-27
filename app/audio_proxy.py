# -*- coding: utf-8 -*-
"""AI Builders Space Grok STT 代理。"""
from __future__ import annotations

import requests

from .config import get_settings


def token_configured() -> bool:
    return bool(get_settings().ai_builder_token)


def transcribe_blob(audio_bytes: bytes, filename: str = "voice.webm", language: str = "zh") -> dict:
    settings = get_settings()
    token = settings.ai_builder_token
    if not token:
        return {"ok": False, "error": "未配置 AI_BUILDER_TOKEN", "available": False}

    url = f"{settings.ai_builders_backend}/v1/audio/grok-transcription"
    files = {"audio_file": (filename, audio_bytes, "audio/webm")}
    data = {"language": language, "simple": "true", "format": "true"}
    try:
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {token}"},
            files=files,
            data=data,
            timeout=120,
        )
    except requests.RequestException as exc:
        return {"ok": False, "error": str(exc), "available": True}

    if resp.status_code >= 400:
        detail = resp.text[:500]
        try:
            detail = resp.json().get("detail", detail)
        except Exception:
            pass
        return {"ok": False, "error": f"STT {resp.status_code}: {detail}", "available": True}

    try:
        payload = resp.json()
    except Exception:
        return {"ok": False, "error": "STT 响应非 JSON", "available": True}

    return {"ok": True, "text": (payload.get("text") or "").strip(), "available": True}
