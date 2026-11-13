---
name: demo-script
description: Produces the 2–3 minute Devpost demo video plan (script with timestamps, shot list, recording checklist, and optional ElevenLabs narration). Use on Day 6–7 once the demo path passes QA.
disable-model-invocation: true
---

Read `CLAUDE.md`, `docs/STATUS.md` (demo path), `README.md`, and `docs/JUDGING.md`.

Write `docs/DEMO-VIDEO.md` with:
1. **Target length 2:30** (hard max 3:00). A timestamped script table: time · on screen · voiceover (≤ 2.3 words/sec).
2. Structure: 0:00 problem in one sentence → 0:10 the product doing its "wow" moment immediately → the demo path →
   0:xx a 15-second architecture shot → the onchain proof (explorer showing our tx / program ID / contract) → close with name + one line.
3. **Requirement shots**, a checklist of things that must be visible on screen:
   - Agentic track: the agent's decision loop and a guardrail firing (budget cap or approval prompt)
   - DeFi: the contract interaction + address on the explorer
   - Consumer: the real frontend, with no seed phrase or gas UI in sight
   - Solana/Arc: explorer for the correct network showing our program/contract
   - ElevenLabs: **audible** voice/audio in the product (not just narration)
   - QuickNode: the Stream firing (a webhook log or the live UI update)
   - Gemini: live prediction-market data visible, with its source
   - Grok Bot: Grok Bot doing the work on X
4. **Recording checklist**: 1080p+, browser zoom at 125%, notifications off, test wallets pre-funded,
   pre-opened tabs, a fresh incognito profile, cursor highlighting, record each section separately, cut the dead air.
5. If I want AI narration: write the voiceover as a clean text file `docs/voiceover.txt`, and tell me how to
   generate it with the ElevenLabs MCP or API (voice choice, pacing). Note: narration alone doesn't satisfy the
   ElevenLabs bounty; the product itself must use ElevenLabs.
6. Upload notes: YouTube unlisted or a Drive link set to "anyone with the link"; check it in an incognito window.
