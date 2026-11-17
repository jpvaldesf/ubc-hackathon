"""Per-day caps on the calls that spend money (testnet gas, USDC, Anthropic credits).

Counts live in <data_dir>/quota.json keyed by UTC date, so a server restart doesn't reset them.
"""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path

from .errors import ApiError


class DailyQuota:
    def __init__(self, data_dir: Path, limits: dict[str, int]):
        self.path = Path(data_dir) / "quota.json"
        self.limits = limits
        self._lock = threading.Lock()

    def take(self, kind: str) -> None:
        """Count one `kind` call for today, or raise 429 if today's cap is used up."""
        limit = self.limits.get(kind, 0)
        if limit <= 0:  # 0 = no cap
            return
        today = datetime.now(timezone.utc).date().isoformat()
        with self._lock:
            try:
                data = json.loads(self.path.read_text())
            except (FileNotFoundError, ValueError):
                data = {}
            counts = data.get(today, {})
            if counts.get(kind, 0) >= limit:
                raise ApiError(429, "rate_limited", f"Daily demo limit reached ({limit} {kind} per day); try again tomorrow")
            counts[kind] = counts.get(kind, 0) + 1
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps({today: counts}))  # keep only today
            tmp.replace(self.path)
