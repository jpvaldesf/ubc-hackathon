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
Hosting env: `DK_DEMO_TOKEN` (when set, every write needs header `X-Demo-Token` with this value, else 401
`unauthorized`; reads and `/health` stay open; smoke.py sends it from the same env var),
`DK_MAX_LEASES_PER_DAY` / `DK_MAX_REPORTS_PER_DAY` (default 20 each, 0 = no cap; over the cap: 429
`rate_limited`; counts are kept in `DK_DATA_DIR/quota.json` so restarts don't reset them).
`DK_MAX_DEPOSIT_CENTS` (default 10000; set 1000 on the host). The server refuses to start when
`DK_CORS_ORIGINS` has a non-localhost origin and no `DK_DEMO_TOKEN` (override: `DK_ALLOW_OPEN=1`).
Rejected requests (4xx) don't use up a daily cap. `/health` also returns `network`, `explorer` and `demo_token_required`.
Host settings (D-012): `DK_DEMO_TOKEN=<random>`, `DK_MAX_LEASES_PER_DAY=5`, `DK_MAX_REPORTS_PER_DAY=10`,
`DK_MAX_DEPOSIT_CENTS=1000`, `DK_DATA_DIR` on a persistent disk. Also set a monthly spend limit on the Anthropic key.

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
- Deposits are capped at $100 (10,000 cents) on testnet; request bodies over ~26 MB are rejected before parsing.
- Either party can upload and commit photos for either phase (the contract allows both; API.md says "Tenant or landlord").
- **Run one worker only** (no `--workers N`): nonces and per-lease locks are in-process.
- Demo token + daily caps are in (`DK_DEMO_TOKEN`, see above). Set them before hosting.
- Known v1 limits: no real auth; uploaded photos are served without auth under unguessable lease ids;
  one server instance (txs are serialized by a process lock).

## Hosting (Render, D-012/D-013)

`render.yaml` (repo root) defines one Docker web service built from `Dockerfile`. The image contains only `server/`,
`shared/` and `integrations/` (`.dockerignore` is an allow-list; `.env` and keys are never copied). It runs one
uvicorn worker on `$PORT` and keeps leases, photos and the daily caps on a 1 GB persistent disk at `/var/data`.
The paid `0.5c-512mb` plan is needed because the free plan has no disk.

It also defines `deposit-keeper-app`: the app in `app/` (unchanged) as a free static site in live mode.

**Setup (about 15 min):**
1. Render dashboard → **New → Blueprint** → pick this repo, branch `main`. Render reads `render.yaml` and shows
   both services with their `onrender.com` URLs.
2. It asks for the `sync: false` values. Paste them into Render only, never into git or chat:
   - `LANDLORD_PRIVATE_KEY`, `TENANT_PRIVATE_KEY`: the testnet demo wallets (the arbiter key is not needed).
   - `ANTHROPIC_API_KEY`: also set a monthly spend limit on this key in the Anthropic console.
   - `DK_ALLOW_OPEN`: enter `1` (open mode until the app sends `X-Demo-Token`).
   - `DK_CORS_ORIGINS`: `https://deposit-keeper-demo.vercel.app,https://<app service>.onrender.com`
   - `VITE_API_URL` (app): `https://<api service>.onrender.com`
   If the URLs aren't shown before creating, enter a placeholder, then fix both values after the first deploy
   (the app needs a redeploy to pick up `VITE_API_URL`: Manual Deploy → Clear build cache & deploy).
3. Deploy, then check `https://<api service>.onrender.com/health`: `ok: true`, `chain_id: 5042002`, `network: arc_testnet`.
4. Top up the wallets if needed: `uv run --project server python server/scripts/topup.py` (from your laptop).
5. Smoke test against the host: `uv run --project server python server/scripts/smoke.py --base https://<service>.onrender.com --demo --stop-at funded`
   (prints a fresh $10 lease id; uses 1 of the 5 daily leases).
6. Send Marcus the URL by chat: Vercel `VITE_ADAPTER=live`, `VITE_API_URL=https://<service>.onrender.com`.

**Turn the demo token on** (once the app sends `X-Demo-Token`): in the dashboard, add `DK_DEMO_TOKEN` (a random
value, e.g. `openssl rand -hex 16`) and delete `DK_ALLOW_OPEN`; Render redeploys. Give Marcus the same value for
`VITE_DEMO_TOKEN`, and set `DK_DEMO_TOKEN` in your shell when running `smoke.py` against the host.

**Notes:** data on the disk survives deploys and restarts; everything outside `/var/data` is reset on each deploy.
Add the Vercel URL of any other frontend to `DK_CORS_ORIGINS` (comma-separated). Never scale past one instance.
