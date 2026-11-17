"""Live run of the demo path through the HTTP API, on Arc testnet. Start the server first:
    uv run --project server uvicorn server.app.main:app
Then:
    uv run --project server python server/scripts/smoke.py                 # chain only: stops after move-out commit
    uv run --project server python server/scripts/smoke.py --photos ~/vision-test   # full run incl. real analyze()
--photos expects pN_before/_after .jpg|.png (Luka's test pairs). Default deposit is $1 (100 cents) to save USDC.

Demo set (the video run: $10, one damage + one normal-wear pair, stops at the report draft for the app):
    uv run --project server python -m server.scripts.smoke --photos ~/vision-test --demo
Prints the lease id; open /leases/<id> in the app (live mode) as the landlord to review and send.

Demo reset / hybrid demo (step 1 scripted, the app takes over at the photos):
    uv run --project server python -m server.scripts.smoke --demo --stop-at funded     # fresh $10 lease, deposit paid
    uv run --project server python -m server.scripts.smoke --demo --photos ~/vision-test --stop-at move_in
--stop-at funded needs no photos. move_in also commits the move-in photos, so the app starts at move-out.
"""
from __future__ import annotations

import argparse
import os
import io
import sys
import time
from pathlib import Path

import httpx
from PIL import Image

# Demo shot list: which photo pair backs each shot, with a label the AI reads as context.
# Labels for p1/p2/p5 are generic until Luka confirms what each shot shows.
DEMO_SHOTS = [
    ("p1", {"shot_id": "s1", "room": "living room", "label": "Living room wall, wide shot"}),
    ("p2", {"shot_id": "s2", "room": "living room", "label": "Living room floor and wall"}),
    ("p3", {"shot_id": "s3", "room": "living room", "label": "White brick wall below the light switch"}),
    ("p5", {"shot_id": "s4", "room": "bedroom", "label": "Bedroom corner (lamp on/off)"}),
    ("p7", {"shot_id": "s5", "room": "bedroom", "label": "Wall above the bed (picture hooks)"}),
]

T = {"X-User-Id": "tenant_demo"}
L = {"X-User-Id": "landlord_demo"}


def ok(r: httpx.Response) -> dict:
    if r.status_code >= 300:
        sys.exit(f"FAIL {r.request.method} {r.request.url.path} → {r.status_code} {r.text}")
    return r.json()


def proof(step: str, body: dict):
    print(f"  {step:<22} {body.get('tx', {}).get('explorer_url', '')}")


def stopped(lid: str, what: str):
    print(f"\nstopped: {what}. Open /leases/{lid} in the app (live mode).")
    print(f"lease id: {lid}")


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
    ap.add_argument("--demo", action="store_true", help="demo set: $10, pairs p1 p2 p3 p5 p7, stop at the draft")
    ap.add_argument("--stop-at", choices=["funded", "move_in", "draft", "end"], default=None)
    a = ap.parse_args()
    if a.demo:
        if not a.photos and a.stop_at != "funded":
            sys.exit("--demo needs --photos (unless --stop-at funded)")
        if a.deposit_cents == 100:
            a.deposit_cents = 1000
        a.stop_at = a.stop_at or "draft"
    pair_for = {}
    token = os.environ.get("DK_DEMO_TOKEN")  # hosted server: same value as the host secret
    c = httpx.Client(base_url=a.base, timeout=120, headers={"X-Demo-Token": token} if token else {})

    print("health:", ok(c.get("/health")))
    lease = ok(c.post("/leases", headers=L, json={
        "address": "1234 W 30th St, Apt 4, Los Angeles, CA", "tenant_name": "Alex Kim",
        "deposit_cents": a.deposit_cents, "move_in_date": "2026-08-15",
        **({"shot_list": [sh for _, sh in DEMO_SHOTS]} if a.demo else {})}))
    if a.demo:
        pair_for = {sh["shot_id"]: pair for pair, sh in DEMO_SHOTS}
    lid = lease["lease_id"]
    print(f"lease {lid}")
    proof("createLease", lease)
    proof("deposit", ok(c.post(f"/leases/{lid}/deposit", headers=T)))
    if a.stop_at == "funded":
        stopped(lid, "deposit paid; move-in photos are next (tenant)")
        return

    shots = [s["shot_id"] for s in lease["shot_list"]]
    for phase, side in (("in", "before"), ("out", "after")):
        for i, sid in enumerate(shots, 1):
            if a.photos:
                p = find(a.photos.expanduser(), pair_for.get(sid, f"p{i}"), side)
                data, name = p.read_bytes(), p.name
            else:
                data, name = placeholder_jpg((i * 40, 100, 200 if phase == "in" else 120)), f"{sid}.jpg"
            ok(c.put(f"/leases/{lid}/photos/{phase}/{sid}", headers=T, files={"file": (name, data)}))
        proof(f"commitPhotos({phase})", ok(c.post(f"/leases/{lid}/photos/{phase}/commit", headers=T)))
        if phase == "in" and a.stop_at == "move_in":
            stopped(lid, "move-in photos recorded; move-out photos are next")
            return

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
    if a.stop_at == "draft":
        print(f"\nstopped at the draft. Open /leases/{lid} in the app (live mode) as the landlord to review and send.")
        print(f"lease id: {lid}")
        return

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
