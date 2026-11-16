# Deposit Keeper server

FastAPI server for the frozen API in [`docs/API.md`](../docs/API.md). It signs Arc testnet txs with server-held
testnet keys (D-007) and runs Luka's `integrations.vision.analyze()` for the move-out report.

## Run (from the repo root)
```bash
uv sync --project server                                        # install
uv run --project server uvicorn server.app.main:app --reload    # dev server on http://localhost:8000
uv run --project server pytest server/tests                     # tests (FakeChain, no USDC or API key)
```
Needs in the repo-root `.env` (never in git): `LANDLORD_PRIVATE_KEY`, `TENANT_PRIVATE_KEY`, `ANTHROPIC_API_KEY`.
Public values (escrow, USDC, explorer, arbiter) come from `shared/addresses.json`.

Optional env: `DK_CORS_ORIGINS` (comma-separated, default `http://localhost:3000`), `DK_DATA_DIR`
(default `server/data/`, gitignored), `DK_AUTOSEND=0` to turn off the 48 h auto-send loop.

## Scripts
- `uv run --project server python -m server.scripts.smoke [--photos DIR] [--deposit-cents 100]`: runs the demo path
  through the HTTP API on testnet and prints every explorer link. Without `--photos` it stops before the AI report.
- `uv run --project server python -m server.scripts.topup [--cents 500]`: shows wallet balances; optionally moves
  testnet USDC landlord → tenant so rehearsals can keep depositing.

## Notes for the app
- Send `X-User-Id: tenant_demo` or `landlord_demo` on every write. This is demo identity, not auth.
- `GET /health` checks the chain connection.
- Photos must be JPEG or PNG (the vision pipeline rejects HEIC). An `<input type="file" accept="image/jpeg,image/png">`
  on iOS Safari converts camera shots to JPEG.
- `/report` returns 202. Poll `GET /leases/{id}` every 2 s until `status` is `report_draft` (or back to
  `move_out_recorded` with `report.error`).
- `simulated_interest_cents` is 4% APY on the deposit from `move_in_date` to settlement. It is simulated, so label it so.

## Safety limits
- The deduction is capped at the deposit on the server and in the contract (`DeductionTooHigh`).
- Normal wear and no-change findings are always $0. Costs come only from `integrations/vision/price_table.json`,
  loaded on the server, never from a request.
- The landlord can only remove findings or lower costs (D-004).
- At most 3 AI analysis attempts per lease. Vision errors return only the error message, never a traceback.
- Uploads: JPEG/PNG only (checked by magic bytes), 25 MB max, at most 12 shots per lease.
- Known v1 limits: no real auth; uploaded photos are served without auth under unguessable lease ids;
  one server instance (txs are serialized by a process lock).
