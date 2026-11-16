"""Live run of the demo path through the HTTP API, on Arc testnet. Start the server first:
    uv run --project server uvicorn server.app.main:app
Then:
    uv run --project server python server/scripts/smoke.py                 # chain only: stops after move-out commit
    uv run --project server python server/scripts/smoke.py --photos ~/vision-test   # full run incl. real analyze()
--photos expects p1..p5 _before/_after .jpg|.png (Luka's test pairs). Default deposit is $1 (100 cents) to save USDC.
"""
from __future__ import annotations

import argparse
import io
import sys
import time
from pathlib import Path

import httpx
from PIL import Image

T = {"X-User-Id": "tenant_demo"}
L = {"X-User-Id": "landlord_demo"}


def ok(r: httpx.Response) -> dict:
    if r.status_code >= 300:
        sys.exit(f"FAIL {r.request.method} {r.request.url.path} → {r.status_code} {r.text}")
    return r.json()


def proof(step: str, body: dict):
    print(f"  {step:<22} {body.get('tx', {}).get('explorer_url', '')}")


def placeholder_jpg(color) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color).save(buf, "JPEG")
    return buf.getvalue()


def find(photos: Path, pair: str, side: str) -> Path:
    for ext in ("jpg", "jpeg", "JPG", "png", "PNG"):
        p = photos / f"{pair}_{side}.{ext}"
        if p.exists():
            return p
    sys.exit(f"missing {pair}_{side}.jpg|png in {photos}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8000")
    ap.add_argument("--deposit-cents", type=int, default=100)
    ap.add_argument("--photos", type=Path)
    a = ap.parse_args()
    c = httpx.Client(base_url=a.base, timeout=120)

    print("health:", ok(c.get("/health")))
    lease = ok(c.post("/leases", headers=L, json={
        "address": "1234 W 30th St, Apt 4, Los Angeles, CA", "tenant_name": "Alex Kim",
        "deposit_cents": a.deposit_cents, "move_in_date": "2026-08-15"}))
    lid = lease["lease_id"]
    print(f"lease {lid}")
    proof("createLease", lease)
    proof("deposit", ok(c.post(f"/leases/{lid}/deposit", headers=T)))

    shots = [s["shot_id"] for s in lease["shot_list"]]
    for phase, side in (("in", "before"), ("out", "after")):
        for i, sid in enumerate(shots, 1):
            if a.photos:
                p = find(a.photos.expanduser(), f"p{i}", side)
                data, name = p.read_bytes(), p.name
            else:
                data, name = placeholder_jpg((i * 40, 100, 200 if phase == "in" else 120)), f"{sid}.jpg"
            ok(c.put(f"/leases/{lid}/photos/{phase}/{sid}", headers=T, files={"file": (name, data)}))
        proof(f"commitPhotos({phase})", ok(c.post(f"/leases/{lid}/photos/{phase}/commit", headers=T)))

    if not a.photos:
        print("no --photos: stopping before the AI report (placeholder photos would waste an API call)")
        return

    ok(c.post(f"/leases/{lid}/report", headers=L))
    t0 = time.time()
    while True:
        g = ok(c.get(f"/leases/{lid}"))
        if g["status"] != "analyzing":
            break
        print(f"  analyzing… {g['progress']}")
        time.sleep(3)
    print(f"  report in {time.time() - t0:.0f}s: status {g['status']}")
    if g["status"] != "report_draft":
        sys.exit(f"FAIL report: {g['report']}")
    for f in g["report"]["findings"]:
        print(f"    {f['id']} {f['category']:<12} {f['cost_cents']:>4}¢ {f['confidence']:.2f} {f['description'][:60]}")
    print(f"    total deduction {g['report']['total_deduction_cents']}¢")

    sent = ok(c.post(f"/leases/{lid}/report/send", headers=L, json={}))
    proof(f"propose (tenant +{sent['paid_to_tenant_cents']}¢)", sent)
    if sent["status"] == "proposed":
        acc = ok(c.post(f"/leases/{lid}/accept", headers=T))
        proof(f"accept (landlord +{acc['paid_to_landlord_cents']}¢)", acc)
    g = ok(c.get(f"/leases/{lid}"))
    print(f"final: {g['status']}, escrow {g['escrow_balance_cents']}¢, payout {g['payout']}, "
          f"simulated interest {g['simulated_interest_cents']}¢")


if __name__ == "__main__":
    main()
