"""Turso：用户与人生量化状态。"""
from __future__ import annotations

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
