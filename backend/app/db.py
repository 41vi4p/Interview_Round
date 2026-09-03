import os
import sqlite3
from datetime import datetime, timezone

from app.config import DB_PATH

_connection: sqlite3.Connection | None = None


def get_connection() -> sqlite3.Connection:
    global _connection
    if _connection is None:
        os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
        _connection = sqlite3.connect(DB_PATH, check_same_thread=False)
        _connection.row_factory = sqlite3.Row
    return _connection


def init_schema() -> None:
    conn = get_connection()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            base_currency TEXT NOT NULL,
            target_currency TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, base_currency, target_currency)
        );

        CREATE TABLE IF NOT EXISTS conversion_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            base_currency TEXT NOT NULL,
            target_currency TEXT NOT NULL,
            amount REAL NOT NULL,
            converted_amount REAL NOT NULL,
            rate REAL NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rate_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            base_currency TEXT NOT NULL,
            target_currency TEXT NOT NULL,
            rate REAL NOT NULL,
            snapshot_date TEXT NOT NULL,
            UNIQUE(base_currency, target_currency, snapshot_date)
        );
        """
    )
    conn.commit()


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# --- favorites ---


def list_favorites(user_id: str) -> list[sqlite3.Row]:
    conn = get_connection()
    return conn.execute(
        "SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()


def insert_favorite(user_id: str, base: str, target: str) -> sqlite3.Row:
    conn = get_connection()
    cur = conn.execute(
        """
        INSERT INTO favorites (user_id, base_currency, target_currency, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, base, target, _now_iso()),
    )
    conn.commit()
    return conn.execute(
        "SELECT * FROM favorites WHERE id = ?", (cur.lastrowid,)
    ).fetchone()


def get_favorite(favorite_id: int) -> sqlite3.Row | None:
    conn = get_connection()
    return conn.execute(
        "SELECT * FROM favorites WHERE id = ?", (favorite_id,)
    ).fetchone()


def delete_favorite(favorite_id: int) -> None:
    conn = get_connection()
    conn.execute("DELETE FROM favorites WHERE id = ?", (favorite_id,))
    conn.commit()


# --- conversion history ---


def insert_history(
    user_id: str, base: str, target: str, amount: float, converted: float, rate: float
) -> None:
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO conversion_history
            (user_id, base_currency, target_currency, amount, converted_amount, rate, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, base, target, amount, converted, rate, _now_iso()),
    )
    conn.commit()


def list_history(user_id: str, limit: int = 20) -> list[sqlite3.Row]:
    conn = get_connection()
    return conn.execute(
        """
        SELECT * FROM conversion_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()


# --- rate snapshots (durable cache tier + trend data source) ---


def get_snapshot_for_today(base: str, target: str) -> sqlite3.Row | None:
    conn = get_connection()
    return conn.execute(
        """
        SELECT * FROM rate_snapshots
        WHERE base_currency = ? AND target_currency = ? AND snapshot_date = ?
        """,
        (base, target, _today()),
    ).fetchone()


def upsert_snapshot(base: str, target: str, rate: float) -> None:
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO rate_snapshots (base_currency, target_currency, rate, snapshot_date)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(base_currency, target_currency, snapshot_date)
        DO UPDATE SET rate = excluded.rate
        """,
        (base, target, rate, _today()),
    )
    conn.commit()


def list_last_30_snapshots(base: str, target: str) -> list[sqlite3.Row]:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT snapshot_date, rate FROM rate_snapshots
        WHERE base_currency = ? AND target_currency = ?
        ORDER BY snapshot_date DESC
        LIMIT 30
        """,
        (base, target),
    ).fetchall()
    return list(reversed(rows))


def list_todays_snapshots(limit: int = 40) -> list[sqlite3.Row]:
    conn = get_connection()
    return conn.execute(
        """
        SELECT base_currency, target_currency, rate FROM rate_snapshots
        WHERE snapshot_date = ?
        ORDER BY base_currency, target_currency
        LIMIT ?
        """,
        (_today(), limit),
    ).fetchall()
