# Deposit Keeper

Rental deposits, held in USDC escrow and checked by AI, so tenants get their money back fast and landlords only charge for real damage.

Built for the UBC 2026 blockchain hackathon. Track: Consumer. Chain: Arc testnet.

- Live demo: TO FILL
- Demo video: TO FILL

## The problem

In California a landlord has 21 days to return a deposit or send an itemized statement (Civil Code §1950.5). Since AB 2801, landlords must also keep move-out photos, and move-in photos for tenancies that began on or after July 1, 2025. Deposits still get held for weeks, deductions are hard to check, and disputes are slow.

## How it works

1. The tenant pays the deposit into an escrow contract in USDC.
2. Tenant and landlord take move-in and move-out photos in the app.
3. The landlord compares the photos. The AI proposes findings and prices.
4. The landlord reviews the report. They can lower or remove a charge, never add one.
5. The undisputed amount is paid out immediately. The tenant either accepts the rest or disputes a deduction.
6. A disputed deduction goes to a neutral arbiter.

Every step has a proof link to the Arc block explorer.

## How the AI decides

The AI describes what it sees. It does not set prices or make the final call.

- It compares each before/after photo pair and returns structured JSON (model: `claude-sonnet-5-5`).
- Costs come only from a fixed price table (in cents). The AI can pick an item from the table but cannot invent a price. The demo prices are placeholders, not market quotes.
- A finding is kept only above a confidence cutoff: **0.7 for damage, 0.5 for normal wear**.
- **Normal wear is always $0** (for example, small pin or nail holes).
- At most 3 findings per photo pair, with damage ranked before normal wear.
- The landlord can only lower or remove a charge. The server rejects any increase.
- The total deduction is capped at the deposit, in both the server and the contract.
- Each lease allows 3 analysis attempts. JPEG and PNG only.

### How we tested it

7 staged photo pairs, each run 3 times. Damage pairs scored 0.88–0.93 confidence. Clean pairs (including a lighting-only change) produced no findings. These are staged wall marks, not a large real-world dataset, so treat accuracy claims accordingly. 47 unit tests cover the rules around the AI.

## Contract & Arc

TO FILL (Pablo): why Arc, the contract address, deploy transaction, verified source link, what the timeout windows do, how USDC is used.

## Architecture

- `contracts/`: Solidity escrow, built with Foundry.
- `server/`: Python FastAPI service. Signs testnet transactions, runs the AI check, enforces the rules above.
- `integrations/vision/`: the photo-comparison pipeline and its tests.
- `app/`: React, TypeScript and Vite web app for tenant and landlord.
- `docs/`: decisions, status and the demo script.

## Setup

Requirements: Python with `uv`, Node.js LTS, an Anthropic API key, funded Arc testnet keys, and `arc-forge` for the contracts.

1. Create a `.env` in the repo root. Never commit this file. The server needs `ANTHROPIC_API_KEY`, `LANDLORD_PRIVATE_KEY` and `TENANT_PRIVATE_KEY`. Optional settings, all with defaults: `ARC_RPC_URL`, `DK_DATA_DIR`, `DK_CORS_ORIGINS`, `DK_AUTOSEND`, `DK_DEMO_TOKEN`, `DK_ALLOW_OPEN`, `DK_MAX_LEASES_PER_DAY`, `DK_MAX_REPORTS_PER_DAY`, `DK_MAX_DEPOSIT_CENTS`.
2. Install and start the server from the repo root:
   - `uv sync --project server`
   - `uv run --project server uvicorn server.app.main:app --reload` (serves on http://localhost:8000)
3. Start the app: `cd app && npm ci && VITE_ADAPTER=live VITE_API_URL=<server URL> npm run dev`
4. Open `http://localhost:5173/leases/<lease id>?as=tenant_demo` (or `landlord_demo`).
5. End-to-end check against a running server: `uv run --project server python -m server.scripts.smoke --demo`

Without `VITE_ADAPTER=live` the app runs on sample data.

### Tests

- Server (uses a fake chain, no USDC or API key needed): `uv run --project server pytest server/tests`
- Vision rules, no network: `uv run --project server pytest integrations/vision`
- Vision against the real model (needs `ANTHROPIC_API_KEY`): `VISION_TEST_PHOTOS=<photo folder> pytest integrations/vision -m integration`
- Contracts: `cd contracts && arc-forge test`. On a fresh clone, first run `arc-forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git`.

The prices in `integrations/vision/price_table.json` are placeholder demo prices (1:100 scale, integer cents), not market quotes.

## Demo mode and safety

This is a testnet demo. Be clear about what is simplified:

- Amounts are scaled 1:100. A $10 test deposit stands for $1,000.
- Identity is a demo header (`landlord_demo` / `tenant_demo`), not real sign-in.
- The server holds the testnet keys and signs for both roles. A real product would use user wallets.
- The server can require an `X-Demo-Token` header and enforces daily limits (`DK_DEMO_TOKEN`, `DK_MAX_LEASES_PER_DAY`, `DK_MAX_REPORTS_PER_DAY`). The public demo is currently in open mode.
- Nothing here is legal or financial advice.

## What's next

Real sign-in and wallets, guided photo capture, showing yield on held deposits, a real arbiter network, more damage types with regional price tables, and other states' deposit rules.

## Team

Pablo Valdes (onchain and backend), Marcus Kim (frontend and product), Luka Burger (AI vision, integrations and demo).
