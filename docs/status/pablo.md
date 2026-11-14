# Pablo: status (your Claude session updates this after each task)

**Lane:** on-chain + backend (contracts/, server/, shared/abi/, shared/addresses.json)
**Today's lane goal (Fri Nov 13):** Escrow contract spike on Arc testnet → one real release tx on the explorer.
**Full plan:** docs/PLAN.md (your section)
**Branch:** feat/escrow-spike

## Done (with evidence: tx hash, PR link, screenshot)
- Sat 11:50: docs/API.md drafted for 1 PM sync (branch docs/api-draft, 4408c1e). 5 open questions at the bottom.

## Next (max 3)
1. Fri night: escrow contract straight in `contracts/` (Foundry, hardened from the start): deposit USDC → propose split → tenant accept / appeal → release. Pass = release tx link. Look up Arc USDC address, RPC, chain ID via arc-docs MCP first.
2. Sat: draft `docs/API.md` endpoints (create lease, upload photos, run report, accept/appeal, status) for the Sat sync; `/decide` once agreed.
3. Sun: Circle dev-controlled wallets spike on ARC-TESTNET (one wallet per user, route through `contractExecution` so the escrow rules can't be skipped). Then the FastAPI server and deploying the real contract (address in shared/addresses.json + README).

## Blocked by / waiting on
- Testnet USDC from https://faucet.circle.com

## Requests from others (teammates write here instead of editing your files)
-
