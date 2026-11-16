"""Server settings. Secrets come from the repo-root .env (never logged); public values from shared/."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
SERVER_DIR = REPO_ROOT / "server"

load_dotenv(REPO_ROOT / ".env")

TENANT_ID = "tenant_demo"
LANDLORD_ID = "landlord_demo"
LANDLORD_NAME = "Sunrise Properties"
PERSONAS = {TENANT_ID, LANDLORD_ID}

DEMO_SCALE = 100  # D-002: testnet amounts are 1:100 of real ones
CENTS_TO_UNITS = 10**4  # USDC has 6 decimals; 1 cent = 10_000 base units (D-003)
REVIEW_HOURS = 48  # D-004
MAX_ANALYZE_ATTEMPTS = 3
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

    def explorer_tx(self, tx_hash: str) -> str:
        return f"{self.explorer}/tx/{tx_hash}"


def load_settings() -> Settings:
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
        cors_origins=[o for o in os.environ.get("DK_CORS_ORIGINS", "http://localhost:3000").split(",") if o],
        autosend=os.environ.get("DK_AUTOSEND", "1") != "0",
    )
