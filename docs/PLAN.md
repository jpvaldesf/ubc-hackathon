# Build plan: Deposit Keeper (revised Fri Nov 13, evening): submit Tue night

Official deadline: **Fri Nov 20, 10:00 AM PT.** Our deadline: **submitted on Devpost Tue Nov 17, 11:59 PM PT.**
Wed and Thu are **buffer only**: bug fixes, pitch practice, and small edits to the submission. No new features after Tuesday noon.
Pitch in person Sat Nov 21.

Every task must move the 5-step demo path in `docs/STATUS.md`. We cut scope on purpose to fit (see "What we cut").

## Team rhythm
- **Standup 9:30 AM, 10 min** (`/standup`), Sat to Tue.
- **Check-ins at 2 PM and 9 PM:** one line each in chat, with a link (tx, PR, screenshot).
- **Sat Nov 14, 1:00 PM decision sync (30 min):** vision GO/NO-GO, stack, `docs/API.md`, findings schema, demo item. Record each decision with `/decide`.
- Branch per task, small PRs into `main`, `security-auditor` before each PR. Merge often: integration starts Sunday.

## The shape of the week
| Day | Focus |
|---|---|
| Fri night | Each piece proven on its own |
| Sat | 1 PM decisions, then each piece built out |
| Sun | Pieces connected |
| **Mon** | **Demo path works end to end by 2 PM**; then hosting, judge feedback, fixes |
| **Tue** | Polish, freeze at noon, README + video, **submit by 11:59 PM** |
| Wed–Thu | Buffer |

## What we cut
| Item | Full version | What we build |
|---|---|---|
| Circle wallets | Full integration | **4-hour timebox Sat afternoon.** If there's no tx by 6 PM, use server-held testnet keys and say so in the README. |
| Appeal path | Full UI + arbiter flow | Contract supports it and is tested. In the UI, Appeal shows "Sent to a neutral reviewer". The arbiter ruling runs from a script. |
| Photo capture | Camera with move-in overlay | Upload or camera through a plain file input, plus a shot list. The overlay is a Mon-evening stretch goal, only if the demo path already works. |

## Handoffs between lanes (draft now, frozen at the Sat 1 PM sync)

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

**2. Contract interface** (Pablo):
`createLease(tenant, landlord, arbiter, amount)` → `deposit()` → `commitPhotos(phase, manifestHash)` → `proposeDeductions(amount, reportHash)` (pays the undisputed part to the tenant immediately) → `accept()` (deduction goes to the landlord) or `appeal()` → `resolve(amountToLandlord)` by the arbiter. No admin withdrawal. Funds can only go to the tenant or the landlord.

**3. API:** Pablo writes it in `docs/API.md` by Sat 1 PM. Marcus builds against mock JSON of the same shape until it's live.

---

## Pablo: onchain + backend
Owns `contracts/`, `server/`, `shared/abi/`, `shared/addresses.json`. Branch first: `feat/escrow-spike`.

### Fri night (5 PM–midnight): escrow contract, nearly final
1. Look up in the arc-docs MCP, not from memory: RPC URL, chain ID, explorer URL, USDC token address and its **decimals**, and whether gas is paid in USDC. USDC may have different decimals through the ERC-20 interface than as the native gas balance; confirm both and never mix them. Write the values into `.env` (and `.env.example` as placeholders).
2. Make 3 test wallets (landlord/deployer, tenant, arbiter). Fund them at faucet.circle.com.
3. Write `DepositEscrow.sol` **straight in `contracts/`**, built right from the start:
   - checks-effects-interactions
   - SafeERC20
   - events for every state change
   - a short appeal window
4. Forge tests:
   - happy path (deposit → propose → accept)
   - appeal path (arbiter resolves)
   - a stranger can't move funds
   - can't release twice
5. Deploy to Arc testnet and run a script: deposit → propose → accept.
   **Done =** release tx link in "Proven integrations" in `docs/STATUS.md`.

### Sat Nov 14
- **9:30–1 PM:**
  - Fix anything from last night and redeploy once.
  - Put the ABI in `shared/abi/` and the address in `shared/addresses.json`.
  - Draft `docs/API.md`:
    - `POST /leases`
    - `POST /leases/{id}/deposit`
    - `POST /leases/{id}/photos?phase=in|out`
    - `POST /leases/{id}/report`
    - `POST /leases/{id}/accept`
    - `POST /leases/{id}/appeal`
    - `GET /leases/{id}`
- **1 PM:** sync. Freeze the API and the contract interface.
- **2–6 PM: Circle wallets (timeboxed).** Look up current docs through the circle MCP first.
  1. Register the entity secret and create a wallet set.
  2. Create the tenant and landlord wallets.
  3. Make an `approve` + `deposit` call through `contractExecution`.

  If there's no tx by 6 PM, stop and fall back to server-held keys.
- **6 PM–midnight: FastAPI skeleton in `server/`.**
  - SQLite, photos on local disk
  - SHA-256 per photo, plus a manifest hash committed onchain
  - all endpoints returning the agreed shapes
  - deposit and photo commit working against the real contract

### Sun Nov 15: connect the pieces
- Call Luka's `analyze()` from `POST /report`, store the findings JSON, and commit its hash with `proposeDeductions`.
- Accept and appeal work. Return explorer links in every response.
- Marcus switches screens to your endpoints through the day; be reachable.
- **9 PM:** first full run-through with the team. It's fine if it's rough; note what breaks.

### Mon Nov 16: end to end + hosting
- **Morning:** fix last night's breakages.
- **2 PM: the full demo path works on testnet, end to end.** Treat this as a hard checkpoint.
- **Afternoon:**
  - Deploy the server on Render, Railway or Fly; pick one in the first 15 minutes.
  - Write the **demo reset script**: one command makes a fresh lease with a funded tenant.
- **Evening:** run `security-auditor` on the contract and server, and fix what it finds.

### Tue Nov 17: finish
- **Morning:** fix bugs from Monday's judge feedback. **Contract frozen at noon:** no redeploys after this.
- **Afternoon:** README sections:
  - contract addresses
  - how Arc is used (USDC as gas, predictable fees)
  - safety (no admin withdrawal, funds only to the tenant or landlord)
  - setup steps
- **Evening:** be on call while Luka records. Rerun the reset script as needed.

---

## Marcus: frontend + product
Owns `app/`. Branch first: `feat/report-mock`.

### Fri night (5 PM–midnight): app scaffold + report screen
- Scaffold `app/` in Next.js now. The first real page is the **move-out report**, with hardcoded data:
  - **Header:** "Move-out report · 2 items found"
  - **One card per finding:**
    - before/after photos side by side, with the flagged region outlined
    - label: **Damage · $120** (red) or **Normal wear · $0** (grey) with a "Why?" tooltip
  - **Summary:** Deposit $1,000 · Withheld $120 · **$880 sent to you today** (green banner)
  - **Buttons:** **Accept $120** and **Appeal**, plus "Not charged: 1 low-confidence item"
- **No crypto words.** Say dollars, not USDC, wallet, gas or tx. Explorer links show as a small "Proof" link.
- **Done =** screenshot at 9 PM, plus a mobile-width check.

### Sat Nov 14
- **9:30–1 PM:** stub the other 4 screens with mock JSON in the agreed shapes:
  1. Create lease (landlord)
  2. Pay deposit (tenant)
  3. Move-in photos
  4. Payout timeline

  Add a **persona switch** (Tenant ⇄ Landlord) in the header.
- **1 PM:** sync. Bring the screens: the API gets agreed around what you need to render.
- **2 PM–midnight:**
  - **Photo screens:** a shot list (e.g. "Living room: carpet, toward window") with an upload/camera input per shot.
  - **Deposit screen:** "Pay $1,000 into neutral escrow", then "Held safely: neither you nor your landlord can take it alone."
  - **Payout timeline:** deposited → move-in recorded → report → $880 paid → $120 settled. Each step gets a "Proof" link.
  - **"Analyzing photos…" state:** the vision call may take 20–60 s. Show progress room by room.

### Sun Nov 15: connect the pieces
- Swap the mock JSON for Pablo's endpoints, one screen at a time, in demo-path order. Add loading, error and empty states.
- **9 PM:** first full run-through with the team.

### Mon Nov 16: end to end
- **Morning:** fix what broke last night.
- **2 PM: full demo path works end to end** (with Pablo and Luka).
- **Afternoon:**
  - Deploy the frontend (Vercel) against the hosted server and run the flow on your phone.
  - Run the `qa-demo-tester` agent and fix what it finds.
- **Evening (stretch, only if everything above works):** move-in photo overlay on the move-out camera.

### Tue Nov 17: finish
- **Morning, polish:** spacing, type, contrast, one-hand use on a phone. Fix judge-panel feedback.
- **UI frozen at noon.**
- **Afternoon:** record clean screen captures with Luka for the video. Send the live link to Luka for Devpost.

**Rule:** never fake a tx link. If a step isn't wired by Mon 2 PM, the demo skips it rather than showing made-up proof.

---

## Luka: AI vision + integrations + demo
Owns `integrations/`, `docs/`, `README.md`, demo assets. Branch first: `feat/vision-spike`.

### Fri night (5 PM–midnight): photos + model runs
1. **Pick the vision provider in the first 30 minutes** (whichever key we can get tonight). Look up the current image-input and structured-output API in docs. Key goes in `.env` only.
2. **Shoot the test set in one real room:** 5 pairs, same spot and angle for each pair (tape on the floor or a tripod).
   - 2 clean pairs (nothing changed)
   - 2 damaged pairs (removable fake damage: a stain on a towel or rug, painter's-tape "scuff", a sticky note "hole")
   - 1 lighting-only pair (lamp on vs off)

   **Shoot the demo pair tonight too** (the carpet stain plus the normal-wear item) so we never have to reshoot.
3. **Spike in `spikes/vision/`:** send both images, the shot description and the price table. Ask for JSON in the findings schema. Run each pair 3 times.

### Sat Nov 14: GO/NO-GO by 1 PM
- **9:30–1 PM:** iterate on the prompt. Ideas if it struggles:
  - crop to the shot area
  - ask the model to describe each image first, then compare
  - require a region for every finding
  - raise the confidence threshold
- **1 PM sync: GO/NO-GO.**
  - Pass = flags both damaged pairs, nothing on the clean or lighting-only pairs, in at least 2 of 3 runs.
  - NO-GO = switch to Skin in the Game (D-001) immediately.
- **Also at the sync:** swap "faded paint" in the demo for something we can stage (e.g. small nail holes, normal wear in CA).
- **2–7 PM: package the pipeline** in `integrations/vision/`:
  - `analyze(pairs, price_table) -> Report`
  - `price_table.json`
  - a timeout, a retry and a spend cap
  - the 5 pairs as a regression test
  - a sample output file for Pablo and Marcus
- **7 PM–midnight:** **check the law:** AB 2801 dates and the bad-faith penalty (Civil Code 1950.5) on leginfo.legislature.ca.gov. Clear that blocker in STATUS.

### Sun Nov 15: connect the pieces + story
- **Morning:** help Pablo wire `analyze()` into the server. Rerun the regression test on the server path.
- **Afternoon:** write the video script (2–3 min) with `/demo-script`. Open with the USC renter's problem, not with the blockchain.
- **9 PM:** first full run-through with the team.

### Mon Nov 16: docs + judge feedback
- **Morning:**
  - `/readme`: problem, architecture diagram, how the AI decides (normal wear never charged, costs from the table, low confidence dropped, tenant can always appeal), setup steps.
  - Draft the Devpost written answers: what we built, the problem, how it works, what's unique, what's next.
- **After the 2 PM checkpoint:** run the `judge-panel` agent on the working demo and turn its top 3 complaints into Tuesday-morning tasks.
- **Evening:** pitch outline (5 min). Check whether Devpost allows edits after submitting.

### Tue Nov 17: video + submit
- **Morning:** finish the README with Pablo's contract section.
- **1–5 PM: record the demo video** with screen capture and voiceover. Upload it to YouTube unlisted and **check it in an incognito window**. Also record a backup of the full live demo.
- **5–9 PM:** run `/submit-check` and fix the gaps.
- **By 11:59 PM: submit on Devpost.** Consumer track, Arc chain award, all three members listed. Aim for 9 PM, not midnight.

---

## Wed Nov 18 to Thu Nov 19: buffer (not a schedule)
- Fix bugs that came up after submitting. Update the submission if Devpost allows edits before the deadline.
- `/pitch-drill` every day: timed 5 min, plus 2 min of Q&A.
- Stretch goals, only if everything above is solid: arbiter UI, photo overlay if not done.
- Fri Nov 20, 10 AM PT: hard deadline. We should already be done.

## Checkpoints (if one slips, raise it at the next check-in, not the next day)
| When | Must be true |
|---|---|
| Fri midnight | Contract deployed with a release tx; app scaffold + report screen; all photos shot; first model runs |
| Sat 1 PM | **GO/NO-GO**; API + schema + stack frozen with `/decide` |
| Sat midnight | Circle tx (or fallback chosen); server skeleton talking to the contract; vision packaged; all 5 screens built on mock data |
| Sun 9 PM | First full run-through (rough is fine) |
| **Mon 2 PM** | **Full demo path works on testnet, end to end** |
| Mon midnight | Server and frontend hosted; judge-panel feedback in hand |
| Tue noon | Contract and UI frozen |
| **Tue 11:59 PM** | **Submitted on Devpost** |
