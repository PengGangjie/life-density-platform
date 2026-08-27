"""砺行 · 日省 · 配置。"""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
for candidate in (
    ROOT / "secrets" / "lixing-rixing" / ".env",
    Path(r"c:\00CS\text\secrets\lixing-rixing\.env"),
):
    if candidate.is_file():
        load_dotenv(candidate, override=False)
        break
load_dotenv(ROOT / ".env", override=False)


@dataclass(frozen=True)
class Settings:
    app_name: str
    static_dir: Path
    port: int


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_name="lixing-rixing",
        static_dir=ROOT / "static",
        port=int(os.getenv("PORT", "8030")),
    )
