from __future__ import annotations

import json
import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Any


def _apply_pragmas(conn: sqlite3.Connection) -> None:
    """Apply performance-oriented SQLite pragmas on a fresh connection."""
    conn.execute("PRAGMA journal_mode=WAL")      # concurrent reads while writing
    conn.execute("PRAGMA synchronous=NORMAL")     # safe + faster than FULL
    conn.execute("PRAGMA cache_size=8000")        # ~32 MB page cache
    conn.execute("PRAGMA temp_store=MEMORY")      # temp tables in RAM


class CircuitStore:
    """Stores anonymous shareable circuits (used by /api/circuits share feature)."""

    def __init__(self, db_path: str) -> None:
        self.db_path = str(Path(db_path))
        self._lock = threading.Lock()
        self._local = threading.local()   # per-thread persistent connection
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = sqlite3.connect(self.db_path, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            _apply_pragmas(conn)
            self._local.conn = conn
        return conn

    def _init_db(self) -> None:
        conn = self._conn()
        with self._lock:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS circuits (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    n_qubits INTEGER NOT NULL,
                    circuit_json TEXT NOT NULL,
                    created_at REAL NOT NULL
                )
                """
            )
            conn.commit()

    def save_circuit(self, name: str, circuit: list[dict[str, Any]], n_qubits: int) -> str:
        circuit_id = f"circ_{uuid.uuid4().hex[:12]}"
        payload = json.dumps(circuit, ensure_ascii=False)
        created_at = time.time()
        with self._lock:
            conn = self._conn()
            conn.execute(
                "INSERT INTO circuits (id, name, n_qubits, circuit_json, created_at) VALUES (?, ?, ?, ?, ?)",
                (circuit_id, name, n_qubits, payload, created_at),
            )
            conn.commit()
        return circuit_id

    def load_circuit(self, circuit_id: str) -> dict[str, Any] | None:
        conn = self._conn()
        row = conn.execute(
            "SELECT id, name, n_qubits, circuit_json, created_at FROM circuits WHERE id = ?",
            (circuit_id,),
        ).fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "name": row["name"],
            "n_qubits": row["n_qubits"],
            "circuit": json.loads(row["circuit_json"]),
            "created_at": row["created_at"],
        }


class UserStore:
    """Stores user accounts, per-user circuits, and per-user simulation history."""

    def __init__(self, db_path: str) -> None:
        self.db_path = str(Path(db_path))
        self._lock = threading.Lock()
        self._local = threading.local()
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = sqlite3.connect(self.db_path, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            _apply_pragmas(conn)
            self._local.conn = conn
        return conn

    def _init_db(self) -> None:
        conn = self._conn()
        with self._lock:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id       INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT    UNIQUE NOT NULL,
                    email    TEXT    NOT NULL DEFAULT '',
                    pw_hash  TEXT    NOT NULL,
                    created_at REAL  NOT NULL
                );

                CREATE TABLE IF NOT EXISTS user_circuits (
                    id         TEXT PRIMARY KEY,
                    username   TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
                    name       TEXT NOT NULL,
                    n_qubits   INTEGER NOT NULL,
                    gate_count INTEGER NOT NULL DEFAULT 0,
                    circuit_json TEXT NOT NULL,
                    saved_at   REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS user_history (
                    id       INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT    NOT NULL REFERENCES users(username) ON DELETE CASCADE,
                    ts       REAL    NOT NULL,
                    desc     TEXT    NOT NULL,
                    type     TEXT    NOT NULL DEFAULT 'sim'
                );

                CREATE INDEX IF NOT EXISTS idx_circuits_username
                    ON user_circuits(username, saved_at DESC);

                CREATE INDEX IF NOT EXISTS idx_history_username
                    ON user_history(username, id DESC);
                """
            )
            conn.commit()

    # ── User account ──────────────────────────────────────────────────────────

    def create_user(self, username: str, pw_hash: str, email: str = "") -> bool:
        """Returns False if username already exists."""
        try:
            with self._lock:
                conn = self._conn()
                conn.execute(
                    "INSERT INTO users (username, email, pw_hash, created_at) VALUES (?, ?, ?, ?)",
                    (username, email, pw_hash, time.time()),
                )
                conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    def get_user(self, username: str) -> dict[str, Any] | None:
        conn = self._conn()
        row = conn.execute(
            "SELECT username, email, pw_hash, created_at FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if row is None:
            return None
        return dict(row)

    # ── User circuits ─────────────────────────────────────────────────────────

    def list_circuits(self, username: str) -> list[dict[str, Any]]:
        conn = self._conn()
        rows = conn.execute(
            "SELECT id, name, n_qubits, gate_count, circuit_json, saved_at "
            "FROM user_circuits WHERE username = ? ORDER BY saved_at DESC LIMIT 50",
            (username,),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "qubits": r["n_qubits"],
                "gateCount": r["gate_count"],
                "circ": json.loads(r["circuit_json"]),
                "savedAt": r["saved_at"],
            }
            for r in rows
        ]

    def save_circuit(
        self,
        username: str,
        name: str,
        circuit_json: Any,
        n_qubits: int,
        gate_count: int,
    ) -> str:
        cid = "c_" + uuid.uuid4().hex[:16]
        payload = json.dumps(circuit_json, ensure_ascii=False)
        with self._lock:
            conn = self._conn()
            conn.execute(
                "INSERT INTO user_circuits (id, username, name, n_qubits, gate_count, circuit_json, saved_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (cid, username, name, n_qubits, gate_count, payload, time.time()),
            )
            conn.commit()
        return cid

    def delete_circuit(self, username: str, circuit_id: str) -> bool:
        with self._lock:
            conn = self._conn()
            cur = conn.execute(
                "DELETE FROM user_circuits WHERE id = ? AND username = ?",
                (circuit_id, username),
            )
            conn.commit()
        return cur.rowcount > 0

    # ── User history ──────────────────────────────────────────────────────────

    def list_history(self, username: str) -> list[dict[str, Any]]:
        conn = self._conn()
        rows = conn.execute(
            "SELECT ts, desc, type FROM user_history WHERE username = ? ORDER BY ts DESC LIMIT 100",
            (username,),
        ).fetchall()
        return [{"ts": r["ts"], "desc": r["desc"], "type": r["type"]} for r in rows]

    def add_history(self, username: str, ts: float, desc: str, type_: str = "sim") -> None:
        with self._lock:
            conn = self._conn()
            conn.execute(
                "INSERT INTO user_history (username, ts, desc, type) VALUES (?, ?, ?, ?)",
                (username, ts, desc, type_),
            )
            # Keep only the latest 100 entries; ORDER BY id is faster than ORDER BY ts
            # because id is the INTEGER PRIMARY KEY (integer sort vs float sort).
            conn.execute(
                "DELETE FROM user_history WHERE username = ? AND id NOT IN "
                "(SELECT id FROM user_history WHERE username = ? ORDER BY id DESC LIMIT 100)",
                (username, username),
            )
            conn.commit()
