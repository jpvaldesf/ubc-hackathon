# Backend API (agreed at the team sync; change only with /decide)

**Status: FROZEN Sat Nov 14, 2:30 PM (D-002 to D-007). Changes need a new /decide entry.**

FastAPI server in `server/`. JSON everywhere except photo upload (multipart, one shot per request).
Base URL: `http://localhost:8000` in dev; hosted URL added Mon.

## Summary

| Method | Path | Who calls it | Onchain call | Owner |
|---|---|---|---|---|
| POST | `/leases` | Landlord | `createLease` | Pablo |
| POST | `/leases/{id}/deposit` | Tenant | `approve` + `deposit` | Pablo |
| PUT | `/leases/{id}/photos/{phase}/{shot_id}` | Tenant or landlord | none (stored + hashed) | Pablo |
| POST | `/leases/{id}/photos/{phase}/commit` | Tenant or landlord | `commitPhotos` | Pablo |
| POST | `/leases/{id}/report` | Landlord | none (AI drafts the report) | Pablo (calls Luka's `analyze()`) |
| POST | `/leases/{id}/report/send` | Landlord, or the server after 48 h | `proposeDeductions` | Pablo |
| POST | `/leases/{id}/accept` | Tenant | `accept` | Pablo |
| POST | `/leases/{id}/appeal` | Tenant | `appeal` | Pablo |
| GET | `/leases/{id}` | Both | none (reads) | Pablo |

The arbiter ruling (`resolve`) and the timeout functions (`finalize`, `reclaim`, `expireAppeal`) run from scripts, not the API. `GET /leases/{id}` shows the result.

## Conventions

- **Who's calling.** Demo-grade identity: header `X-User-Id: tenant_demo | landlord_demo`. It matches Marcus's persona switch. There's no real auth in v1; the README says so.
- **Money is integer cents** (D-003): `deposit_cents: 1000` = $10.00. The findings schema uses `cost_cents` too. The server converts cents to USDC base units (×10⁴, 6 decimals); the client never sees base units.
- **Demo scale** (D-002): the demo lease is $10 (1:100 of a $1,000 deposit, because the testnet faucet caps at 20 USDC). `GET /leases/{id}` returns `demo_scale: 100` so the UI can show the note "Testnet demo: amounts scaled 1:100". The UI shows the real onchain cents; it never multiplies them.
- **Proof.** Every response that wrote onchain includes a `tx` object. Marcus shows `tx.explorer_url` as a small "Proof" link and never shows the hash.
  ```json
  "tx": { "hash": "0xabc…", "explorer_url": "https://explorer.testnet.arc.io/tx/0xabc…" }
  ```
- **Writes wait for the tx.** Arc finalizes in under a second, so a write returns after the tx is mined, and `tx` is always final. Exception: `/report`, which is async (see below).
- **Errors.** Always this shape:
  ```json
  { "error": { "code": "wrong_state", "message": "Lease is not funded yet" } }
  ```
  | HTTP | code | When |
  |---|---|---|
  | 400 | `bad_request` | Missing or invalid field |
  | 403 | `not_allowed` | Wrong persona (e.g. the landlord calls `/accept`) |
  | 404 | `not_found` | Unknown lease or shot |
  | 409 | `wrong_state` | Step out of order (see the state machine) |
  | 502 | `chain_error` | Tx reverted or RPC failed; `message` says which |
  | 502 | `vision_error` | `analyze()` failed after its retry |

## Lease state machine

```
created → funded → move_in_recorded → move_out_recorded → analyzing → report_draft → proposed ─┬→ settled
                                                                                               └→ appealed → resolved
```
- `report_draft`: the AI report exists offchain. The landlord has 48 h to review and send it; after that the server sends it as drafted (D-004).
- `proposed`: the undisputed amount has already gone to the tenant.
- `settled`: the tenant accepted (or the appeal window passed), and the deduction went to the landlord.
- `resolved`: the arbiter split the deduction (or missed the deadline, so it went back to the tenant).

---

## POST /leases
Landlord creates a lease. The server calls `createLease(tenant, arbiter, amount)` signed by the landlord's wallet. The arbiter is a fixed server-side address in v1.

Request:
```json
{
  "address": "1234 W 30th St, Apt 4, Los Angeles, CA",
  "tenant_name": "Alex Kim",
  "tenant_id": "tenant_demo",
  "deposit_cents": 1000,
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
Tenant pays the deposit into escrow. The server sends `approve` + `deposit` from the tenant's wallet (server-held testnet key; Circle wallet if the spike lands, D-007).

Request: `{}` (the amount is fixed by the lease).

Response `200`:
```json
{
  "lease_id": "l_7f3a",
  "status": "funded",
  "escrow_balance_cents": 1000,
  "tx": { "hash": "0x…", "explorer_url": "https://explorer.testnet.arc.io/tx/0x…" }
}
```
`409 wrong_state` if the lease is not `created`.

## PUT /leases/{id}/photos/{phase}/{shot_id}
Upload one photo (D-005). `phase` is `in` or `out`. The request is multipart with a single field, `file`. Uploading the same shot again before commit replaces it (retakes are free). Nothing goes onchain yet.

Response `200`:
```json
{
  "photo_id": "p_in_s1",
  "shot_id": "s1",
  "phase": "in",
  "url": "/files/l_7f3a/in/s1.jpg",
  "sha256": "9f2c…",
  "shots_uploaded": 3,
  "shots_total": 5
}
```
Photo ids are `p_{phase}_{shot_id}`, so a pair is always `p_in_sX` / `p_out_sX`. Luka's `before_photo` / `after_photo` use these ids.
`phase=in` requires `funded`; `phase=out` requires `move_in_recorded`. A `shot_id` not in the lease's `shot_list` gets `404`.

## POST /leases/{id}/photos/{phase}/commit
The "Done" button for a phase. The server builds the manifest (`shot_id → sha256`, sorted by `shot_id`), hashes it, and calls `commitPhotos(phase, manifestHash)`. After this, the phase's photos are locked.

Request: `{}`
Response `200`:
```json
{
  "lease_id": "l_7f3a",
  "phase": "in",
  "status": "move_in_recorded",
  "manifest_hash": "0x5b1e…",
  "tx": { "hash": "0x…", "explorer_url": "https://…/tx/0x…" }
}
```
`400 bad_request` lists any shots still missing. `phase=out` moves the lease to `move_out_recorded`.

## POST /leases/{id}/report
Landlord starts the AI comparison. Vision takes 20–60 s, so the call returns immediately. Poll `GET /leases/{id}` every 2 s.

Request: `{}`

Response `202`:
```json
{ "lease_id": "l_7f3a", "status": "analyzing", "progress": { "shots_done": 0, "shots_total": 5, "current_room": "living room" } }
```

When analysis finishes, the server stores the findings JSON exactly as Luka's `analyze()` returns it, sets `status: "report_draft"`, and sets `report.auto_send_at` = now + 48 h. If the vision call fails, the status goes back to `move_out_recorded`, and `report.error` holds a message, so the landlord can retry.

## POST /leases/{id}/report/send
Landlord reviews the draft and sends it (D-004). The landlord **can only lower or remove deductions**, never add findings or raise a cost: the AI draft plus the fixed price table is the ceiling.

Request (both fields optional; `{}` sends the draft as is):
```json
{
  "remove_finding_ids": ["f2"],
  "lower_costs": { "f1": 80 }
}
```
The server then:
1. Applies the edits and recomputes `total_deduction_cents`. Each edited finding keeps `edited_by_landlord: true` and its `original_cost_cents`.
2. Computes `report_hash` = SHA-256 of the canonical final JSON (sorted keys, no whitespace).
3. Calls `proposeDeductions(total, report_hash)`, which pays `deposit − deduction` to the tenant in the same tx.
4. Sets `status: "proposed"`.

If the landlord hasn't sent it by `auto_send_at`, the server does the same with no edits. In the demo, the landlord taps "Send report".

Response `200`: `{ "lease_id", "status": "proposed", "paid_to_tenant_cents": 880, "deduction_cents": 120, "tx": {…} }`
`400` if an edit raises a cost; `409` unless `report_draft`.

## POST /leases/{id}/accept
Tenant accepts the deductions. The server calls `accept()`, and the deduction goes to the landlord.

Request: `{}`
Response `200`: `{ "lease_id", "status": "settled", "paid_to_landlord_cents": 120, "tx": {…} }`
`403` for the landlord, `409` unless `proposed`.

## POST /leases/{id}/appeal
Tenant disputes within the 7-day window (D-006). The server calls `appeal()`, and the deduction stays in escrow until the arbiter resolves it.

Request (reason is optional, stored offchain only):
```json
{ "finding_ids": ["f1"], "reason": "That stain was there at move-in" }
```
Response `200`: `{ "lease_id", "status": "appealed", "tx": {…} }`
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
  "deposit_cents": 1000,
  "demo_scale": 100,
  "escrow_balance_cents": 120,
  "simulated_interest_cents": 3,
  "appeal_deadline": "2026-11-21T20:11:02Z",
  "shot_list": [ { "shot_id": "s1", "room": "living room", "label": "Carpet, toward window" } ],
  "photos": {
    "in":  [ { "photo_id": "p_in_s1",  "shot_id": "s1", "url": "/files/l_7f3a/in/s1.jpg",  "sha256": "…" } ],
    "out": [ { "photo_id": "p_out_s1", "shot_id": "s1", "url": "/files/l_7f3a/out/s1.jpg", "sha256": "…" } ]
  },
  "progress": null,
  "report": {
    "report_id": "r_123",
    "report_hash": "0x…",
    "auto_send_at": "2026-11-16T20:10:40Z",
    "sent_by": "landlord",
    "findings": [ { "id": "f1", "room": "living room", "item": "carpet", "before_photo": "p_in_s1", "after_photo": "p_out_s1",
                    "region": [0.42, 0.61, 0.18, 0.12], "category": "damage",
                    "description": "Dark stain about 20 cm wide, not visible at move-in",
                    "confidence": 0.91, "price_key": "carpet_spot_clean", "cost_cents": 120,
                    "edited_by_landlord": false, "original_cost_cents": 120 } ],
    "dropped_low_confidence": 1,
    "total_deduction_cents": 120,
    "error": null
  },
  "payout": { "to_tenant_cents": 880, "to_landlord_cents": null, "pending_cents": 120 },
  "timeline": [
    { "step": "created",          "at": "2026-11-14T20:01:00Z", "label": "Lease created",            "tx": { "hash": "…", "explorer_url": "…" } },
    { "step": "funded",           "at": "2026-11-14T20:02:10Z", "label": "$10.00 held in escrow",     "tx": { "…": "…" } },
    { "step": "move_in_recorded", "at": "2026-11-14T20:05:30Z", "label": "Move-in photos recorded",   "tx": { "…": "…" } },
    { "step": "proposed",         "at": "2026-11-14T20:11:02Z", "label": "$8.80 sent to you",         "tx": { "…": "…" } }
  ]
}
```
- `simulated_interest_cents` is computed offchain and labeled "simulated" in the UI (D-001: USYC is institution-only).
- `region` is `[x, y, w, h]` as fractions of the after photo, so Marcus can outline it at any size.
- `sent_by` is `landlord` or `auto` (48 h passed).
- Photos are served at `GET /files/...`. This is a static mount, not a separate endpoint.

## Vision contract with Luka (D-005)
```python
analyze(
    pairs: list[dict],          # [{shot_id, room, label, before_path, after_path}]
    price_table: dict,          # price_key -> cents
    on_progress: Callable[[int, str], None] | None = None,  # (shots_done, current_room)
) -> dict                       # findings JSON (PLAN.md schema, with cost_cents)
```
