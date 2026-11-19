# Demo video script (v7, final cut 2:35)

Consumer track · Arc chain award · no bounties.

> **What this file is:**
> - **The video is final and silent:** `Deposit_Keeper_demo_silent_v6.mp4`, 2:35. Facecam goes in the **bottom-right** corner, which is empty in every scene, including the intro, slides and closing card. The QR code sits top-right.
> - **The voiceover below is the planned script, not the final audio.** Pablo records it over the silent cut, and the wording may shift slightly in the booth.
> - **Timings come from the silent cut:** each time is when that picture appears. Scenes cross-fade, so allow about half a second.
> - **Wording rules:**
>   - Say "the AI", never "Claude".
>   - Say "a fingerprint of the photo set is recorded onchain" (one hash per photo set), never "each photo's fingerprint".
>   - No legal claims or stats in the voiceover. The only numbers are the ones on screen.
> - **On-screen column:** written from the scene titles plus the app's labels on main (each one checked in `app/src` / `server/app`). It hasn't been checked frame by frame against the video.

## The flow shown (app on main, d833fa6)
1. **Landlord: "Set up a lease" → Create lease.** Tenant John Doe, Marks Tower (612 Hellman Way, Los Angeles), $10 deposit. The note "Testnet demo: amounts scaled 1:100" sits under the demo bar on every screen.
2. **Tenant: "You're invited" → Review lease → Pay deposit.** "$10.00 held in escrow".
3. **Guided move-in photos.** One step per spot, each with a **Reference Photo** and **Your Photo** ("Take or Choose Photo", "Match the reference angle and framing."), then **Record photos**. A fingerprint of the photo set is recorded onchain ("Move-in photos recorded").
4. **Guided move-out photos with a reference.** Each spot shows "Your saved move-in photo of this spot." Then **Record photos**.
5. **The AI compares the pairs.** Landlord: **Compare photos** → **Analyze photos** ("Comparing photos…").
6. **Landlord review ("Review proposed charges"):** wall mark **$1.20** (damage), and under "Normal Wear, No Charge (1)" the pin hole at **$0.00**. The landlord can lower (**Keep change**) or **Remove charge**, never raise.
7. **Send report.** The **$8.80** refund is paid in the same transaction ("$8.80 sent to you").
8. **Tenant: Review deductions → Accept $1.20 in deductions**, or **Dispute a deduction**.
9. **Settlement:** "$1.20 released to the landlord". Every step has a **View proof** link.

## Tx links (lease id 25, Arc testnet, Nov 19)
Each one was checked on the explorer: status ok, sent to escrow `0xe3791a88E125ce9e826FB07f84BF88625d9f3e98`, with the amounts read from the decoded input and token transfers.

| Step (Proof label) | Tx | USDC |
|---|---|---|
| Lease created (`createLease`) | https://explorer.testnet.arc.io/tx/0xa59207833b1529fe45d0e8b4478a2f58a707adf35274a21584b41d8fc391bd2a | – |
| "$10.00 held in escrow" (`deposit`) | https://explorer.testnet.arc.io/tx/0xf5b7690ac457d7cdb158f459135e88ba7ffb08eb7c3658983334e52137b55d8a | 10.00 tenant → escrow |
| "Move-in photos recorded" (`commitPhotos`, phase 0) | https://explorer.testnet.arc.io/tx/0x94d6500f17eb4c7feb3a44ecffd131865b878f7c1efe45514e5b38b8555eec37 | – |
| "Move-out photos recorded" (`commitPhotos`) | https://explorer.testnet.arc.io/tx/0x7e58d968553d3875f51e4c461e326b84ea3e01e4de081b2460c3a8933ad001e4 | – |
| "$8.80 sent to you" (`proposeDeductions`, deduction 1.20) | https://explorer.testnet.arc.io/tx/0x6182d803fa671f2ab32f1a7846313f67a018a6538d690205b455287748ad61fd | 8.80 escrow → tenant |
| "$1.20 released to the landlord" (`accept`) | https://explorer.testnet.arc.io/tx/0xfb8a4328dd4d982705429ea49bb99c1494e8ea30af23212376b75977ccd3c755 | 1.20 escrow → landlord |

## Script (planned voiceover v7 over the silent cut)

| Time | Scene / on screen | Planned voiceover [words · words/sec] |
|---|---|---|
| 0:00–0:12 | **Intro.** Title, then "Deposit Keeper". | 0:00 You move out. 0:03 Your landlord decides what you get back. 0:06 Was it fair? And how long will it take? 0:09 Deposit Keeper: fair deposits, checked by AI, held in USDC escrow. [30 · 2.50] |
| 0:12–0:27 | **The result first.** The landlord's report: the wall-mark finding at **$1.20** with its before/after pair; the pin hole under "Normal Wear, No Charge (1)" at **$0.00**; the tenant's **$8.80** back. | 0:12 Here is the result. The AI compared the photos and found one real problem: paint marks on the wall, one dollar twenty. 0:19 A tiny pin hole is normal wear, so it costs nothing. 0:23 The tenant gets eight eighty back. [39 · 2.60] |
| 0:27–0:40 | **Step 1: Lease.** Landlord "Set up a lease": John Doe, Marks Tower, $10.00 deposit → **Create lease**. Tenant "You're invited" → **Review lease** → **Pay deposit**; "Testnet demo: amounts scaled 1:100" under the demo bar. | 0:27 The landlord sets up the lease for the tenant. 0:34 The tenant pays, and the deposit is held in USDC escrow on Arc. Ten dollars here stands in for a thousand. [30 · 2.31] |
| 0:40–0:50 | **Step 2: Move-in.** Guided capture, one spot per step: **Reference Photo** / **Your Photo**, "Take or Choose Photo", then **Record photos**. | At move-in, the app guides the tenant photo by photo, one shot for each spot in the room. Once they confirm, the set is locked. [25 · 2.50] |
| 0:50–1:02 | **Step 3: Move-out.** Each spot shows "Your saved move-in photo of this spot." as the reference; **Record photos**; "Move-out photos recorded". | At move-out, the original photo is shown as a reference, so the tenant shoots the same angles again. Only a fingerprint of the photo set is recorded onchain. [28 · 2.33] |
| 1:02–1:11 | **Step 4: The AI compares.** Landlord **Compare photos** → **Analyze photos**, "Comparing photos…". | Then the AI compares each before and after pair. It describes what changed. A fixed price table decides what that costs. [21 · 2.33] |
| 1:11–1:20 | **Landlord review and send.** "Review proposed charges": **Keep change** / **Remove charge** on the $1.20 finding, the $0.00 normal-wear line, then **Send report**; "$8.80 sent to you". | 1:11 The landlord can lower or remove a charge, never raise one. 1:16 Sending the report pays the undisputed refund in the same transaction. [22 · 2.44] |
| 1:20–1:34 | **Step 5: Tenant.** **Review deductions**: the same photos and reasons; **Dispute a deduction** shown; **Accept $1.20 in deductions**. | 1:20 The tenant sees the same photos and the same reasons, and can dispute to a neutral reviewer. 1:25 Or just accept. Eight eighty back to the tenant, one twenty to the landlord. Done. [32 · 2.29] |
| 1:34–1:38 | **The outcome.** Settled lease: $10.00 → $8.80 to the tenant, $1.20 to the landlord; the Proof list with **View proof** links. | Settled in minutes, with a proof link for every transfer. [10 · 2.50] |
| 1:38–1:58 | **How it works.** A packet travels along the line and each part lights up: web app → Python server → AI vision → USDC escrow contract on Arc. | 1:38 Under the hood, four parts. A web app for tenants and landlords. 1:42 A Python server that enforces the rules. 1:46 AI vision that only describes what it sees. 1:50 And a USDC escrow contract on Arc that holds the money and pays out by the rules. 1:56 The AI never makes the final call. [51 · 2.55] |
| 1:58–2:15 | **Why you can trust it.** Five rules check off and a ring fills to 5/5. | 1:58 So why trust it? The rules live in code, not in the AI. 2:00 It only describes. 2:02 Prices come from a fixed table. 2:05 Normal wear is never charged. 2:08 The landlord can only lower a charge. 2:11 And the refund is paid right away. [41 · 2.41] |
| 2:15–2:27 | **Onchain proof.** Arc testnet explorer: the payout tx (8.80 USDC escrow → tenant), then the move-in `commitPhotos` tx (links above). | 2:15 Every step leaves a proof on the block explorer. Here is the eight eighty payout to the tenant. 2:19 And here, the fingerprint of the move-in photo set, recorded onchain. [29 · 2.42] |
| 2:27–2:35 | **Close.** "Deposit Keeper: fair deposits, returned the day you move out." Team names; QR code top-right. | 2:27 Deposit Keeper. Fair deposits, returned the day you move out. 2:31 Built by Pablo, Marcus and Luka. Scan the code to try it. [22 · 2.75] |

**Total 380 words over 2:35, about 2.45 words/sec.** Busiest scene: 2:27 at 2.75 words/sec. Scenes over the v7 target of 2.5 words/sec: 2:27 (2.75), 0:12 (2.60), 1:38 (2.55).

### Claims to keep honest (checked in code)
- **Deposit cap (true in code; no longer in the v7 voiceover):** the server caps the deduction at the deposit (`server/app/leases.py`, `min(…, deposit_cents)`). The contract also reverts if the deduction is more than the deposit (`DeductionTooHigh`, `contracts/src/DepositEscrow.sol`).
- **Low-confidence findings dropped (true in code; no longer in the v7 voiceover):** cutoffs are damage 0.7 and normal wear 0.5 (`MIN_CONFIDENCE`, `integrations/vision/analyze.py`).
- **"A fixed price table decides what that costs":** `integrations/vision/price_table.json`, loaded by the server. It's not shown on screen.
- **"Never raise one" / "can only lower a charge":** the server rejects increases ("Costs can only be lowered", `server/app/leases.py`).
- **"Pays the undisputed refund in the same transaction":** `proposeDeductions` pays the tenant's 8.80 in the same tx that stores the report hash (lease 25 tx above).
- **"Settled in minutes":** lease 25 went from `createLease` (08:27:11 UTC) to `accept` (08:28:37 UTC) in under two minutes.
- **"Dispute to a neutral reviewer":** the dispute sends the lease to the arbiter ("Sent to a neutral reviewer"). The ruling itself isn't in the app, so the video doesn't show one.
- **Simulated interest: cut.** The app doesn't show it.

## Requirement shots (in the silent cut)
- [ ] **Consumer:** the real frontend at phone width. No seed phrase, wallet popup or gas. "Proof" links are fine.
- [ ] **Arc:** the Arc **testnet** explorer with **our** escrow address and the lease 25 payout tx, plus the move-in `commitPhotos` tx.
- [ ] The AI report with one damage line ($1.20) and one normal-wear $0.00 line.
- [ ] "Testnet demo: amounts scaled 1:100", visible at least once (under the demo bar on every app screen).
- Not applicable, because we're not entered: Agentic, DeFi, ElevenLabs, Gemini, Grok Bot, QuickNode.

## Voiceover recording (Pablo)
- [ ] Record over `Deposit_Keeper_demo_silent_v6.mp4`. Start each line at its time above, and finish before the next scene's cross-fade.
- [ ] If a line runs long, cut words rather than rush (v7 note).
- [ ] Say "the AI", and "a fingerprint of the photo set". No legal claims or stats.
- [ ] Facecam goes in the bottom-right corner only. Keep the QR code (top-right) uncovered.
- [ ] Our own voice. We're not entered for ElevenLabs, so TTS would only be a production choice.

## Live pitch backup
- [ ] Open the hosted API's `/health` first (`ok: true`). No deploys during the pitch.
- [ ] Keep DevTools and the Network tab closed so the X-Demo-Token header never appears on screen, and don't show any URL that contains the token.

## Upload
- YouTube **unlisted**, or Google Drive set to "Anyone with the link".
- Open the link in an incognito window to confirm a judge can play it, then paste it into Devpost.
- Length must be 2–3 minutes (2:35).
