"""Turso：用户与人生量化状态。"""
from __future__ import annotations

import json
from contextlib import contextmanager
from typing import Iterator

from libsql_client import create_client_sync

from .config import get_settings

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS life_users (
  logto_sub TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS life_state (
  logto_sub TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (logto_sub) REFERENCES life_users(logto_sub)
);
CREATE TABLE IF NOT EXISTS life_state_pending (
  email TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


@contextmanager
def turso_client() -> Iterator:
    settings = get_settings()
    if not settings.turso_database_url or not settings.turso_auth_token:
        raise RuntimeError("Turso 未配置")
    client = create_client_sync(settings.turso_database_url, auth_token=settings.turso_auth_token)
    try:
        yield client
    finally:
        client.close()


def ensure_schema() -> None:
    with turso_client() as client:
        for stmt in SCHEMA_SQL.split(";"):
            stmt = stmt.strip()
            if stmt:
                client.execute(stmt)


def ping_db() -> str:
    ensure_schema()
    with turso_client() as client:
        n = client.execute("SELECT COUNT(*) FROM life_state").rows[0][0]
        return f"life_state:{n}"


def upsert_user(sub: str, email: str | None, name: str | None, phone: str | None = None) -> None:
    ensure_schema()
    with turso_client() as client:
        client.execute(
            """
            INSERT INTO life_users (logto_sub, email, name, phone)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(logto_sub) DO UPDATE SET
              email = COALESCE(excluded.email, life_users.email),
              name = COALESCE(excluded.name, life_users.name),
              phone = COALESCE(excluded.phone, life_users.phone),
              updated_at = datetime('now')
            """,
            [sub, email, name, phone],
        )
    apply_pending_for_user(sub, email)
    if email:
        consume_pending(email)


def get_state(sub: str) -> tuple[str | None, str | None]:
    ensure_schema()
    with turso_client() as client:
        rows = client.execute(
            "SELECT data_json, updated_at FROM life_state WHERE logto_sub = ?",
            [sub],
        ).rows
        if not rows:
            return None, None
        return rows[0][0], rows[0][1]


def put_state(sub: str, data_json: str) -> str:
    ensure_schema()
    with turso_client() as client:
        client.execute(
            """
            INSERT INTO life_state (logto_sub, data_json, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(logto_sub) DO UPDATE SET
              data_json = excluded.data_json,
              updated_at = datetime('now')
            """,
            [sub, data_json],
        )
        row = client.execute(
            "SELECT updated_at FROM life_state WHERE logto_sub = ?",
            [sub],
        ).rows[0]
        return row[0]


def _state_has_data(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    entries = data.get("entries") if isinstance(data.get("entries"), dict) else {}
    wheel = data.get("wheel") if isinstance(data.get("wheel"), dict) else {}
    scores = wheel.get("scores") if isinstance(wheel.get("scores"), dict) else {}
    n = (
        len(entries)
        + len(data.get("opinions") or [])
        + len(data.get("industries") or [])
        + len(data.get("rationals") or [])
        + len(data.get("samplings") or [])
        + len(data.get("reflections") or [])
        + len(data.get("penetrations") or [])
        + len(data.get("dualCards") or [])
        + len(data.get("biasSpots") or {})
        + len(data.get("leonMarks") or {})
        + len(data.get("wheelSnaps") or [])
        + sum(1 for v in scores.values() if isinstance(v, (int, float)) and v > 0)
    )
    return n > 0


def merge_state(cloud: dict | None, local: dict) -> dict:
    """云端为空用本地；两边都有时密度日记以本地日期为准并集。"""
    if not cloud or not _state_has_data(cloud):
        return local
    out = dict(cloud)
    local_entries = local.get("entries") if isinstance(local.get("entries"), dict) else {}
    cloud_entries = out.get("entries") if isinstance(out.get("entries"), dict) else {}
    merged = dict(cloud_entries)
    merged.update(local_entries)
    out["entries"] = merged
    for key in (
        "opinions",
        "industries",
        "rationals",
        "samplings",
        "reflections",
        "penetrations",
        "dualCards",
        "wheelSnaps",
    ):
        if not out.get(key) and local.get(key):
            out[key] = local[key]
    for key in ("biasSpots", "leonMarks", "indSteps", "settings"):
        if not out.get(key) and local.get(key):
            out[key] = local[key]
    cloud_wheel = out.get("wheel") if isinstance(out.get("wheel"), dict) else {}
    local_wheel = local.get("wheel") if isinstance(local.get("wheel"), dict) else {}
    cloud_scores = cloud_wheel.get("scores") if isinstance(cloud_wheel.get("scores"), dict) else {}
    if not any(isinstance(v, (int, float)) and v > 0 for v in cloud_scores.values()) and local_wheel:
        out["wheel"] = local_wheel
    return out


def put_pending_state(email: str, data_json: str) -> None:
    ensure_schema()
    email = email.strip().lower()
    with turso_client() as client:
        client.execute(
            """
            INSERT INTO life_state_pending (email, data_json, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(email) DO UPDATE SET
              data_json = excluded.data_json,
              updated_at = datetime('now')
            """,
            [email, data_json],
        )


def get_users_by_email(email: str) -> list[str]:
    ensure_schema()
    email = email.strip().lower()
    with turso_client() as client:
        rows = client.execute(
            "SELECT logto_sub FROM life_users WHERE lower(email) = ?",
            [email],
        ).rows
        return [str(r[0]) for r in rows]


def apply_pending_for_user(sub: str, email: str | None) -> bool:
    if not email:
        return False
    email = email.strip().lower()
    raw, _ = get_state(sub)
    cloud = None
    if raw:
        try:
            cloud = json.loads(raw)
        except json.JSONDecodeError:
            cloud = None
    with turso_client() as client:
        rows = client.execute(
            "SELECT data_json FROM life_state_pending WHERE lower(email) = ?",
            [email],
        ).rows
    if not rows:
        return False
    try:
        local = json.loads(rows[0][0])
    except json.JSONDecodeError:
        return False
    merged = merge_state(cloud if isinstance(cloud, dict) else None, local)
    put_state(sub, json.dumps(merged, ensure_ascii=False))
    return True


def consume_pending(email: str) -> None:
    ensure_schema()
    email = email.strip().lower()
    with turso_client() as client:
        client.execute(
            "DELETE FROM life_state_pending WHERE lower(email) = ?",
            [email],
        )
