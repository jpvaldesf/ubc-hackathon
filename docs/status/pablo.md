# Pablo: status (your Claude session updates this after each task)

**Lane:** on-chain + backend (contracts/, server/, shared/abi/, shared/addresses.json)
**Today's lane goal (Fri Nov 13):** Escrow contract spike on Arc testnet → one real release tx on the explorer.
**Full plan:** docs/PLAN.md (your section)
**Branch:** feat/escrow-spike

## Done (with evidence: tx hash, PR link, screenshot)
- Sat ~12:15: Arc testnet values in .env.example (chain 5042002, USDC 0x3600…0000, 6 dec ERC-20 / 18 native). Arc Foundry v0.8.0-4 installed.
- Test wallets funded, 20 USDC each (faucet cap is 20). Landlord 0x86a4F488D30b1CAA5A4e6613994DFc530B191a36 · Tenant 0xFB2C0638628b7830e46F2e054d35bD058B9d4A6F · Arbiter 0x90b7F173B4aE279f9C7abb512a4cbDfeDb0D10c5

## Next (max 3)
1. Fri night: escrow contract straight in `contracts/` (Foundry, hardened from the start): deposit USDC → propose split → tenant accept / appeal → release. Pass = release tx link. Look up Arc USDC address, RPC, chain ID via arc-docs MCP first.
2. Sat: draft `docs/API.md` endpoints (create lease, upload photos, run report, accept/appeal, status) for the Sat sync; `/decide` once agreed.
3. Sun: Circle dev-controlled wallets spike on ARC-TESTNET (one wallet per user, route through `contractExecution` so the escrow rules can't be skipped). Then the FastAPI server and deploying the real contract (address in shared/addresses.json + README).

## Blocked by / waiting on
- Faucet gives only 20 USDC: ask Arc/Circle rep for 1,000+, else scale demo 1:100 (decide at Sat 1 PM sync)

## Requests from others (teammates write here instead of editing your files)
-
