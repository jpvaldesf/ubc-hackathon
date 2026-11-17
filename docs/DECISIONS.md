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

## D-013 · Photo `url` serves a small preview; `original_url` added · 2026-11-16, 21:38 PST
- Context: the Mon night phone run worked end to end, but photos loaded slowly. The server sent the full phone originals (1.7–3.9 MB each, ~27 MB per lease) through the laptop tunnel.
- Options considered: leave it (hosting alone won't fix 27 MB on a phone) / the app resizes before upload (changes what gets hashed onchain, and it's Marcus's lane) / the server keeps the original and also writes a small display copy.
- Decision: on upload the server writes `<shot>.preview.jpg` (JPEG, long side 1280 px, quality 80, phone rotation applied) next to the original. In `photos`, `url` now points to the preview and a new `original_url` points to the unchanged original. `sha256` (the onchain fingerprint) and the AI both still use the original. If a preview can't be made, `url` stays the original. Leases uploaded before this change keep `url` = original. The app needs no change.
- Why: measured on the real run's 10 photos, 26.8 MB → 1.41 MB (19× smaller) for ~0.15 s more per upload. It doesn't touch the proof or the tested AI input.
- Revisit if: judges want to inspect full-size photos in the app (link `original_url`), or the AI is ever switched to previews (it would need a re-test first).

## D-012 · Hosted server: demo token on writes, daily caps, /health network fields · 2026-11-16, 20:55 PST
- Context: the security audit found `X-User-Id` is the API's only auth. Once the server is hosted with the testnet keys and the Anthropic key, anyone with the URL could create leases, spend the server-held tenant wallet's USDC and gas, and run Analyze on our Anthropic credits. Marcus also asked for `network`/`explorer` in `/health` so Proof links don't have to guess. docs/API.md is frozen (D-005), so these additions need a decision.
- Options considered: no protection (rely on an unlisted URL) / real user auth (too big for the time left) / a shared demo token on writes plus per-day caps.
- Decision: additive change to docs/API.md. (1) When `DK_DEMO_TOKEN` is set, every write needs header `X-Demo-Token`; a missing or wrong token gives `401 unauthorized`. Reads (`GET /leases/{id}`, `/health`, `/files`) stay open. (2) Per-day UTC caps on `POST /leases` and `POST /leases/{id}/report` (`DK_MAX_LEASES_PER_DAY`, `DK_MAX_REPORTS_PER_DAY`, default 20; host: 5 and 10); over the cap gives `429 rate_limited`. A rejected request (4xx) doesn't use up the cap. (3) Deposit cap is an env var (`DK_MAX_DEPOSIT_CENTS`, default 10000; host: 1000 = the $10 demo). (4) The server refuses to start with a non-localhost CORS origin and no token, unless `DK_ALLOW_OPEN=1`. (5) `/health` adds `network`, `explorer`, `demo_token_required`. Nothing existing changes shape; local dev with no token works as before.
- Why: stops drive-by use of the hosted wallets and API key before the demo, in under an hour of work. The token ships in the static Vite bundle, so it's not a secret from anyone who opens the app; the caps are what bound the worst case (a few dollars of Anthropic credits and testnet funds per day). The README says this plainly.
- Revisit if: someone drains the caps before the pitch (lower them or rotate the token on the host), or we add real sign-in after the hackathon.

## D-011 · Bounties: QuickNode Streams only, and only if the demo path works Mon 2 PM · 2026-11-15, 19:53 PST
- Context: we're entered in no bounties. Bounties are free to enter and don't conflict with the Consumer track or the Arc award, but each one needs its sponsor's tool as a core feature, and the demo path isn't connected end to end yet.
- Options considered: no bounties / QuickNode Streams / ElevenLabs / Gemini Prediction Markets / Grok Bot.
- Decision: build QuickNode Streams **only if** the full demo path works end to end on Arc testnet at the Mon Nov 16, 2 PM checkpoint. Then Mon evening, 2–4 h timebox: one Arc Testnet Stream on logs filtered to our escrow's events → signed webhook to the server → timeline steps marked "confirmed on Arc" in the app; README section (network, dataset, filter, destination, why); opt in on Devpost Tue. If the demo path isn't working by 2 PM, enter no bounties. Skip ElevenLabs, Gemini Prediction Markets and Grok Bot.
- Why: Streams supports Arc Testnet (QuickNode supported-chains docs and changelog) and fits a real need (the chain as source of truth for the lease timeline, including timeout calls the server didn't send). The other three would be add-ons or have no fit, and judges check "core, not add-on". The demo path wins the main prizes, so it comes first.
- Revisit if: the demo path is done early (start Streams sooner), or hosting slips past Mon evening (the webhook needs a public URL, so drop it).

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
