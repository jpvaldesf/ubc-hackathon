# STATUS (keep this short; Claude updates it after every task)

**Today's one goal:** Prove the AI move-out comparison works (5 photo pairs) and get one escrow release tx on Arc testnet.
**Demo path:**
1. Landlord creates a lease; tenant deposits $10 USDC (testnet scale 1:100, D-002) into escrow (tx on Arc explorer).
2. Move-in photos taken in-app; fingerprints committed onchain.
3. Move-out photos taken; AI report flags carpet stain ($1.20, damage) and small nail holes (normal wear, $0); landlord reviews and sends the report (D-004).
4. Undisputed $8.80 pays out to tenant immediately (tx).
5. Tenant accepts; $1.20 releases to landlord (tx); simulated interest shown.

## Done
- Roles assigned (Nov 13, 5 PM): Pablo onchain+backend, Marcus frontend, Luka AI vision+demo.
- Project chosen: Deposit Keeper (D-001). Explainer: https://claude.ai/artifact/UvpoQrNT1K8KoYQJAAEaxZ
- Sat 2:30 PM: sync skipped; decisions D-002…D-008 recorded (amounts in cents, 1:100 demo scale, landlord 48 h review, per-shot upload, contract timeouts, stack). docs/API.md frozen.
- Escrow contract written, 18 forge tests pass; ABI in shared/abi/. Not deployed yet.

## Next (max 5, in priority order)
1. Luka: vision spike, 5 pairs (2 clean, 2 damaged, 1 lighting-only). GO/NO-GO at Sat Nov 14, 1 PM sync.
2. Pablo: deploy escrow + DemoRun on Arc testnet → release tx link here. Then FastAPI skeleton tonight.
3. Marcus: clickable mock of the move-out report screen, then scaffold app/ with the 5 demo screens.
4. Everyone: read D-002…D-008 in docs/DECISIONS.md and switch mocks to cents + the frozen docs/API.md. Luka: post vision GO/NO-GO here by 6 PM.

## Milestones (our deadline: submitted Tue Nov 17, 11:59 PM PT · detail: docs/PLAN.md)
- Fri night: contract deployed + release tx; app scaffold + report screen; photos shot.
- Sat 1 PM: vision GO/NO-GO; API, schema and stack frozen (/decide). Sat night: Circle tx or fallback; server + vision packaged.
- Sun: pieces connected; first full run-through at 9 PM.
- Mon 2 PM: full demo path works end to end on testnet. Then hosting, judge-panel, fixes.
- Tue: freeze at noon, README + video, /submit-check, submit by 11:59 PM.
- Wed to Thu: buffer only (bug fixes, pitch drills). Sat 21: pitch in person.

## Blockers / open questions (for office hours, Telegram, or mentor)
- Verify AB 2801 effective dates and the bad-faith deposit penalty against the statute text before putting them in the pitch.
- Open product decisions: where interest goes, who pays the fee, appeal window length, price-table costs in v1.

## Proven integrations (with evidence)
| Integration | Status | Evidence (tx sig / response / link) |
|---|---|---|
|  |  |  |

## Judge runs (date · Tech/UX/Innov/Impact/Demo · verdict)
-
