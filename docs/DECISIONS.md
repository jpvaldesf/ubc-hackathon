# Decision log

One entry per decision that would be expensive to reverse. Newest at the top. `/decide` appends here.

<!-- Template
## D-001 · <decision title> · <date, time>
- Context: what forced the decision
- Options considered: A / B / C
- Decision: what we chose
- Why: 1–3 reasons tied to prizes, time, or risk
- Revisit if: the condition that would make us change our mind
-->

## D-001 · Project = Deposit Keeper on Arc, Consumer track · 2026-11-13, 15:25 PST
- Context: three idea-gauntlet runs (45 ideas, 11 stress-tested by researcher agents). Team picked between the two survivors.
- Options considered: Deposit Keeper (Consumer · Arc) / Skin in the Game, bonded AI forecasts with buyer refunds (Agentic · Solana · Gemini bounty). Killed earlier: Hedge My Life, Voicepay, Odds Radio, Weatherproof, Drain Guard, Agent Credit Line, Haggler, Agent Mutual.
- Decision: Deposit Keeper. USDC escrow contract on Arc testnet (no admin withdrawal; funds go only to tenant or landlord); move-in/move-out photo hashes committed onchain; Python vision pipeline drafts itemized deductions (normal wear never charged, costs from a fixed price table, low-confidence findings dropped); undisputed amount pays out immediately, deductions need tenant acceptance or an arbiter ruling. Yield vault is simulated (Circle USYC is institution-only). Consumer track, Arc chain award, no bounties.
- Why: strongest Impact and Product/UX story (USC renters; California AB 2801 now requires landlords to photograph units at move-in/move-out, 21-day return rule, no state deposit interest); fits the team (Python AI, simple Solidity, consumer frontend); the combination of neutral escrow + tamper-proof photos + AI-proposed split is unclaimed per prior-art search (photo-compliance apps like Timemark/RentCheck don't hold deposits).
- Trade-off accepted: no bounty, so one finalist route fewer than Skin in the Game (Consumer track winner, top Arc in Consumer, top 3 overall).
- Revisit if: the vision model fails the 5-pair photo test (misses real damage or flags a lighting-only change) by Sat Nov 14 EOD. Fallback: Skin in the Game (already researched).
