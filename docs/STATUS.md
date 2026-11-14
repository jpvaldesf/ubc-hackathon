# STATUS (keep this short; Claude updates it after every task)

**Today's one goal:** Prove the AI move-out comparison works (5 photo pairs) and get one escrow release tx on Arc testnet.
**Demo path:**
1. Landlord creates a lease; tenant deposits $1,000 USDC into escrow (tx on Arc explorer).
2. Move-in photos taken in-app; fingerprints committed onchain.
3. Move-out photos taken; AI report flags carpet stain ($120, damage) and faded paint (normal wear, $0).
4. Undisputed $880 pays out to tenant immediately (tx).
5. Tenant accepts; $120 releases to landlord (tx); simulated interest shown.

## Done
- Roles assigned (Nov 13, 5 PM): Pablo onchain+backend, Marcus frontend, Luka AI vision+demo.
- Project chosen: Deposit Keeper (D-001). Explainer: https://claude.ai/artifact/UvpoQrNT1K8KoYQJAAEaxZ

## Next (max 5, in priority order)
1. Luka: vision spike, 5 pairs (2 clean, 2 damaged, 1 lighting-only). GO/NO-GO by Sat Nov 14 EOD.
2. Pablo: escrow spike on Arc testnet (deposit, propose, accept/appeal, release). Pass = one release tx link.
3. Marcus: clickable mock of the move-out report screen, then scaffold app/ with the 5 demo screens.
4. Sat Nov 14 sync (all): GO/NO-GO, confirm stack, agree docs/API.md, record with /decide.

## Milestones (deadline Fri Nov 20, 10:00 AM PT)
- Sat 14: spikes done, GO/NO-GO, API + stack agreed.
- Sun 15 to Mon 16: real contract deployed, Circle wallets, FastAPI server, frontend wired to the API.
- Tue 17: demo path works end to end on testnet. Run judge-panel.
- Wed 18: polish, README, qa-demo-tester run, record the backup demo video.
- Thu 19: submit on Devpost tonight (/submit-check), pitch drill.
- Sat 21: pitch in person.

## Blockers / open questions (for office hours, Telegram, or mentor)
- Verify AB 2801 effective dates and the bad-faith deposit penalty against the statute text before putting them in the pitch.
- Open product decisions: where interest goes, who pays the fee, appeal window length, price-table costs in v1.

## Proven integrations (with evidence)
| Integration | Status | Evidence (tx sig / response / link) |
|---|---|---|
|  |  |  |

## Judge runs (date · Tech/UX/Innov/Impact/Demo · verdict)
-
