"""Show demo wallet balances; optionally move testnet USDC landlord → tenant so rehearsals can keep depositing.
    uv run --project server python server/scripts/topup.py              # balances only
    uv run --project server python server/scripts/topup.py --cents 500  # send $5 landlord → tenant
"""
from __future__ import annotations

import argparse

from server.app.chain import Chain
from server.app.config import load_settings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cents", type=int, default=0)
    a = ap.parse_args()
    s = load_settings()
    ch = Chain(s)
    who = {"landlord": ch.address("landlord"), "tenant": ch.address("tenant"), "escrow": ch.escrow.address}
    if a.cents > 0:
        tx, _ = ch._send("landlord", ch.usdc.functions.transfer(who["tenant"], a.cents * 10**4))
        print("transfer:", tx["explorer_url"])
    for name, addr in who.items():
        print(f"{name:<9} {addr} {ch.usdc.functions.balanceOf(addr).call() / 1e6:>8.2f} USDC")


if __name__ == "__main__":
    main()
