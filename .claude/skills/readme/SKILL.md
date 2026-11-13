---
name: readme
description: Writes or updates the judge-facing README.md with every section UBC 2026 requires for our track, chain award, and bounties, generated from the actual code. Use on Day 5–6 and after any architecture change.
---

Read `CLAUDE.md`, `docs/JUDGING.md`, `docs/DECISIONS.md`, and the source tree. Write `README.md` for a judge
who has 3 minutes and a developer who wants to run it in 10. Use only facts you verified in the code; mark
anything unverified with TODO.

Order:
1. **Name + one-line pitch**, links: demo video · live app · Devpost
2. **The problem** (3 sentences) and **what we built** (3 sentences)
3. **Demo**: GIF or screenshots of the demo path
4. **How it works**: a Mermaid architecture diagram + a numbered request/transaction flow
5. **Sponsor tech, and why each is load-bearing**: one short paragraph per tool
6. **Required sections for our entries** (include only what applies):
   - Agentic: **Agent decision loop** (observe → decide → pay/act → verify) and **Safety limits** (per-tx cap,
     daily budget, allowlist, human-approval threshold, kill switch, prompt-injection defenses), with where each one is enforced in code
   - DeFi: **Economic design** and **Risk assumptions** (oracle, liquidity, liquidation, admin keys)
   - Solana: **Program IDs** (devnet) + "How we use Solana"
   - Arc: **Contract addresses** (testnet) + "How we use Arc"
   - QuickNode: **Stream configuration**: network, dataset, filter logic (paste the filter), destination, and why
   - ElevenLabs: products used (TTS / STT / Agents / SFX / Music) and how
   - Grok Bot: 3–4 sentences on its role + a link to the chat export
   - Gemini: which Prediction Markets endpoints and streams we use
7. **Run it locally**: prerequisites with versions, `.env.example` variables, faucet links, exact commands
8. **Built during UBC 2026**: team, timeline, what's mocked (be honest; judges respect disclosure)
9. **What's next**
