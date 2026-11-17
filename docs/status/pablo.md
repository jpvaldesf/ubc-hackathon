# Pablo: status (your Claude session updates this after each task)

**Lane:** on-chain + backend (contracts/, server/, shared/abi/, shared/addresses.json)
**Today's lane goal (Sat Nov 14):** Escrow deployed on Arc testnet with a release tx; FastAPI skeleton talking to it by midnight.
**Full plan:** docs/PLAN.md (your section)
**Branch:** feat/server-skeleton

## Done (with evidence: tx hash, PR link, screenshot)
- Sat 11:50: docs/API.md drafted; frozen 2:30 PM as D-002…D-006.
- Sat ~12:15: Arc testnet values in .env.example (chain 5042002, USDC 0x3600…0000, 6 dec ERC-20 / 18 native). Arc Foundry v0.8.0-4 installed.
- Test wallets funded, 20 USDC each (faucet cap is 20). Landlord 0x86a4F488D30b1CAA5A4e6613994DFc530B191a36 · Tenant 0xFB2C0638628b7830e46F2e054d35bD058B9d4A6F · Arbiter 0x90b7F173B4aE279f9C7abb512a4cbDfeDb0D10c5
- Sat 2 PM: DepositEscrow.sol + 14 forge tests passing (incl. fund-conservation fuzz), Deploy + DemoRun scripts, ABI in shared/abi/.
- Sat Nov 14, 2:27 PM: DepositEscrow deployed on Arc testnet at 0xe3791a88E125ce9e826FB07f84BF88625d9f3e98 (deploy tx 0x389693fbb99442aa7343e353c6df27d27f19eb4a30af256e660f417b6b4e4d2a, status 1, code verified via RPC Sun 5:30 PM). Address in shared/addresses.json.
- Sun Nov 15, ~6 PM: source verified on Blockscout. DemoRun lease #1 on testnet: 7/7 txs ok; propose paid tenant 8.8 USDC (0xe29c4c5c…0109), accept paid landlord 1.2 USDC (0xd86ffb8e…b693); escrow balance 0 after. Links in docs/STATUS.md.
- Sun Nov 15, ~9 PM: FastAPI server in server/ (all docs/API.md endpoints, analyze() wired in, 12 tests). Live on testnet through the HTTP API: lease #2 ($1) create 0xe0d8e507…, deposit 0x761597e3…, commit in 0xf4419928…, commit out 0xd09bd0ab…; onchain manifest hashes match the server's. AI step not run live yet (no ANTHROPIC_API_KEY in my .env).

- Sun Nov 15, 8:40–9 PM: full live run through server with real AI (lease #3); 9 PM check: demo steps 3–5 through Marcus's app on testnet, exact demo amounts (links in STATUS). smoke --demo added (PR #17).
- Mon Nov 16 AM: demo reset / hybrid step 1: `smoke.py --demo --stop-at funded` makes a fresh $10 lease with the deposit paid and prints the lease id; `--stop-at move_in` also commits move-in photos. Checked against FakeChain (all 4 stop points); no testnet run yet.

- Mon Nov 16, ~9:30 PM: **first full in-app run on Arc testnet from a phone** (laptop server + Cloudflare tunnels, open mode with caps). Lease l_75b8a3c6: create → deposit 10 USDC → both photo commits → AI flagged the wall mark $1.20 @0.90 + nail hole $0 → $8.80 to tenant → accept, $1.20 to landlord. All 6 receipts status 1, USDC transfers checked from the RPC (links in docs/STATUS.md). PRs #27 (smoke --stop-at), #28 (demo token + caps, D-012) merged; photo previews (D-013) in PR.

## Next (max 3)
1. Mon AM: demo-token header on the server; help Marcus with photo URLs / screens.
2. Mon PM: host server (persistent disk) + point app at it; faucet top-up; qa-demo-tester + judge-panel after 2 PM; D-011 Streams call.
3. Tue: README contract section with Luka.

## Blocked by / waiting on
- Known (audit, older than D-013): original photos are public under `/files` with their EXIF, including GPS if the phone recorded it. Demo photos must be staged with location off. Fix after the hackathon: keep originals outside `/files`, serve only previews.
- Faucet caps at 20 USDC: demo scaled 1:100 (D-002). Optional: ask Arc rep for more.

## Requests from others (teammates write here instead of editing your files)
- Sun Nov 15, from Luka: Demo damage item is now a wall mark ($1.20, price key wall_mark_repaint). Please change any carpet stain labels or seed data. Amounts are unchanged.
- Sun Nov 15, from Luka: vision pipeline is ready on branch feat/vision-pipeline (not merged yet). `from integrations.vision import analyze, load_price_table, VisionError`; raise 502 `vision_error` on VisionError. Output follows the PLAN.md schema plus ONE additive field, `dropped_unknown_price_key` (int); please store/hash it like the rest. `price_table.json` has placeholder cents (carpet_spot_clean 120, wall_mark_repaint 120, nail_holes 0); please confirm. Deps: integrations/vision/requirements.txt. Example output: integrations/vision/sample_report.json. From the security audit, server-side please: cap `total_deduction_cents` at the deposit (and `deduction <= deposit` in the contract if not already), load price_table.json yourself (never from the request), return only `str(VisionError)` (no traceback), and limit analyze attempts per lease.
- Sun Nov 15, from Marcus: the live adapter is in app/ (PR #13). Two small API asks, no rush: (1) `GET /leases/{id}` could return the appeal (`finding_ids`, `reason`, `at`), which the server stores but does not serve, so the dispute screen can't show what was disputed after a reload; (2) the `proposed` timeline label says "$8.80 sent to you", which is wrong for the landlord (the app rewrites it for now). Also: write endpoints could not be tried on Arc from my machine (no wallet keys), only against FakeChain.
