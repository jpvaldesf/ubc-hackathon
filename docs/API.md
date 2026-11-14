# Backend API (agreed at the team sync; change only with /decide)

**Status: DRAFT by Pablo, Sat Nov 14, for the 1 PM sync. Not frozen yet.**

FastAPI server in `server/`. JSON everywhere except photo upload (multipart).
Base URL: `http://localhost:8000` in dev; hosted URL added Mon.

## Summary

| Method | Path | Who calls it | Onchain call | Owner |
|---|---|---|---|---|
| POST | `/leases` | Landlord | `createLease` | Pablo |
| POST | `/leases/{id}/deposit` | Tenant | `approve` + `deposit` | Pablo |
| POST | `/leases/{id}/photos?phase=in\|out` | Tenant or landlord | `commitPhotos` | Pablo |
| POST | `/leases/{id}/report` | Landlord | `proposeDeductions` (when analysis finishes) | Pablo (calls Luka's `analyze()`) |
| POST | `/leases/{id}/accept` | Tenant | `accept` | Pablo |
| POST | `/leases/{id}/appeal` | Tenant | `appeal` | Pablo |
| GET | `/leases/{id}` | Both | none (reads) | Pablo |

The arbiter ruling (`resolve`) runs from a script, not the API (PLAN.md, "What we cut"). `GET /leases/{id}` shows the result.

## Conventions

- **Who's calling.** Demo-grade identity: header `X-User-Id: tenant_demo | landlord_demo`. It matches Marcus's persona switch. There's no real auth in v1; the README says so.
- **Money.** Amounts are whole US dollars as integers (`amount_usd: 1000`), the same as `cost_usd` in the findings schema. The server converts them to USDC base units. Decimals come from arc-docs and never from the client.
- **Proof.** Every response that wrote onchain includes a `tx` object. Marcus shows `tx.explorer_url` as a small "Proof" link and never shows the hash.
  ```json
  "tx": { "hash": "0xabc…", "explorer_url": "https://<arc-testnet-explorer>/tx/0xabc…" }
  ```
- **Writes wait for the tx.** A write returns after the tx is mined, so `tx` is always final. Exception: `/report`, which is async (see below).
- **Errors.** Always this shape:
  ```json
  { "error": { "code": "wrong_state", "message": "Lease is not funded yet" } }
  ```
  | HTTP | code | When |
  |---|---|---|
  | 400 | `bad_request` | Missing or invalid field |
  | 403 | `not_allowed` | Wrong persona (e.g. the landlord calls `/accept`) |
  | 404 | `not_found` | Unknown lease |
  | 409 | `wrong_state` | Step out of order (see the state machine) |
  | 502 | `chain_error` | Tx reverted or RPC failed; `message` says which |
  | 502 | `vision_error` | `analyze()` failed after its retry |

## Lease state machine

```
created → funded → move_in_recorded → move_out_uploaded → analyzing → proposed ─┬→ settled
                                                                                └→ appealed → resolved
```
- `proposed`: the undisputed amount has already gone to the tenant.
- `settled`: the tenant accepted, and the deduction went to the landlord.
- `resolved`: the arbiter split the deduction.

---

## POST /leases
Landlord creates a lease. The server calls `createLease(tenant, landlord, arbiter, amount)`. The arbiter is a fixed server-side address in v1.

Request:
```json
{
  "address": "1234 W 30th St, Apt 4, Los Angeles, CA",
  "tenant_name": "Alex Kim",
  "tenant_id": "tenant_demo",
  "deposit_usd": 1000,
  "move_in_date": "2026-08-15",
  "shot_list": [
    { "shot_id": "s1", "room": "living room", "label": "Carpet, toward window" },
    { "shot_id": "s2", "room": "living room", "label": "Wall behind couch" },
    { "shot_id": "s3", "room": "bedroom", "label": "Closet door" }
  ]
}
```
`shot_list` is optional. Leave it out to get the default demo list (5 shots matching Luka's test pairs).

Response `201`: the full lease object (same shape as `GET /leases/{id}`) with `status: "created"` and `tx`.

## POST /leases/{id}/deposit
Tenant pays the deposit into escrow. The server sends `approve` + `deposit` from the tenant's wallet (server-held testnet key; Circle wallet if the spike lands).

Request: `{}` (the amount is fixed by the lease).

Response `200`:
```json
{
  "lease_id": "l_7f3a",
  "status": "funded",
  "escrow_balance_usd": 1000,
  "tx": { "hash": "0x…", "explorer_url": "https://…/tx/0x…" }
}
```
`409 wrong_state` if the lease is not `created`.

## POST /leases/{id}/photos?phase=in|out
Upload the photos for one phase. The request is multipart with one part per shot. The server stores the files locally and computes SHA-256 per photo. It then builds a manifest (shot_id → hash, sorted by shot_id), hashes it, and calls `commitPhotos(phase, manifestHash)`.

Request (multipart/form-data):
```
s1=@living_carpet.jpg
s2=@living_wall.jpg
s3=@bedroom_closet.jpg
```
The field name is the `shot_id`. Every shot in the lease's `shot_list` is required: `400 bad_request` lists any that are missing.

Response `200`:
```json
{
  "lease_id": "l_7f3a",
  "phase": "in",
  "status": "move_in_recorded",
  "photos": [
    { "photo_id": "p_in_s1", "shot_id": "s1", "url": "/files/l_7f3a/in/s1.jpg", "sha256": "9f2c…" }
  ],
  "manifest_hash": "0x5b1e…",
  "tx": { "hash": "0x…", "explorer_url": "https://…/tx/0x…" }
}
```
Photo ids are `p_{phase}_{shot_id}`, so a pair is always `p_in_sX` / `p_out_sX`. Luka's `before_photo` / `after_photo` use these ids.
`phase=in` requires `funded`; `phase=out` requires `move_in_recorded` and moves the lease to `move_out_uploaded`.

## POST /leases/{id}/report
Landlord starts the AI comparison. Vision takes 20–60 s, so the call returns immediately. Poll `GET /leases/{id}` every 2 s.

Request: `{}`

Response `202`:
```json
{ "lease_id": "l_7f3a", "status": "analyzing", "progress": { "shots_done": 0, "shots_total": 5, "current_room": "living room" } }
```

When analysis finishes, the server:
1. Stores the findings JSON exactly as Luka's `analyze()` returns it (schema in PLAN.md, "AI findings JSON").
2. Computes `report_hash` = SHA-256 of the canonical JSON (sorted keys, no whitespace).
3. Calls `proposeDeductions(total_deduction_usd, report_hash)`, which pays `deposit − deduction` to the tenant in the same tx.
4. Sets `status: "proposed"`.

If the vision call fails, the status goes back to `move_out_uploaded`, and `report.error` holds a message, so the landlord can retry.

## POST /leases/{id}/accept
Tenant accepts the deductions. The server calls `accept()`, and the deduction goes to the landlord.

Request: `{}`
Response `200`: `{ "lease_id", "status": "settled", "paid_to_landlord_usd": 120, "tx": {…} }`
`403` for the landlord, `409` unless `proposed`.

## POST /leases/{id}/appeal
Tenant disputes. The server calls `appeal()`, and the deduction stays in escrow until the arbiter resolves it.

Request (reason is optional, stored offchain only):
```json
{ "finding_ids": ["f1"], "reason": "That stain was there at move-in" }
```
Response `200`: `{ "lease_id", "status": "appealed", "appeal_deadline": "2026-11-21T18:00:00Z", "tx": {…} }`
The UI shows "Sent to a neutral reviewer".

## GET /leases/{id}
Everything a screen needs, including the payout timeline. Fields are `null` until reached.

```json
{
  "lease_id": "l_7f3a",
  "status": "proposed",
  "address": "1234 W 30th St, Apt 4, Los Angeles, CA",
  "tenant": { "id": "tenant_demo", "name": "Alex Kim" },
  "landlord": { "id": "landlord_demo", "name": "Sunrise Properties" },
  "deposit_usd": 1000,
  "escrow_balance_usd": 120,
  "simulated_interest_usd": 3.42,
  "shot_list": [ { "shot_id": "s1", "room": "living room", "label": "Carpet, toward window" } ],
  "photos": {
    "in":  [ { "photo_id": "p_in_s1",  "shot_id": "s1", "url": "/files/l_7f3a/in/s1.jpg",  "sha256": "…" } ],
    "out": [ { "photo_id": "p_out_s1", "shot_id": "s1", "url": "/files/l_7f3a/out/s1.jpg", "sha256": "…" } ]
  },
  "progress": null,
  "report": {
    "report_id": "r_123",
    "report_hash": "0x…",
    "findings": [ { "id": "f1", "room": "living room", "item": "carpet", "before_photo": "p_in_s1", "after_photo": "p_out_s1",
                    "region": [0.42, 0.61, 0.18, 0.12], "category": "damage",
                    "description": "Dark stain about 20 cm wide, not visible at move-in",
                    "confidence": 0.91, "price_key": "carpet_spot_clean", "cost_usd": 120 } ],
    "dropped_low_confidence": 1,
    "total_deduction_usd": 120,
    "error": null
  },
  "payout": { "to_tenant_usd": 880, "to_landlord_usd": null, "pending_usd": 120 },
  "timeline": [
    { "step": "created",          "at": "2026-11-14T20:01:00Z", "label": "Lease created",            "tx": { "hash": "…", "explorer_url": "…" } },
    { "step": "funded",           "at": "2026-11-14T20:02:10Z", "label": "$1,000 held in escrow",     "tx": { "…": "…" } },
    { "step": "move_in_recorded", "at": "2026-11-14T20:05:30Z", "label": "Move-in photos recorded",   "tx": { "…": "…" } },
    { "step": "proposed",         "at": "2026-11-14T20:11:02Z", "label": "$880 sent to you",          "tx": { "…": "…" } }
  ]
}
```
- `simulated_interest_usd` is computed offchain and labeled "simulated" in the UI (D-001: USYC is institution-only).
- `region` is `[x, y, w, h]` as fractions of the after photo, so Marcus can outline it at any size.
- Photos are served at `GET /files/...`. This is a static mount, not a separate endpoint.

---

## Open questions for the 1 PM sync
1. **Who triggers `proposeDeductions`?** This draft proposes automatically when analysis finishes. The alternative is for the landlord to review the draft and press "Send report", which is fairer and adds one endpoint and one screen. Recommendation: auto in the demo, mention the review in the pitch.
2. **Appeal window length.** This is a contract constant: 7 days for real, but the demo needs a short window or none. Recommendation: set it at deploy, 7 days, and the arbiter script ignores it on testnet.
3. **Lease id format.** `l_` + 4 hex chars offchain, mapped to the onchain lease index. Okay?
4. **Photo upload all at once vs one shot at a time.** All at once makes one tx per phase. Marcus's per-shot inputs can still collect locally and submit together.
5. **Vision call contract with Luka:** `analyze(pairs: list[{shot_id, room, label, before_path, after_path}], price_table: dict) -> dict` in the findings schema, plus a progress callback `on_progress(shots_done, current_room)` if cheap.
