---
name: pitch-drill
description: Writes or tightens the 5-minute finalist pitch in docs/PITCH.md, then runs a live mock Q&A, one judge question at a time, and grades each answer. Use from Day 6 onward and the morning of Nov 21.
argument-hint: "[write | drill | both]"
disable-model-invocation: true
---

Mode: $ARGUMENTS (default: both)

### Write mode
Read `CLAUDE.md`, `README.md`, `docs/STATUS.md`, and `docs/JUDGING.md`. Draft `docs/PITCH.md` for a **5:00 pitch**
(spoken at about 140 words/min, so under 650 words) with timestamps:
- 0:00–0:30 **Hook**: a concrete person with a concrete pain. No "In today's world...".
- 0:30–1:00 **What it is**: one sentence, then why now (agents paying in USDC, x402, Arc mainnet, etc. Only what's true for us).
- 1:00–3:30 **Live demo**: the demo path, narrating the user's goal rather than the UI. Show one onchain proof (explorer
  tab already open), and show the guardrail or safety moment if we're an agent project.
- 3:30–4:15 **How it works**: one architecture slide; name each sponsor tool and what it does for us.
- 4:15–4:45 **Impact & next**: who uses this first, traction signal if any, what we'd build next.
- 4:45–5:00 **Close**: name, one line, ask.
Include a "**if the demo breaks**" line for each demo step (switch to the recorded clip at timestamp X).

### Drill mode
Become the panel: a UBC organizer, our chain's representative, and each of our bounty sponsors. Ask ONE question
at a time, the hardest first (security of agent funds, why blockchain at all, what's actually onchain vs mocked,
business model, what's original vs a tutorial, scaling and fees). Wait for my answer. Grade it 1–5, point out
the weak part in one line, and give a stronger 20-second version. After 8 questions, list my three weakest
areas and add the improved answers to `docs/PITCH.md` under "Q&A bank".
