# Pablo: status (your Claude session updates this after each task)

**Lane:** on-chain + backend (contracts/, server/, shared/abi/, shared/addresses.json)
**Today's lane goal (Sat Nov 14):** Escrow deployed on Arc testnet with a release tx; FastAPI skeleton talking to it by midnight.
**Full plan:** docs/PLAN.md (your section)
**Branch:** feat/escrow-spike (merged via the Sat decisions PR)

## Done (with evidence: tx hash, PR link, screenshot)
- Sat 11:50: docs/API.md drafted; frozen 2:30 PM as D-002…D-006.
- Sat ~12:15: Arc testnet values in .env.example (chain 5042002, USDC 0x3600…0000, 6 dec ERC-20 / 18 native). Arc Foundry v0.8.0-4 installed.
- Test wallets funded, 20 USDC each (faucet cap is 20). Landlord 0x86a4F488D30b1CAA5A4e6613994DFc530B191a36 · Tenant 0xFB2C0638628b7830e46F2e054d35bD058B9d4A6F · Arbiter 0x90b7F173B4aE279f9C7abb512a4cbDfeDb0D10c5
- Sat 2 PM: DepositEscrow.sol + 14 forge tests passing (incl. fund-conservation fuzz), Deploy + DemoRun scripts, ABI in shared/abi/. Not deployed yet.

## Next (max 3)
1. Deploy + DemoRun on Arc testnet → release tx link in docs/STATUS.md, address in shared/addresses.json.
2. 6 PM–midnight: FastAPI skeleton in server/ per docs/API.md (SQLite, per-shot upload, cents, report draft + 48 h auto-send).
3. Sun AM: Circle wallets, 2 h timebox (D-007). Fallback = server-held keys.

## Blocked by / waiting on
- Faucet caps at 20 USDC: demo scaled 1:100 (D-002). Optional: ask Arc rep for more.

## Requests from others (teammates write here instead of editing your files)
- Sun Nov 15, from Luka: vision pipeline is ready on branch feat/vision-pipeline (not merged yet). `from integrations.vision import analyze, load_price_table, VisionError`; raise 502 `vision_error` on VisionError. Output follows the PLAN.md schema plus ONE additive field, `dropped_unknown_price_key` (int); please store/hash it like the rest. `price_table.json` has placeholder cents (carpet_spot_clean 120, wall_mark_repaint 120, nail_holes 0); please confirm. Deps: integrations/vision/requirements.txt. Example output: integrations/vision/sample_report.json. From the security audit, server-side please: cap `total_deduction_cents` at the deposit (and `deduction <= deposit` in the contract if not already), load price_table.json yourself (never from the request), return only `str(VisionError)` (no traceback), and limit analyze attempts per lease.
