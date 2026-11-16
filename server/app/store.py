"""SQLite store: one row per lease, the lease document as JSON. Small and boring on purpose."""
from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path

from .errors import not_found


class Store:
    def __init__(self, data_dir: Path):
        data_dir.mkdir(parents=True, exist_ok=True)
        (data_dir / "files").mkdir(exist_ok=True)
        self.files_dir = data_dir / "files"
        self._db = sqlite3.connect(data_dir / "leases.db", check_same_thread=False)
        self._db.execute("CREATE TABLE IF NOT EXISTS leases (id TEXT PRIMARY KEY, status TEXT, doc TEXT)")
        self._db.commit()
        self._db_lock = threading.Lock()
        self._lease_locks: dict[str, threading.Lock] = {}
        self._locks_guard = threading.Lock()

    def get(self, lease_id: str) -> dict:
        with self._db_lock:
            row = self._db.execute("SELECT doc FROM leases WHERE id = ?", (lease_id,)).fetchone()
        if not row:
            raise not_found(f"Unknown lease {lease_id}")
        return json.loads(row[0])

    def put(self, lease: dict) -> None:
        with self._db_lock:
            self._db.execute(
                "INSERT INTO leases (id, status, doc) VALUES (?, ?, ?) "
                "ON CONFLICT(id) DO UPDATE SET status = excluded.status, doc = excluded.doc",
                (lease["lease_id"], lease["status"], json.dumps(lease)),
            )
            self._db.commit()

    def ids_with_status(self, status: str) -> list[str]:
        with self._db_lock:
            return [r[0] for r in self._db.execute("SELECT id FROM leases WHERE status = ?", (status,))]

    @contextmanager
    def locked(self, lease_id: str):
        """Serialize every write to one lease (manual send vs auto-send, double taps)."""
        with self._locks_guard:
            lock = self._lease_locks.setdefault(lease_id, threading.Lock())
        with lock:
            yield
