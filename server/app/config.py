"""Server settings. Secrets come from the repo-root .env (never logged); public values from shared/."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
SERVER_DIR = REPO_ROOT / "server"

load_dotenv(REPO_ROOT / ".env")

TENANT_ID = "tenant_demo"
LANDLORD_ID = "landlord_demo"
LANDLORD_NAME = "Jane Doe"
PERSONAS = {TENANT_ID, LANDLORD_ID}

DEMO_SCALE = 100  # D-002: testnet amounts are 1:100 of real ones
CENTS_TO_UNITS = 10**4  # USDC has 6 decimals; 1 cent = 10_000 base units (D-003)
REVIEW_HOURS = 48  # D-004
MAX_ANALYZE_ATTEMPTS = 3
MAX_DEPOSIT_CENTS = 10_000  # $100 testnet cap: one request can't lock the tenant wallet's whole balance
MAX_PHOTO_BYTES = 25 * 1024 * 1024  # matches integrations/vision MAX_IMAGE_BYTES
SIMULATED_APY = 0.04  # D-001: interest is simulated, labeled so in the UI

# Default shot list: 5 shots, one per vision test pair (D-005, docs/API.md).
DEFAULT_SHOT_LIST = [
    {"shot_id": "s1", "room": "living room", "label": "Wall behind couch"},
    {"shot_id": "s2", "room": "living room", "label": "Carpet, toward window"},
    {"shot_id": "s3", "room": "bedroom", "label": "Wall by the closet"},
    {"shot_id": "s4", "room": "bedroom", "label": "Wall above the bed"},
    {"shot_id": "s5", "room": "kitchen", "label": "Counter and backsplash"},
]


@dataclass
class Settings:
    rpc_url: str
    chain_id: int
    explorer: str
    escrow_address: str
    usdc_address: str
    arbiter_address: str
    data_dir: Path
    price_table_path: Path
    cors_origins: list[str] = field(default_factory=list)
    autosend: bool = True
    demo_token: str | None = None  # when set, every write needs X-Demo-Token equal to it
    max_leases_per_day: int = 0  # 0 = no cap
    max_reports_per_day: int = 0
    max_deposit_cents: int = MAX_DEPOSIT_CENTS

    def explorer_tx(self, tx_hash: str) -> str:
        return f"{self.explorer}/tx/{tx_hash}"


def _is_local(origin: str) -> bool:
    host = urlparse(origin).hostname or ""
    return host in ("localhost", "127.0.0.1")


def check_not_open(s: Settings, allow_open: bool, hosted: bool = False) -> None:
    """Fail closed: a hosted server, or one that allows a non-local browser origin, must have a demo token."""
    public = [o for o in s.cors_origins if not _is_local(o)]
    if (public or hosted) and not s.demo_token and not allow_open:
        why = f"DK_CORS_ORIGINS allows {public}" if public else "the server is running on Render (RENDER_EXTERNAL_URL is set)"
        raise RuntimeError(f"DK_DEMO_TOKEN is not set but {why}; "
                           "set the token (or DK_ALLOW_OPEN=1 to run open on purpose)")


def load_settings() -> Settings:
    s = _load()
    check_not_open(s, os.environ.get("DK_ALLOW_OPEN") == "1", hosted=bool(os.environ.get("RENDER_EXTERNAL_URL") or os.environ.get("RENDER")))
    return s


def _load() -> Settings:
    addrs = json.loads((REPO_ROOT / "shared" / "addresses.json").read_text())["arc_testnet"]
    return Settings(
        rpc_url=os.environ.get("ARC_RPC_URL", "https://rpc.testnet.arc.io"),
        chain_id=int(addrs["chain_id"]),
        explorer=addrs["explorer"].rstrip("/"),
        escrow_address=addrs["DepositEscrow"],
        usdc_address=addrs["usdc"],
        arbiter_address=addrs["demo_wallets"]["arbiter"],
        data_dir=Path(os.environ.get("DK_DATA_DIR", SERVER_DIR / "data")),
        price_table_path=REPO_ROOT / "integrations" / "vision" / "price_table.json",
        cors_origins=[o.strip() for o in os.environ.get("DK_CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
        autosend=os.environ.get("DK_AUTOSEND", "1") != "0",
        demo_token=os.environ.get("DK_DEMO_TOKEN") or None,
        max_leases_per_day=int(os.environ.get("DK_MAX_LEASES_PER_DAY", "20")),
        max_reports_per_day=int(os.environ.get("DK_MAX_REPORTS_PER_DAY", "20")),
        max_deposit_cents=int(os.environ.get("DK_MAX_DEPOSIT_CENTS", str(MAX_DEPOSIT_CENTS))),
    )
