# Demo video script (ROUGH DRAFT for the Sun 9 PM run-through)

**Target 2:30, hard max 3:00.** Consumer track · Arc chain award · no bounties.
Demo path: docs/STATUS.md (D-002 1:100 scale, D-004 landlord review, D-009 wall mark, D-010 normal wear shown at $0).
Voiceover pace: ≤ 2.3 words/sec. Word counts are in brackets.

> **Not built yet. Placeholders to swap before recording:**
> - The app screens: Marcus's mock exists; the real app/ does not yet.
> - The deployed escrow address: `shared/addresses.json` is still `{}`.
> - The real tx links.
> - The final screen names.
>
> Never show a made-up tx (PLAN.md rule). If a step isn't wired, cut it from the video.

## Script

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:10 | Phone-width app on the landlord's "Move-out report" screen, blurred. Title card: **"Deposit Keeper"**. | When you move out, your landlord can hold your deposit for up to three weeks, and you can't check the charges. [20] |
| 0:10–0:25 | **Wow moment.** The report un-blurs:<br>• before/after photos side by side, with the wall mark outlined in red: **"Damage · $1.20"**<br>• a nail hole card: **"Normal wear · $0"** (grey)<br>• a green banner: **"$8.80 sent to you today"** | Deposit Keeper compares your move-in and move-out photos, charges only real damage, never normal wear, and sends the rest back the same day. Here's how. [25] |
| 0:25–0:40 | **Step 1.**<br>• The landlord creates the lease: address, tenant, $10 deposit.<br>• Switch persona to Tenant and tap **"Pay $10 into neutral escrow"**.<br>• It shows "Held safely: neither you nor your landlord can take it alone".<br>• The note "Testnet demo: amounts scaled 1:100" is visible. | The landlord creates the lease. The tenant pays the deposit into a neutral escrow. Neither side can take it alone. This is a testnet demo, so amounts are scaled one to a hundred. [33] |
| 0:40–0:55 | **Step 2.**<br>• The move-in shot list: "Living room: wall by the door", "Living room: wall above the bed"…<br>• Upload 2–3 photos quickly (sped up), then tap **Done**.<br>• A small "Proof" link appears. | At move-in, the tenant photographs each spot from a guided shot list. Each photo's fingerprint is recorded onchain, so nobody can swap them later. [24] |
| 0:55–1:20 | **Step 3.**<br>• Move-out: the same shots again, then the landlord taps **"Analyze"**.<br>• "Analyzing photos… living room 2 of 5" (sped up).<br>• The report: wall mark **Damage · $1.20** with "Why?" open ("price from the fixed table"); nail hole **Normal wear · $0**.<br>• The landlord taps **"Send report"**. | At move-out, the same shots again. The AI compares each pair. It flags a paint mark on the wall: damage, one dollar twenty, priced from a fixed table, not by the AI. The nail hole is normal wear, so it costs nothing. The landlord can lower or remove charges, never add them, then sends. [52] |
| 1:20–1:35 | **Step 4.**<br>• Tenant view: the green banner **"$8.80 sent to you today"**.<br>• The payout timeline with a "Proof" link on each step. | The moment it's sent, the undisputed eight dollars eighty goes back to the tenant. Not in three weeks. Now. Every step has a proof link. [25] |
| 1:35–1:55 | **Step 5.**<br>• The tenant taps **"Accept $1.20"**; the timeline shows "$1.20 settled" with a Proof link.<br>• Show the "Appeal" button briefly.<br>• Interest line: "**Simulated** interest: $0.03". | The tenant agrees with the charge, so the dollar twenty goes to the landlord. If they disagreed, they could appeal to a neutral reviewer. The timeline also shows the interest the deposit would have earned, simulated in this demo. [39] |
| 1:55–2:10 | **Architecture slide (15 s):**<br>Phone app (Next.js) → Python server → Claude vision (fixed price table, normal wear $0, low confidence dropped) → USDC escrow contract on Arc testnet. | Under the hood: a Next.js app, a Python server, Claude vision for the photo comparison, and a USDC escrow contract on Arc, where fees are paid in USDC. [28] |
| 2:10–2:22 | **Onchain proof.**<br>• Click the "Proof" link from step 4 to open the Arc testnet explorer (`explorer.testnet.arc.io`).<br>• Show the escrow contract address and the $8.80 transfer to the tenant.<br>• Then the `commitPhotos` tx. | Here's that payout on the Arc testnet explorer: our escrow contract, the eight eighty to the tenant, and the photo fingerprints. [21] |
| 2:22–2:30 | Logo + one line: **"Deposit Keeper: fair deposits, returned the day you move out."** Team names. | Deposit Keeper. Fair deposits, returned the day you move out. [10] |

**Total about 277 words over 2:30, about 1.85 words/sec.** There's slack for pauses, and room to add one line in step 3 if a judge needs it.

### Claims to keep honest
- **"Up to three weeks":** this is California's 21-day return rule (Civil Code §1950.5). It's fine for a California pitch; say "in California" if the audience is mixed.
- **"Same day":** applies to the **undisputed** amount only. The voiceover says "the rest", not the whole deposit.
- **Interest:** say "simulated" on screen and in the voiceover. Who gets the interest is still an open product decision, so don't say "earned for you".
- **"Charges only real damage":** the AI drafts the report and a human sends it. Keep "the landlord can lower or remove charges, never add them".

## Requirement shots (must be visible)
- [ ] **Consumer:** the real frontend in a phone-width window. No seed phrase, wallet popup, gas, "USDC" or "tx" wording on the app screens. "Proof" links are fine.
- [ ] **Arc:** the Arc **testnet** explorer showing **our** escrow contract address and at least one of our txs. The payout tx is the best choice; ideally also `commitPhotos`.
- [ ] The AI report screen with one damage line and one normal-wear $0 line. This is the product's core claim.
- [ ] The "Testnet demo: amounts scaled 1:100" note, visible at least once.
- Not applicable, because we're not entered: Agentic, DeFi, ElevenLabs, QuickNode, Gemini, Grok Bot.

## Recording checklist
- [ ] 1080p or higher, browser zoom 125%, phone-width window (about 430 px) for app shots.
- [ ] Notifications off (Do Not Disturb), clean dock and menu bar.
- [ ] Fresh incognito profile. Pre-open the tabs: app (landlord), app (tenant), Arc explorer.
- [ ] Testnet wallets funded. Run the demo reset script (Pablo, Mon) right before recording.
- [ ] Use the photo pairs that pass: p3 or p4 (wall mark, 0.90) and p7 (nail hole, normal wear @0.60). Test them on the hosted server first.
- [ ] Turn cursor highlighting on.
- [ ] Record each step as its own clip, speed up uploads and "Analyzing…", and cut the dead air.
- [ ] Keep a backup recording of the full live demo for the pitch (PLAN.md, Tue).

## Narration
- Record our own voice, or use a TTS voice. We're not entered for the ElevenLabs bounty, so AI narration is only a production choice. On its own it wouldn't count for that bounty, since the product itself would have to use ElevenLabs.
- If we use TTS: pull the Voiceover column into `docs/voiceover.txt`, one block per row. Pick a calm, neutral voice, and use normal speed or slightly slower (about 0.95×).

## Upload
- YouTube **unlisted**, or Google Drive set to "Anyone with the link".
- Open the link in an incognito window to confirm a judge can play it, then paste it into Devpost.
- Length must be 2–3 minutes.
