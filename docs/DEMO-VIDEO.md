# Demo video script (matches the app on main, Tue Nov 17)

**Target 2:30, hard max 3:00.** Consumer track · Arc chain award · no bounties (QuickNode Streams only if D-011 lands).
Demo path: docs/STATUS.md (D-002 1:100 scale, D-004 landlord review, D-009 wall mark, D-010 normal wear shown at $0).
Voiceover pace: ≤ 2.3 words/sec. Word counts are in brackets. **Bold** text is the app's exact on-screen label.

> **What's real (Tue Nov 17):**
> - Escrow deployed and source-verified on Arc testnet: `0xe3791a88E125ce9e826FB07f84BF88625d9f3e98` (`shared/addresses.json`).
> - App screens on main: the home screen "Try Deposit Keeper" with **Start a demo deposit** (creates a fixed $10 demo lease and opens it as the tenant); the lease overview with **Pay deposit**; **Take move-in photos** / **Take move-out photos** (**Use sample photos** or **Add photo** per shot, **Done**, then **Record photos**); the photo screen headings **Photos recorded**, **Report ready** and **Report sent**; the landlord's **Compare photos** → **Analyze photos**; the report "Review proposed charges" (lower a charge with "Charge amount in dollars" + **Keep change**, or **Remove charge**, then **Send report**); the tenant's **Review deductions** → **Accept $1.20 in deductions** or **Dispute a deduction**; and a **Proof** list with **View proof** links.
> - Switch between people with the **Tenant** / **Landlord** buttons in the "Demo identity · not sign-in" bar. The note "Testnet demo: amounts scaled 1:100" sits under that bar.
> - There is no form to type in a lease. **Start a demo deposit** creates the lease (a real `createLease` tx) with a fixed address, tenant and shot list; the tenant still taps **Pay deposit**.
>
> **Still placeholders:** the tx links below. No explorer link goes in this file until a real run produces it. Fill them in from the final run only. Never show a made-up tx (PLAN.md rule). If a step isn't wired, cut it from the video.
>
> Tx links from the final run (labels as the app's Proof list shows them):
> - "Move-in photos recorded": `https://explorer.testnet.arc.io/tx/0xffd5801d58cd46593868e25339367f8fe56fa8b328cc0cff44d16e66b04f4418`
> - "$8.80 sent to you" (report sent): `https://explorer.testnet.arc.io/tx/0xa5e22bebde73b2f9346aa8bdf258adf9bea9ad7750d70d1509fb1cfca90f9a69`
> - "$1.20 released to the landlord" (accepted): `<RELEASE_TX_URL>`

## Script

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:10 | Phone-width app on the landlord's "Review proposed charges" screen, blurred. Title card: **"Deposit Keeper"**. | When you move out, your landlord can hold your deposit for up to three weeks, and you can't check the charges. [21] |
| 0:10–0:25 | **Wow moment.** The report un-blurs:<br>• the wall-mark card, **$1.20**, with the move-in/move-out photo pair and the "Found" line<br>• "Normal wear, no charge (1)": the nail-hole card tagged "Normal wear · Not charged.", **$0.00**<br>• cut to the tenant's **Proof** list: "$8.80 sent to you" (clip from step 4) | Deposit Keeper compares your move-in and move-out photos, charges only real damage, never normal wear, and sends the rest back the same day. Here's how. [25] |
| 0:25–0:40 | **Step 1.**<br>• Home screen "Try Deposit Keeper": tap **Start a demo deposit** ("Setting up your deposit…"). The $10 lease opens with **Tenant** selected in the demo identity bar; the overview says "Pay your deposit."<br>• Point at "Testnet demo: amounts scaled 1:100" under the demo bar.<br>• Tap **Pay deposit** ("Paying…"); "Deposit paid. **View proof**" appears. | Start a demo deposit. The tenant pays it into a neutral escrow neither side can take alone. It's a testnet demo, so amounts are scaled one to a hundred. [29] |
| 0:40–0:55 | **Step 2.**<br>• Tap **Take move-in photos**. The "Move-in photos" shot list: "living room / Living room wall, wide shot" … "bedroom / Wall above the bed (picture hooks)".<br>• Tap **Use sample photos** ("Adding sample photos… 1 of 5", sped up) until "5 of 5 photos added", then **Done** → **Record photos**.<br>• "Move-in photos recorded" with a **View proof** link. | At move-in, the tenant photographs each spot from a guided shot list. A fingerprint of the photo set is recorded onchain, so nobody can swap them later. [27] |
| 0:55–1:25 | **Step 3.**<br>• **Take move-out photos**: the same shots, **Use sample photos**, **Done** → **Record photos**. "Move-out photos recorded"; the heading reads **Photos recorded**.<br>• Switch to **Landlord**, tap **Compare photos**, then **Analyze photos**. "Comparing photos: 2 of 5 done. Now checking: living room." (sped up).<br>• The heading changes to **Report ready**; tap **See the report** → "Review proposed charges": wall mark **$1.20** with its photo pair; "Normal wear, no charge (1)" with the nail hole at **$0.00**.<br>• Point at "Charge amount in dollars" and **Remove charge** (don't change them), then tap **Send report** and confirm **Send report**. | At move-out, the same shots again. The AI compares each pair. It flags a paint mark on the wall: damage, one dollar twenty, priced from a fixed table, not by the AI. The nail hole is normal wear, so it costs nothing. The landlord can lower or remove charges, never add them, then sends. [54] |
| 1:25–1:40 | **Step 4.**<br>• Optional 1 s cutaway: the landlord's photo screen now reads **Report sent** (Send report itself goes back to the overview).<br>• Switch to **Tenant**. The overview: "Deductions under review" **$1.20**, with "Refund to you" **$8.80**.<br>• The **Proof** list: "$10.00 held in escrow", "Move-in photos recorded", "$8.80 sent to you", each with **View proof**. | The moment it's sent, the undisputed eight dollars eighty goes back to the tenant. Not in three weeks. Now. Every step has a proof link. [25] |
| 1:40–1:55 | **Step 5.**<br>• Tap **Review deductions**. Show **Dispute a deduction** briefly (don't submit).<br>• Tap **Accept $1.20 in deductions** and confirm.<br>• The **Proof** list gains "$1.20 released to the landlord" with **View proof**. | The tenant agrees with the charge, so the dollar twenty goes to the landlord. If they disagreed, they could dispute it and send it to a neutral reviewer. [28] |
| 1:55–2:10 | **Architecture slide (15 s):**<br>Phone web app (React + Vite) → Python server → Claude vision (fixed price table, normal wear $0, low confidence dropped) → USDC escrow contract on Arc testnet. | Under the hood: a React web app, a Python server, Claude vision for the photo comparison, and a USDC escrow contract on Arc, where fees are paid in USDC. [29] |
| 2:10–2:22 | **Onchain proof.**<br>• Tap **View proof** next to "$8.80 sent to you" to open the Arc testnet explorer (`explorer.testnet.arc.io`) at `https://explorer.testnet.arc.io/tx/0xa5e22bebde73b2f9346aa8bdf258adf9bea9ad7750d70d1509fb1cfca90f9a69`.<br>• Show the escrow contract address and the $8.80 transfer to the tenant.<br>• Then **View proof** next to "Move-in photos recorded" (`https://explorer.testnet.arc.io/tx/0xffd5801d58cd46593868e25339367f8fe56fa8b328cc0cff44d16e66b04f4418`, the `commitPhotos` tx). | Here's that payout on the Arc testnet explorer: our escrow contract, the eight eighty to the tenant. And here's the move-in photo set's fingerprint, recorded onchain. [26] |
| 2:22–2:30 | Logo + one line: **"Deposit Keeper: fair deposits, returned the day you move out."** Team names. | Deposit Keeper. Fair deposits, returned the day you move out. [10] |

**Total 274 words over 2:30, about 1.83 words/sec.** Busiest row: the 2:10–2:22 onchain proof at 2.17 words/sec. Every row is ≤ 2.3. There's slack for pauses, and room for one more line in step 5 if a judge needs it.

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
- [ ] The "Testnet demo: amounts scaled 1:100" note, visible at least once. It's in the app under the demo identity bar (`app/src/components/DemoBar.tsx`); show it in the step 1 clip.
- Not applicable, because we're not entered: Agentic, DeFi, ElevenLabs, Gemini, Grok Bot. QuickNode only if D-011's Streams work lands (see the recording checklist).

## Recording checklist
- [ ] 1080p or higher, browser zoom 125%, phone-width window (about 430 px) for app shots.
- [ ] Notifications off (Do Not Disturb), clean dock and menu bar.
- [ ] Fresh incognito profile. Pre-open the tabs: the app (switch people with **Tenant** / **Landlord** in the demo identity bar) and the Arc explorer.
- [ ] Testnet wallets funded. Open the hosted API's `/health` first (`ok: true`), and no deploys while recording. For a fresh lease, tap **Start a demo deposit** on the home screen.
- [ ] Use **Use sample photos** on both photo screens: the tested set p1 p2 p3 p5 p7 (p3 wall mark @0.90, p7 nail holes as normal wear @0.60). Never add p4, which gives $7.60 / $2.40 instead of the demo amounts.
- [ ] Keep DevTools and the Network tab closed so the X-Demo-Token header never appears on camera, and don't show any URL that contains the token.
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
