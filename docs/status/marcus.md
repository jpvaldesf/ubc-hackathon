# Marcus: status (your Claude session updates this after each task)

**Lane:** frontend + product (app/)
**Today's lane goal (Fri Nov 13):** Clickable mock of the move-out report screen (the screen judges will remember).
**Full plan:** docs/PLAN.md (your section)
**Branch:** feat/report-mock

## Done (with evidence: tx hash, PR link, screenshot)
-

## Next (max 3)
1. Fri night → Sat noon: clickable mock of the move-out report: before/after photo pairs, each finding marked "damage $120" or "normal wear $0", total withheld, "$880 sent to you" banner, Accept / Appeal buttons. Plain dollars only, no crypto words.
2. Fri night: scaffold `app/`; Sat AM: stub (Next.js, proposed) with the 5 demo-path screens as stubs: create lease → deposit → move-in photos → move-out report → payout. Use mock data until Pablo's API is ready.
3. Sun–Mon: guided photo capture (shot list: same room, same angle as move-in, with an outline overlay). Better photos make the AI work better, so this helps Luka too.

## Blocked by / waiting on
- API shape (Sat sync). Work from mock JSON until then.

## Requests from others (teammates write here instead of editing your files)
- Sun Nov 15, from Pablo: the server is ready to build against (branch feat/server-skeleton, PR soon). Run it with `uv run --project server uvicorn server.app.main:app --reload` from the repo root (see server/README.md). It follows docs/API.md exactly. CORS allows http://localhost:3000 (set DK_CORS_ORIGINS for other origins). Send `X-User-Id` on every write; photos must be JPEG/PNG (use `accept="image/jpeg,image/png"`); poll GET /leases/{id} every 2 s after POST /report.
- Sun Nov 15, from Luka: Demo damage item is now a wall mark ($1.20, price key wall_mark_repaint). Please change any carpet stain labels or seed data. Amounts are unchanged.
- Sun Nov 15, from Luka: real AI report example in integrations/vision/sample_report.json (branch feat/vision-pipeline). `region` can be `null` (no outline), and boxes are approximate (one test box was ~9% of the height off), so draw them as a soft highlight, not a precise outline. Extra field `dropped_unknown_price_key` (int) is safe to ignore.
- Sat 2:30 PM, from Pablo: docs/API.md is frozen (D-005). Money is integer cents (`deposit_cents`, `cost_cents`), demo is $10 / $1.20 / $8.80 with a visible "Testnet demo: amounts scaled 1:100" note (`demo_scale: 100`, never multiply). New screen: landlord reviews the AI draft and taps "Send report" (can only remove findings or lower costs, D-004). Photos upload one shot at a time (PUT per shot) plus a "Done" commit call per phase.
