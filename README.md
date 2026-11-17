# Deposit Keeper

Rental deposits, held in USDC escrow and checked by AI, so tenants get their money back fast and landlords only charge for real damage.

Built for the UBC 2026 blockchain hackathon. Track: Consumer. Chain: Arc testnet.

- Live demo: https://deposit-keeper-app.onrender.com (the API is https://deposit-keeper-api.onrender.com)
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

All money moves in one Solidity contract, `DepositEscrow`, deployed on **Arc testnet** (chain id 5042002).

| | |
|---|---|
| DepositEscrow (source verified) | [`0xe3791a88E125ce9e826FB07f84BF88625d9f3e98`](https://explorer.testnet.arc.io/address/0xe3791a88E125ce9e826FB07f84BF88625d9f3e98) |
| Deploy transaction | [`0x389693fb…4d2a`](https://explorer.testnet.arc.io/tx/0x389693fbb99442aa7343e353c6df27d27f19eb4a30af256e660f417b6b4e4d2a) |
| USDC (Arc testnet) | `0x3600000000000000000000000000000000000000` |

All addresses are also in `shared/addresses.json`; the ABI is in `shared/abi/`.

**Why Arc**
- **USDC is the deposit and the gas.** The tenant never needs a second token, and fees are small and in dollars. That keeps crypto out of sight in a consumer app.
- **Fast finality.** "The undisputed amount comes back the same day" really means the same minute.
- **Standard EVM tooling.** Built and tested with Arc Foundry (`arc-forge`, 18 tests); OpenZeppelin `SafeERC20` and `ReentrancyGuard`.

**What the contract does** (`contracts/src/DepositEscrow.sol`)
1. `createLease` (landlord) sets the tenant, the arbiter and the amount. `deposit` (tenant) moves the USDC into escrow.
2. `commitPhotos` stores a hash of the move-in and move-out photo sets onchain, so no one can swap photos later.
3. `proposeDeductions` (landlord) stores the AI report's hash and **pays the undisputed part to the tenant in the same transaction**. The deduction can never exceed the deposit.
4. The tenant calls `accept` (the deduction goes to the landlord) or `appeal`. After an appeal the arbiter calls `resolve` and can split the amount, but can't give the landlord more than the deduction.

**Timeouts, so money never gets stuck.** If someone goes silent, **anyone** can call these after the window ends:
| Window | Length | If it passes |
|---|---|---|
| Landlord proposes after move-out | 21 days (California's deadline, Civil Code §1950.5) | `reclaim`: full deposit back to the tenant |
| Tenant may appeal | 7 days | `finalize`: deduction to the landlord |
| Arbiter rules on an appeal | 14 days | `expireAppeal`: disputed amount back to the tenant |

**A full demo run on Arc testnet** (Tue Nov 17, $10 deposit at 1:100 scale; every receipt has status 1, and the amounts come from the USDC transfer logs):
| Step | USDC | Transaction |
|---|---|---|
| Lease created | – | [0x1fa0…f799](https://explorer.testnet.arc.io/tx/0x1fa09cff1cc3583a168a90c4a234964f2adc4058cea948807a8395f5f2ecf799) |
| Deposit | 10.00 tenant → escrow | [0xd075…ec02](https://explorer.testnet.arc.io/tx/0xd075c1b9df2859e5275085726392974f4ff10867f3358fc7c4fe95f12a54ec02) |
| Move-in photos recorded | – | [0xfaf4…dba7](https://explorer.testnet.arc.io/tx/0xfaf4929a7bf341a5f7bac8b3a24f0053a11d68f17b9e0ede4173c57ed0a6dba7) |
| Move-out photos recorded | – | [0x729f…b1fd](https://explorer.testnet.arc.io/tx/0x729fb201bc7c89014a9df4028e2d49020bcef5f21c900582a2d3e9459d05b1fd) |
| Report sent (undisputed part) | 8.80 escrow → tenant | [0xadd0…64de](https://explorer.testnet.arc.io/tx/0xadd00e01b09987201bc0e9051a361961dba3624c0d94b18a1d55cdaaf5a364de) |
| Tenant accepts | 1.20 escrow → landlord | [0xde76…96bdc](https://explorer.testnet.arc.io/tx/0xde762bfa36e2cf943fb47a454c58aedd30f56f3f3f127c3fa543a82afdf96bdc) |

**Simplified for the demo**
- The server holds the three testnet keys (landlord, tenant, arbiter) and signs for each role. A real product would use the users' own wallets, for example Circle Wallets; we didn't get to that in time.
- The contract still holds a few USDC from early unfinished test leases. Those unlock only through the timeouts above, so "escrow back to 0" is true per lease, not for the whole contract.

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
5. End-to-end check against a running server: `uv run --project server python -m server.scripts.smoke --demo --photos <folder>` (the folder holds `p1 p2 p3 p5 p7` as `pN_before.jpg` / `pN_after.jpg`), or `--demo --stop-at funded` for a funded lease without photos.

Without `VITE_ADAPTER=live` the app runs on sample data.

### Tests

- Server (uses a fake chain, no USDC or API key needed): `uv run --project server pytest server/tests`
- Vision rules, no network: `uv run --project server python -m pytest integrations/vision`. Run it from the repo root; `python -m` puts the root on the import path.
- Vision against the real model (needs `ANTHROPIC_API_KEY`): `VISION_TEST_PHOTOS=<photo folder> uv run --project server python -m pytest integrations/vision -m integration`
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
