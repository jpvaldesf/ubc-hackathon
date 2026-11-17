# STATUS (keep this short; Claude updates it after every task)

**Today's one goal (Mon Nov 16, 8 PM → Tue noon freeze):** By Tue noon, a judge could open our hosted URL on their phone, run all 5 demo steps in the app with no script, and tap a Proof link at each money step that opens a real Arc testnet tx.
**Hosted demo (24/7, Render):** app https://deposit-keeper-app.onrender.com · API https://deposit-keeper-api.onrender.com · how to use it: server/README.md "Using the hosted demo".
**Demo path:**
1. Landlord creates a lease; tenant deposits $10 USDC (testnet scale 1:100, D-002) into escrow (tx on Arc explorer).
2. Move-in photos taken in-app; fingerprints committed onchain.
3. Move-out photos taken; AI report flags a wall mark ($1.20, damage, D-009) and small nail holes (normal wear, $0); landlord reviews and sends the report (D-004).
4. Undisputed $8.80 pays out to tenant immediately (tx).
5. Tenant accepts; $1.20 releases to landlord (tx); simulated interest shown.

## Done
- Roles assigned (Nov 13, 5 PM): Pablo onchain+backend, Marcus frontend, Luka AI vision+demo.
- Project chosen: Deposit Keeper (D-001). Explainer: https://claude.ai/artifact/UvpoQrNT1K8KoYQJAAEaxZ
- Sat 2:30 PM: sync skipped; decisions D-002…D-008 recorded (amounts in cents, 1:100 demo scale, landlord 48 h review, per-shot upload, contract timeouts, stack). docs/API.md frozen.
- Escrow contract written, 18 forge tests pass; ABI in shared/abi/. Deployed + source verified on Arc testnet: 0xe3791a88E125ce9e826FB07f84BF88625d9f3e98. Sun 6 PM: DemoRun lease #1 ran the whole path onchain ($10 in, $8.80 to tenant, $1.20 to landlord, escrow back to 0).
- Vision spike: **GO** against the PLAN.md bar (Sat Nov 14, Luka). claude-sonnet-5-5 at the 0.7 cutoff flagged both damaged pairs in 3/3 runs (re-confirmed by the packaged pipeline on Nov 15: p3 @0.88–0.90, p4 @0.88–0.93) with no false positives on p1, p2 and p5. Caveats: both are staged wall marks charged as repaint; carpet stain unproven; small test set; p3 before photo reused from an earlier shot. Full note: docs/status/luka.md · evidence: spikes/vision/README.md.

- Sun Nov 15 9 PM: demo steps 3–5 ran through the app on Arc testnet with real AI and exact demo amounts. Vision pipeline merged to main.
- Mon Nov 16: app photos screen, upload/commit/analyze wiring, pay-deposit and entry points merged (PRs #22, #23, #25). Server `smoke --stop-at funded|move_in` for demo reset (FakeChain only so far).
- Mon Nov 16, ~9:30 PM: **first full demo path in the app from a phone on Arc testnet** (lease l_75b8a3c6, links in the evidence table). Step 1 (create) still by script. Served from Pablo's laptop through Cloudflare tunnels (open mode + daily caps, D-012). Photo previews, 19× lighter, merged (D-013, PR #29).
- Mon Nov 16, ~11 PM: **hosted on Render** (PR #31): API (Docker, persistent disk, D-012 caps, open mode until the app sends the token) + app as a static site in live mode. Smoke lease on the host: createLease https://explorer.testnet.arc.io/tx/0x8a8f2053fc2fb52ab523d0d2423ed4267193b2a1be699fc206ae9d2c08b6c54b · deposit https://explorer.testnet.arc.io/tx/0xaf7e01bc0256070a19ee2b7cc56ed7ed8098e22169ec59b8b36df422246878df; data survived a redeploy.
- Mon Nov 16, night (Luka): demo video script matched to the app's labels (PR #26); README draft open (PR #33). Luka's hosted test used p1–p5 (p4 = second wall mark), so it showed $7.60 / $2.40, not the demo amounts.
- Tue Nov 17, ~9 AM: **demo amounts proven on the hosted stack** (Pablo's phone, lease l_62839344, demo set p1 p2 p3 p5 p7). Create by script; Pay deposit → photos → Analyze → Send report → Accept all in the app. AI: wall mark $1.20 @0.90, nail holes normal wear $0 @0.60, one finding dropped under the cutoff, nothing removed or lowered. 6/6 receipts status 1; USDC read from the logs: 10.00 in, 8.80 to tenant, 1.20 to landlord, lease escrow back to 0. Links in the evidence table.
## Next (max 5, in priority order)
1. Marcus, by noon: send `X-Demo-Token` on writes; show the "Testnet demo: amounts scaled 1:100" note; Create lease screen only if both are done by ~10:30.
2. Pablo: README "Contract & Arc" section + review PR #33; turn the token on once Marcus's PR is live (else open mode + caps for the freeze).
3. Luka: fill the `<..._TX_URL>` placeholders in docs/DEMO-VIDEO.md (from lease l_62839344 or the final recording run); README numbers; Devpost answers.
4. Tue 11 AM: qa-demo-tester + judge-panel on the hosted URL, fix the top 3. Noon: freeze.
5. Tue PM: record the 2–3 min video on a fresh lease (backup: Pablo's l_62839344 screen recording), `/submit-check`, submit by 11:59 PM PT.

## Milestones (our deadline: submitted Tue Nov 17, 11:59 PM PT · detail: docs/PLAN.md)
- Fri night: contract deployed + release tx; app scaffold + report screen; photos shot.
- Sat 1 PM: vision GO/NO-GO; API, schema and stack frozen (/decide). Sat night: Circle tx or fallback; server + vision packaged.
- Sun: pieces connected; first full run-through at 9 PM.
- Mon 2 PM: full demo path works end to end on testnet. Then hosting, judge-panel, fixes.
- Tue: freeze at noon, README + video, /submit-check, submit by 11:59 PM.
- Wed to Thu: buffer only (bug fixes, pitch drills). Sat 21: pitch in person.

## Blockers / open questions (for office hours, Telegram, or mentor)
- App gaps after the Mon night phone run (Marcus): no Create lease screen (step 1 by script); UI polish ("kinda ugly"); must send `X-Demo-Token` (D-012) before the token is turned on.
- Law check done (verified against Civil Code §1950.5 text (Justia)): AB 2801 move-out photos required since Apr 1 2025 (all tenancies); move-in photos for tenancies starting on/after Jul 1 2025; photos go with the itemized statement within 21 days; bad-faith penalty up to 2x deposit (subd. (m)).
- Escrow contract holds 11 USDC from earlier unfinished test leases (they unlock only via timeouts). Say "escrow back to 0" per lease, not for the whole contract.
- Open (from the vision spike): how to treat a tenant's own rug vs built-in carpet (the model calls area rugs belongings even when told otherwise). Pipeline location and API settled by D-005/D-008.
- Open product decisions: where interest goes, who pays the fee, appeal window length, price-table costs in v1.

## Proven integrations (with evidence)
| Integration | Status | Evidence (tx sig / response / link) |
|---|---|---|
| Arc testnet DepositEscrow deploy | Deployed, source verified | https://explorer.testnet.arc.io/tx/0x389693fbb99442aa7343e353c6df27d27f19eb4a30af256e660f417b6b4e4d2a |
| Arc testnet escrow release (DemoRun, lease #1) | Working: 7/7 txs status 1 | deposit https://explorer.testnet.arc.io/tx/0xb44a788bb2a2f01eb7f959ac1ef0a61d02514c93b5832a0cf3b90defb4c8d88c · propose ($8.80 to tenant) https://explorer.testnet.arc.io/tx/0xe29c4c5ccdac82eeae4112a440a3ab9b3af7eaa1661806c94a1e6d2bf7fd0109 · accept ($1.20 to landlord) https://explorer.testnet.arc.io/tx/0xd86ffb8e7c5484a71d9b7d71ccc5d1f81abc5fa9a4ac558a014c9d4a4355b693 |
| Server → Arc testnet (HTTP API, lease #2, $1) | create, deposit, both photo commits; manifest hashes match onchain | deposit https://explorer.testnet.arc.io/tx/0x761597e3d3d70b27fdffce526d1996db747b93904e3da9cad777c07990f924f8 · commit out https://explorer.testnet.arc.io/tx/0xd09bd0ab4726f11cd50dec63b8e1d1876302caa3ba0786adc6a5d3c62bbd5576 |
| Claude vision (claude-sonnet-5-5, structured JSON) | GO: 2 staged wall-mark pairs flagged 3/3 at 0.7 cutoff, 0 false positives; carpet stain unproven | spikes/vision/results/run11_p3_reshoot_bold_x3/p3_run1.json (damage/repaint @0.90, req_011Ch4Dcp8squfvzcHUqzwm7); run8_reshoot_closeup/p4_run1.json (damage/repaint @0.90, req_011Ch2MWf4fxn5qdcX69gCVR); runs 9–10 for p4 3/3 and clean pairs; summary: spikes/vision/README.md |
| Vision pipeline in the real server (analyze() via FastAPI on Arc testnet) | Proven Nov 15 | Pablo’s smoke run, lease l_cf673463: report in 24 s, p3 + p4 damage 120¢ @0.90, clean pairs no findings, deduction capped at 100¢ deposit ($1 test lease); txs createLease https://explorer.testnet.arc.io/tx/0x39efa863c69ff1b57157e2cef09d1eaac5c15acc504104ed9782a21ba4183714, accept https://explorer.testnet.arc.io/tx/0xced477e2b09f26d7345a7acb8d11acc65dbda8f6f4102420dbf668407dceab59 |
| **Full demo path in the app, from a phone (Mon Nov 16, lease l_75b8a3c6)** | Working: 6/6 receipts status 1, USDC moves read from the RPC; AI: wall mark $1.20 @0.90 + nail hole $0 @0.60 | create https://explorer.testnet.arc.io/tx/0x6e82191f0a33c0625a04b30e09cdc749aefba4837111caa88648293e42e9a429 · deposit (10 USDC tenant→escrow) https://explorer.testnet.arc.io/tx/0x2f8f7f16b0a6d584485a36c1379ea4d6e787408bf5e331077ad150aff6c92d4a · move-in commit https://explorer.testnet.arc.io/tx/0x4d8a9b059da15addaf219e9d74430f859399605c0dac890512c3cf8e18338952 · move-out commit https://explorer.testnet.arc.io/tx/0x4b4983c8aefe027bffc6d8876fe9bcabad827c0437c9a1e3866fa7043b6582c3 · send report (8.80 escrow→tenant) https://explorer.testnet.arc.io/tx/0xfc8fae8018253a9001e40b69be6c8a1ef63f83b024d62219fe03f9049f01924f · accept (1.20 escrow→landlord) https://explorer.testnet.arc.io/tx/0xba6877a082395d842855182b170858afd96ce44d76b9681f7065041bee688261 |
| **Demo path on the hosted stack (Render), Pay deposit in the app (Tue Nov 17, lease l_62839344)** | Working: 6/6 receipts status 1, all to the escrow; USDC moves read from the tx logs; AI: wall mark $1.20 @0.90 + nail holes $0 @0.60 | create https://explorer.testnet.arc.io/tx/0x1fa09cff1cc3583a168a90c4a234964f2adc4058cea948807a8395f5f2ecf799 · deposit (10.00 tenant→escrow) https://explorer.testnet.arc.io/tx/0xd075c1b9df2859e5275085726392974f4ff10867f3358fc7c4fe95f12a54ec02 · move-in commit https://explorer.testnet.arc.io/tx/0xfaf4929a7bf341a5f7bac8b3a24f0053a11d68f17b9e0ede4173c57ed0a6dba7 · move-out commit https://explorer.testnet.arc.io/tx/0x729fb201bc7c89014a9df4028e2d49020bcef5f21c900582a2d3e9459d05b1fd · send report (8.80 escrow→tenant) https://explorer.testnet.arc.io/tx/0xadd00e01b09987201bc0e9051a361961dba3624c0d94b18a1d55cdaaf5a364de · accept (1.20 escrow→landlord) https://explorer.testnet.arc.io/tx/0xde762bfa36e2cf943fb47a454c58aedd30f56f3f3f127c3fa543a82afdf96bdc |

## Judge runs (date · Tech/UX/Innov/Impact/Demo · verdict)
-
