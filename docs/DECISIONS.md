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

## D-010 · Separate confidence cutoffs: normal wear 0.5, damage 0.7 · 2026-11-15, 12:30 PST
- Context: the p7 nail-hole pair was correctly read as normal_wear/nail_holes in 3/3 runs, but at 0.60, so the single 0.7 cutoff hid it. Demo step 3 needs the nail holes to show as a visible "normal wear, $0" line.
- Options considered: keep one 0.7 cutoff (nail holes stay hidden) / lower the cutoff for everything (risks new charges) / separate cutoffs per category.
- Decision: normal_wear findings use a 0.5 confidence cutoff; damage stays at 0.7. For the 3-findings-per-pair cap, damage findings rank first regardless of confidence, then normal_wear, each group by confidence, so a $0 line can never push out a charge.
- Why: normal wear is always $0 in code, so a lower bar can only add visible $0 lines, never a charge. Validated on p1–p7 ×3 (21 runs): no new findings on the clean or lighting-only pairs (p1, p2, p5), p3/p4 damage unchanged at 0.90, p7 nail hole kept at $0 in 3/3, p6 still empty.
- Revisit if: clean pairs start showing normal-wear lines. The cutoff was chosen after seeing p7, so it is tuned on the same data it was tested on.

## D-009 · Demo damage item: wall mark instead of carpet stain · 2026-11-15, 11:54 PST
- Context: D-002 made a carpet stain the $1.20 demo deduction, but the vision pipeline has only proven wall marks, and a carpet stain can't be staged.
- Options considered: keep trying to stage and prove a carpet stain / switch the demo damage item to a wall mark.
- Decision: the demo damage item is a wall mark, price key `wall_mark_repaint`, 120 cents. The deduction is still $1.20, so $8.80 still goes back to the tenant; all amounts are unchanged. This replaces the carpet stain in D-002; the normal-wear item (small nail holes, $0) stays.
- Why: wall marks are tested: flagged as damage at 0.88–0.93 confidence across runs (p3 and p4, Nov 15), with no false positives on the clean and lighting-only pairs. The carpet stain can't be staged.
- Revisit if: the wall mark stops passing (below the 0.7 cutoff, or a false positive on the clean pairs).

## D-008 · Stack confirmed · 2026-11-14, 14:30 PST
- Context: the Sat 1 PM sync didn't happen; Pablo asked Claude to decide and publish so the team stays unblocked.
- Decision: Next.js (TypeScript) mobile-first web in app/ · Solidity + Arc Foundry on Arc testnet in contracts/ · Python + FastAPI + SQLite in server/ · vision pipeline as a Python module in integrations/vision/.
- Why: already proposed in CLAUDE.md, matches every lane's skills, and the escrow is already built on it.
- Revisit if: anyone has a blocker with their part of the stack; raise it at standup.

## D-007 · Circle wallets: server-held keys now, 2 h timebox Sun AM · 2026-11-14, 14:30 PST
- Context: the escrow ran ~12 h late, so the Sat 2–6 PM Circle slot went to the contract.
- Options: Circle today / Circle Sun AM timebox / server-held keys only.
- Decision: the server signs with testnet keys held server-side (users still never see keys or gas). Pablo tries Circle dev-controlled wallets Sun 9–11 AM, only if the server skeleton is up. No tx by 11 AM → server-held keys stay, and the README says so.
- Why: the demo path matters more than Arc plus points; the Consumer "invisible crypto" rule holds either way.
- Revisit if: Circle lands quickly Sunday.

## D-006 · Contract: no funds can get stuck · 2026-11-14, 14:30 PST
- Context: the contract was built Sat afternoon. The security-auditor found the deposit could lock forever if the landlord never proposes, or the deduction if the arbiter never rules.
- Decision: deployed windows are appeal 7 days; propose 21 days after move-out photos (California's return deadline), after which anyone can return the full deposit to the tenant (`reclaim`); resolve 14 days after an appeal, after which the disputed amount returns to the tenant (`expireAppeal`). After the appeal window with no appeal, anyone can release the deduction to the landlord (`finalize`). Minimum 1 h for every window.
- Why: every path ends with the money with the tenant or landlord. The default favors whoever didn't go silent, and the pitch can say "your money can't get stuck."
- Known limits (in the README): push payments, so a USDC-blocklisted party makes payouts to them revert; the landlord picks the arbiter (v1 uses our fixed arbiter address).
- Revisit if: we add pull payments or a neutral arbiter pool after the hackathon.

## D-005 · API frozen: per-shot upload, explicit commit, analyze() signature · 2026-11-14, 14:30 PST
- Context: Marcus and Luka were blocked on the API shape (docs/API.md).
- Decision: docs/API.md is frozen as of this commit. Photos are uploaded one at a time (`PUT /leases/{id}/photos/{phase}/{shot_id}`, retakes replace), then a "Done" call commits the manifest hash onchain (`POST …/photos/{phase}/commit`, one tx per phase). Luka provides `analyze(pairs, price_table, on_progress=None) -> findings dict`.
- Why: per-shot upload fits the guided shot list and gives progress for free; one commit tx per phase keeps the onchain story simple.
- Revisit if: the vision call needs a different input (e.g. crops).

## D-004 · Report: AI drafts, landlord reviews 48 h, then auto-sends · 2026-11-14, 14:30 PST
- Context: should the AI report go straight onchain, or should the landlord review it first?
- Decision: the AI report is drafted automatically when move-out photos are analyzed. The landlord has 48 h to review it and can only **remove findings or lower costs**, never add or raise. Then they send it (`proposeDeductions`). If they don't respond in 48 h, the server sends the draft as is. The demo shows the landlord tapping "Send report".
- Why: keeps a human in the loop for fairness without letting the landlord inflate charges; the AI draft plus the price table is the ceiling.
- Revisit if: judges or user interviews push back on the 48 h wait.

## D-003 · Money is integer cents everywhere · 2026-11-14, 14:30 PST
- Context: the scaled demo needs $1.20, which whole-dollar fields (`cost_usd: 120`) can't represent.
- Decision: the API and findings JSON use integer cents: `deposit_cents`, `cost_cents`, `total_deduction_cents`, etc. The price table is in cents. The server converts to USDC base units (6 decimals, ×10⁴).
- Why: exact, no float rounding, one conversion point.
- Revisit if: never.

## D-002 · Demo amounts scaled 1:100 · 2026-11-14, 14:30 PST
- **Superseded in part by D-009:** the $1.20 damage item is now a wall mark, not a carpet stain. Amounts and scale are unchanged.
- Context: the Circle faucet gives 20 testnet USDC per wallet, so a $1,000 deposit isn't possible.
- Options: ask the Arc rep for 1,000+ USDC / show $1,000 in the UI over a smaller onchain amount / scale everything down and say so.
- Decision: the demo deposit is $10.00, the stain deduction $1.20, and $8.80 goes back to the tenant, all real onchain. The UI shows these exact amounts plus a visible "Testnet demo: amounts scaled 1:100" note. The pitch can say "on a real $1,000 deposit, that's $880 back the same day." The normal-wear item is small nail holes ($0), which we can stage; Luka can swap it if something else stages better.
- Why: nothing faked; the explorer matches the screen.
- Revisit if: the Arc rep tops us up, in which case we go back to $1,000 / $120 / $880.

## D-001 · Project = Deposit Keeper on Arc, Consumer track · 2026-11-13, 15:25 PST
- Context: three idea-gauntlet runs (45 ideas, 11 stress-tested by researcher agents). Team picked between the two survivors.
- Options considered: Deposit Keeper (Consumer · Arc) / Skin in the Game, bonded AI forecasts with buyer refunds (Agentic · Solana · Gemini bounty). Killed earlier: Hedge My Life, Voicepay, Odds Radio, Weatherproof, Drain Guard, Agent Credit Line, Haggler, Agent Mutual.
- Decision: Deposit Keeper. USDC escrow contract on Arc testnet (no admin withdrawal; funds go only to tenant or landlord); move-in/move-out photo hashes committed onchain; Python vision pipeline drafts itemized deductions (normal wear never charged, costs from a fixed price table, low-confidence findings dropped); undisputed amount pays out immediately, deductions need tenant acceptance or an arbiter ruling. Yield vault is simulated (Circle USYC is institution-only). Consumer track, Arc chain award, no bounties.
- Why: strongest Impact and Product/UX story (USC renters; California AB 2801 now requires landlords to photograph units at move-in/move-out, 21-day return rule, no state deposit interest); fits the team (Python AI, simple Solidity, consumer frontend); the combination of neutral escrow + tamper-proof photos + AI-proposed split is unclaimed per prior-art search (photo-compliance apps like Timemark/RentCheck don't hold deposits).
- Trade-off accepted: no bounty, so one finalist route fewer than Skin in the Game (Consumer track winner, top Arc in Consumer, top 3 overall).
- Revisit if: the vision model fails the 5-pair photo test (misses real damage or flags a lighting-only change) by Sat Nov 14 EOD. Fallback: Skin in the Game (already researched).
