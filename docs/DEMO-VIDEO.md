# Demo video script (matches the app on main, Mon Nov 16)

**Target 2:30, hard max 3:00.** Consumer track · Arc chain award · no bounties (QuickNode Streams only if D-011 lands).
Demo path: docs/STATUS.md (D-002 1:100 scale, D-004 landlord review, D-009 wall mark, D-010 normal wear shown at $0).
Voiceover pace: ≤ 2.3 words/sec. Word counts are in brackets. **Bold** text is the app's exact on-screen label.

> **What's real (Mon Nov 16):**
> - Escrow deployed and source-verified on Arc testnet: `0xe3791a88E125ce9e826FB07f84BF88625d9f3e98` (`shared/addresses.json`).
> - App screens on main: the lease overview with **Pay deposit**; **Take move-in photos** / **Take move-out photos** (**Add photo** per shot, **Done**, then **Record photos**); the landlord's **Compare photos** → **Analyze photos**; the report "Review proposed charges" (lower a charge with "Charge amount in dollars" + **Keep change**, or **Remove charge**, then **Send report**); the tenant's **Review deductions** → **Accept $1.20 in deductions** or **Dispute a deduction**; and a **Proof** list with **View proof** links.
> - Switch between people with the **Tenant** / **Landlord** buttons in the "Demo identity · not sign-in" bar.
> - Create lease is **not** in the app. Pablo creates the demo lease by script before recording, so the video starts at **Pay deposit**.
>
> **Still placeholders:** the tx links below. No explorer link goes in this file until a real run produces it. Fill them in from the final run only. Never show a made-up tx (PLAN.md rule). If a step isn't wired, cut it from the video.
>
> Tx links from the final run (labels as the app's Proof list shows them):
> - "$10.00 held in escrow": `<DEPOSIT_TX_URL>`
> - "Move-in photos recorded": `<COMMIT_IN_TX_URL>`
> - "$8.80 sent to you" (report sent): `<PAYOUT_TX_URL>`
> - "$1.20 released to the landlord" (accepted): `<RELEASE_TX_URL>`

## Script

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:10 | Phone-width app on the landlord's "Review proposed charges" screen, blurred. Title card: **"Deposit Keeper"**. | When you move out, your landlord can hold your deposit for up to three weeks, and you can't check the charges. [21] |
| 0:10–0:25 | **Wow moment.** The report un-blurs:<br>• the wall-mark card, **$1.20**, with the move-in/move-out photo pair and the "Found" line<br>• "Normal wear, no charge (1)": the nail-hole card tagged "Normal wear · Not charged.", **$0.00**<br>• cut to the tenant's **Proof** list: "$8.80 sent to you" (clip from step 4) | Deposit Keeper compares your move-in and move-out photos, charges only real damage, never normal wear, and sends the rest back the same day. Here's how. [25] |
| 0:25–0:40 | **Step 1.** (The $10 lease was created by script before recording; no create screen is shown.)<br>• Select **Tenant** in the demo identity bar. The overview says "Pay your deposit."<br>• Tap **Pay deposit** ("Paying…"); "Deposit paid. **View proof**" appears. | The landlord already set up the lease. The tenant pays the deposit into a neutral escrow neither side can take alone. It's a testnet demo, so amounts are scaled one to a hundred. [33] |
| 0:40–0:55 | **Step 2.**<br>• Tap **Take move-in photos**. The "Move-in photos" shot list: "living room · Wall behind couch", "bedroom · Wall above the bed"…<br>• **Add photo** on 2–3 shots (sped up) until "5 of 5 photos added", then **Done** → **Record photos**.<br>• "Move-in photos recorded" with a **View proof** link. | At move-in, the tenant photographs each spot from a guided shot list. Each photo's fingerprint is recorded onchain, so nobody can swap them later. [24] |
| 0:55–1:25 | **Step 3.**<br>• **Take move-out photos**: the same shots, **Done** → **Record photos**.<br>• Switch to **Landlord**, tap **Compare photos**, then **Analyze photos**. "Comparing photos: 2 of 5 done. Now checking: living room." (sped up).<br>• **See the report** → "Review proposed charges": wall mark **$1.20** with its photo pair; "Normal wear, no charge (1)" with the nail hole at **$0.00**.<br>• Point at "Charge amount in dollars" and **Remove charge** (don't change them), then tap **Send report** and confirm **Send report**. | At move-out, the same shots again. The AI compares each pair. It flags a paint mark on the wall: damage, one dollar twenty, priced from a fixed table, not by the AI. The nail hole is normal wear, so it costs nothing. The landlord can lower or remove charges, never add them, then sends. [54] |
| 1:25–1:40 | **Step 4.**<br>• Switch to **Tenant**. The overview: "Deductions under review" **$1.20**, with "Refund to you" **$8.80**.<br>• The **Proof** list: "$10.00 held in escrow", "Move-in photos recorded", "$8.80 sent to you", each with **View proof**. | The moment it's sent, the undisputed eight dollars eighty goes back to the tenant. Not in three weeks. Now. Every step has a proof link. [25] |
| 1:40–1:55 | **Step 5.**<br>• Tap **Review deductions**. Show **Dispute a deduction** briefly (don't submit).<br>• Tap **Accept $1.20 in deductions** and confirm.<br>• The **Proof** list gains "$1.20 released to the landlord" with **View proof**. | The tenant agrees with the charge, so the dollar twenty goes to the landlord. If they disagreed, they could dispute it and send it to a neutral reviewer. [28] |
| 1:55–2:10 | **Architecture slide (15 s):**<br>Phone app (Next.js) → Python server → Claude vision (fixed price table, normal wear $0, low confidence dropped) → USDC escrow contract on Arc testnet. | Under the hood: a Next.js app, a Python server, Claude vision for the photo comparison, and a USDC escrow contract on Arc, where fees are paid in USDC. [28] |
| 2:10–2:22 | **Onchain proof.**<br>• Tap **View proof** next to "$8.80 sent to you" to open the Arc testnet explorer (`explorer.testnet.arc.io`) at `<PAYOUT_TX_URL>`.<br>• Show the escrow contract address and the $8.80 transfer to the tenant.<br>• Then **View proof** next to "Move-in photos recorded" (`<COMMIT_IN_TX_URL>`, the `commitPhotos` tx). | Here's that payout on the Arc testnet explorer: our escrow contract, the eight eighty to the tenant, and the photo fingerprints. [21] |
| 2:22–2:30 | Logo + one line: **"Deposit Keeper: fair deposits, returned the day you move out."** Team names. | Deposit Keeper. Fair deposits, returned the day you move out. [10] |

**Total 269 words over 2:30, about 1.79 words/sec.** Busiest row: step 1 at 2.20 words/sec. Every row is ≤ 2.3. There's slack for pauses, and room for one more line in step 5 if a judge needs it.

### Claims to keep honest
- **"Up to three weeks":** this is California's 21-day return rule (Civil Code §1950.5). It's fine for a California pitch; say "in California" if the audience is mixed.
- **"Same day":** applies to the **undisputed** amount only. The voiceover says "the rest", not the whole deposit.
- **"Priced from a fixed table":** true in code (`integrations/vision/price_table.json`), but not shown on screen, so it's voiceover only.
- **"Lower or remove, never add":** the app has "Charge amount in dollars" + **Keep change** and **Remove charge**, and the server rejects any increase ("Costs can only be lowered", `server/app/leases.py`).
- **Simulated interest: cut.** The app doesn't show it. It's only allowed back in the video (screen and voiceover) if Marcus adds an interest line to the app, labeled "simulated". Who gets the interest is still an open product decision, so never say "earned for you".
- **"Charges only real damage":** the AI drafts the report and a human sends it. Keep "the landlord can lower or remove charges, never add them".

## Requirement shots (must be visible)
- [ ] **Consumer:** the real frontend in a phone-width window. No seed phrase, wallet popup, gas, "USDC" or "tx" wording on the app screens. "Proof" links are fine.
- [ ] **Arc:** the Arc **testnet** explorer showing **our** escrow contract address and at least one of our txs. The payout tx is the best choice; ideally also `commitPhotos`.
- [ ] The AI report screen with one damage line and one normal-wear $0 line. This is the product's core claim.
- [ ] The "Testnet demo: amounts scaled 1:100" note, visible at least once.
  - **TODO (Marcus):** the app doesn't show this note anywhere yet (no match in `app/src`). Until it does, the step 1 voiceover says it, and we add it as an editor caption on the step 1 clip.
- Not applicable, because we're not entered: Agentic, DeFi, ElevenLabs, Gemini, Grok Bot. QuickNode only if D-011's Streams work lands (see the recording checklist).

## Recording checklist
- [ ] 1080p or higher, browser zoom 125%, phone-width window (about 430 px) for app shots.
- [ ] Notifications off (Do Not Disturb), clean dock and menu bar.
- [ ] Fresh incognito profile. Pre-open the tabs: the app (switch people with **Tenant** / **Landlord** in the demo identity bar) and the Arc explorer.
- [ ] Testnet wallets funded. Run the demo reset script (Pablo, Mon) right before recording.
- [ ] Use the photo pairs that pass: p3 or p4 (wall mark, 0.90) and p7 (nail hole, normal wear @0.60). Test them on the hosted server first.
- [ ] Turn cursor highlighting on.
- [ ] Record each step as its own clip, speed up uploads and "Comparing photos…", and cut the dead air.
- [ ] Keep a backup recording of the full live demo for the pitch (PLAN.md, Tue).
- [ ] **Only if D-011's QuickNode Streams work lands (Mon evening timebox):** record a 5–8 s shot of a timeline step marked "confirmed on Arc", then the Stream config (Arc testnet, filter on our escrow's events, webhook destination; crop out the webhook URL and any auth token). Fit it inside the 2:10–2:22 proof segment with at most ~10 extra voiceover words, and recount the pace. If Streams doesn't land, skip this shot and keep QuickNode out of the video.

## Narration
- Record our own voice, or use a TTS voice. We're not entered for the ElevenLabs bounty, so AI narration is only a production choice. On its own it wouldn't count for that bounty, since the product itself would have to use ElevenLabs.
- If we use TTS: pull the Voiceover column into `docs/voiceover.txt`, one block per row. Pick a calm, neutral voice, and use normal speed or slightly slower (about 0.95×).

## Upload
- YouTube **unlisted**, or Google Drive set to "Anyone with the link".
- Open the link in an incognito window to confirm a judge can play it, then paste it into Devpost.
- Length must be 2–3 minutes.
