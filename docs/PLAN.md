# Build plan: Deposit Keeper (written Fri Nov 13, 5 PM PT)

Deadline: **Fri Nov 20, 10:00 AM PT**. Our target: **submitted Thu Nov 19 night.** Pitch in person Sat Nov 21.
Every task below should move the 5-step demo path in `docs/STATUS.md`. If it doesn't, it waits until after Tue.

## Team rhythm
- **Daily standup 10:00 AM, 15 min** (`/standup`). Each person says yesterday's evidence, today's goal and blockers.
- **Evening check 9:00 PM, 5 min** in chat: one line each with a link (tx, PR, screenshot).
- **Sat Nov 14, 2:00 PM decision sync (all three, 45 min):** vision results so far, stack, `docs/API.md`, findings schema, demo-item swap (see Luka). Record each decision with `/decide`.
- Branch per task, PR into `main`, `security-auditor` before every PR. Never commit `.env` or wallet keys.

## Handoffs between lanes (drafts, agree at Sat sync)

**1. AI findings JSON** (Luka produces, Pablo stores and hashes, Marcus renders):
```json
{
  "report_id": "r_123",
  "findings": [
    {
      "id": "f1",
      "room": "living room",
      "item": "carpet",
      "before_photo": "p_in_04", "after_photo": "p_out_04",
      "region": [0.42, 0.61, 0.18, 0.12],
      "category": "damage",
      "description": "Dark stain about 20 cm wide, not visible at move-in",
      "confidence": 0.91,
      "price_key": "carpet_spot_clean",
      "cost_usd": 120
    }
  ],
  "dropped_low_confidence": 1,
  "total_deduction_usd": 120
}
```
Rules: `category` is `damage | normal_wear | no_change`. `normal_wear` always costs 0. Costs come only from the fixed price table, never from the model. Below the confidence threshold, the finding is dropped and not charged.

**2. Contract interface** (Pablo, frozen after the Sat sync because the backend and frontend depend on it):
`createLease(tenant, landlord, arbiter, amount)` → `deposit()` → `commitPhotos(phase, manifestHash)` → `proposeDeductions(amount, reportHash)` (pays the undisputed part to the tenant immediately) → `accept()` (deduction goes to the landlord) or `appeal()` → `resolve(amountToLandlord)` by the arbiter. No admin withdrawal. Funds can only go to the tenant or the landlord.

**3. API** (Pablo writes it in `docs/API.md`, Marcus builds against mock JSON of the same shape until it's live).

---

## Pablo: onchain + backend
Owns `contracts/`, `server/`, `shared/abi/`, `shared/addresses.json`. Branch first: `feat/escrow-spike`.

### Fri night (5–11 PM): escrow spike → one release tx
1. Look up in the arc-docs MCP, not from memory: RPC URL, chain ID, explorer URL, USDC token address and its **decimals**, and whether gas is paid in USDC. Write them into `.env` (and `.env.example` as placeholders).
2. Make 3 test wallets (deployer/landlord, tenant, arbiter). Fund them at faucet.circle.com.
3. `forge init spikes/escrow`. Write a minimal `DepositEscrow.sol` with the interface above.
4. Forge tests. These four are enough for now:
   - happy path (deposit → propose → accept)
   - appeal path (arbiter resolves)
   - a stranger can't move funds
   - can't release twice
5. Deploy to Arc testnet and run a script: deposit 10 USDC → propose 1.20 → accept.
   **Done =** release tx link pasted into "Proven integrations" in `docs/STATUS.md`.

### Sat Nov 14
- **Morning:** finish the spike if it's not done. Draft `docs/API.md` for the 2 PM sync:
  - `POST /leases`
  - `POST /leases/{id}/deposit`
  - `POST /leases/{id}/photos?phase=in|out`
  - `POST /leases/{id}/report`
  - `POST /leases/{id}/accept`
  - `POST /leases/{id}/appeal`
  - `GET /leases/{id}`
- **2 PM:** sync.
- **Afternoon: Circle dev-controlled wallets spike on ARC-TESTNET.** Look up current docs through the circle MCP first.
  1. Register the entity secret and create a wallet set.
  2. Create one wallet each for the tenant and the landlord.
  3. Make an `approve` + `deposit` call to the escrow through `contractExecution`. A plain transfer would bypass the escrow.

  **Done =** tx link from a Circle-managed wallet. This is what lets us say "no seed phrases, no gas" for the Consumer track.

### Sun Nov 15: real contract + server skeleton
- Move the contract to `contracts/`. Then harden it:
  - checks-effects-interactions
  - SafeERC20
  - events for every state change
  - an appeal-window deadline (short in the demo, e.g. 2 minutes)
- Deploy, then put the ABI in `shared/abi/` and the address in `shared/addresses.json`.
- FastAPI in `server/`:
  - SQLite for leases and photos
  - photos on local disk
  - SHA-256 of each photo, plus a manifest hash committed onchain
- Endpoints return the agreed shapes, even if some are still stubbed.

### Mon Nov 16: wire the money flow
- Call Luka's `analyze()` from `POST /report`. Store the findings JSON and commit its hash with `proposeDeductions`.
- Payout and accept/appeal go through the Circle wallets. Return explorer links in the API, which Marcus shows as "Proof".
- **Demo reset script:** one command makes a fresh lease with a funded tenant, so we can rerun the demo in a minute.

### Tue Nov 17: end to end
- Deploy the server so we have a public link for Devpost (Render, Railway or Fly; whichever is fastest).
- Run the full demo path with Marcus on testnet. Run `security-auditor` on the contract and server.

### Wed–Thu
- README sections: contract addresses, how Arc is used (USDC as gas, predictable fees), safety (no admin withdraw).
- Freeze the contract Wed noon: no redeploys after that. Bug fixes only Thu.

**Fallbacks:**
- **Circle wallets fight us past Sun noon:** keep server-held testnet keys for the demo and say so honestly in the README.
- **Appeal path is late:** demo the accept path only and show appeal in the contract tests.

---

## Marcus: frontend + product
Owns `app/`. Branch first: `feat/report-mock`.

### Fri night (5–11 PM): the move-out report screen
Build it **directly as a Next.js page with hardcoded data**, not in Figma, so the mock becomes the real screen. The screen:
- **Header:** "Move-out report · 2 items found"
- **One card per finding:**
  - before/after photos side by side, with the flagged region outlined
  - label: **Damage · $120** (red) or **Normal wear · $0** (grey) with a "Why?" tooltip
- **Summary:** Deposit $1,000 · Withheld $120 · **$880 sent to you today** (green banner)
- **Buttons:** **Accept $120** and **Appeal**, plus "Not charged: 1 low-confidence item"
- **No crypto words.** Say dollars, not USDC, wallet, gas or tx. The explorer link is a small "Proof" link.

**Done =** screenshot in chat at 9 PM, plus a mobile-width check.

### Sat Nov 14
- **Morning:** scaffold the 5 demo screens with mock JSON that matches the findings schema above:
  1. Create lease (landlord)
  2. Pay deposit (tenant)
  3. Move-in photos
  4. Move-out report
  5. Payout timeline
- Add a **persona switch** (Tenant ⇄ Landlord) in the header. The demo needs both sides in one browser.
- **2 PM:** sync. Bring the screens: the team agrees the API around what you need to render.

### Sun Nov 15: guided photo capture
- Use the phone camera through `<input type="file" accept="image/*" capture="environment">`.
- Work from a shot list (e.g. "Living room: carpet, toward window").
- At move-out, show the **move-in photo as a faded overlay** so the angle matches. This directly improves the AI's accuracy, so tell Luka it exists.

### Mon Nov 16
- **Deposit screen:** "Pay $1,000 into neutral escrow", then "Held safely: neither you nor your landlord can take it alone."
- **Payout timeline:** deposited → move-in recorded → report → $880 paid → $120 settled. Each step gets a "Proof" link.
- **"Analyzing photos…" state:** the vision call may take 20–60 s. Show progress, room by room.

### Tue Nov 17: wire to the real API
- Replace the mock JSON with Pablo's live endpoints. Add loading, error and empty states everywhere.
- Run the full demo path with Pablo.

### Wed–Thu
- **Polish:** spacing, type, contrast, and one-hand use on a phone.
- Run the `qa-demo-tester` agent and fix what it finds.
- Freeze the UI Wed night. Record clean screen captures with Luka for the video.

**Fallback:** if the API is late Tue, the frontend runs on recorded real API responses for the video, and the live demo uses whatever is wired. Don't fake tx links: show only real ones.

---

## Luka: AI vision + integrations + demo
Owns `integrations/`, `docs/`, `README.md`, demo assets. Branch first: `feat/vision-spike`.

### Fri night (5–11 PM): photos + first model runs
1. **Pick the vision provider in the first hour** (Gemini, Claude, GPT; whichever key we can get tonight). Look up the current image-input and structured-output API in docs. Key goes in `.env` only.
2. **Shoot the test set in one real room:** 5 pairs, same spot and angle for each pair (mark the floor with tape or use a tripod).
   - 2 clean pairs (nothing changed)
   - 2 damaged pairs (removable fake damage: a stain on a towel or rug, painter's-tape "scuff", a sticky note "hole")
   - 1 lighting-only pair (lamp on vs off, blinds open vs closed)
3. **Spike in `spikes/vision/`:** send both images, the shot description and the price table. Ask for JSON in the findings schema above. Run each pair 3 times to check consistency.

### Sat Nov 14: GO/NO-GO
- **Morning:** iterate on the prompt and record pass/fail per pair. Ideas if it struggles:
  - crop to the shot area
  - ask the model to describe each image first, then compare
  - require a region for every finding
  - raise the confidence threshold
- **2 PM sync:** show early results.
- **Bring the demo-item question to the sync:** "faded paint" is hard to photograph convincingly. Propose swapping it for something we can stage, e.g. a few small nail holes, which also count as normal wear in CA. Changing the demo path needs the team's OK.
- **9 PM: GO/NO-GO note in `docs/STATUS.md`.**
  - Pass = flags both damaged pairs, nothing on the clean or lighting-only pairs, in at least 2 of 3 runs.
  - NO-GO = switch to Skin in the Game (D-001).
- **Side task (pitch accuracy):** check the AB 2801 effective dates and the bad-faith penalty (Civil Code 1950.5) on leginfo.legislature.ca.gov. Then clear that blocker in STATUS.

### Sun Nov 15: package the pipeline
- `integrations/vision/` gets `analyze(pairs, price_table) -> Report` (findings JSON).
- Add:
  - `price_table.json`
  - a timeout
  - a retry
  - a per-report spend cap
- Turn the 5 pairs into a **regression test**. Rerun it after every prompt change so we know nothing broke.
- Hand off to Pablo: one function call, plus a sample output file.

### Mon Nov 16: story + docs skeleton
- `/demo-script`: a 2–3 min video script and a 5 min pitch outline. Open with the USC renter's problem, not with the blockchain.
- `/readme` skeleton: problem, architecture diagram, how the AI decides (normal wear never charged, costs from the table, low confidence dropped, tenant can always appeal), setup steps.

### Tue Nov 17
- **Shoot the final demo photos** (the carpet stain and the normal-wear item) with Marcus's capture screen, so they look exactly like the live demo.
- Run the `judge-panel` agent on the working demo. Turn its top 3 complaints into tasks for the team.

### Wed Nov 18
- **Record the 2–3 min demo video** (screen capture with voiceover). Upload it to YouTube unlisted and **check it in an incognito window**.
- Make a backup recording of the full live demo, in case the Wi-Fi dies on Saturday.
- Draft the Devpost written answers: what we built, the problem, how it works, what's unique, what's next.

### Thu Nov 19: submit
- Run `/submit-check` and fix the gaps. **Submit Thu night**, with Consumer track and Arc chain award selected.
- Run `/pitch-drill` with the whole team: timed 5 min, plus 2 min Q&A practice.

**Fallback:** if the model is shaky on some room types, limit v1 to the shots it handles well. Say that plainly in the README instead of hiding it.

---

## Checkpoints (if one slips, tell the team at standup that day)
| When | Must be true |
|---|---|
| Fri 11 PM | Escrow tx on testnet; report screen exists; 5 photo pairs shot |
| Sat 9 PM | GO/NO-GO decided; API + schema + stack recorded with `/decide`; Circle wallet tx |
| Mon 9 PM | Each lane's piece works on its own against the real interfaces |
| Tue 9 PM | **Full demo path works on testnet, end to end** |
| Wed 9 PM | Video recorded, README done, UI frozen |
| Thu night | Submitted on Devpost |
