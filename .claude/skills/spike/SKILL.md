---
name: spike
description: Time-boxed proof that one integration works (e.g., x402 payment on Solana devnet, Circle Nanopayments on Arc testnet, Gemini PM market data, QuickNode Stream webhook, ElevenLabs agent tool call). Produces a tiny runnable script and hard evidence. Use before building any feature on an unproven SDK.
argument-hint: "[integration to prove] [time box, default 60m]"
arguments: [target, timebox]
---

Goal: prove **$target** works end-to-end with the smallest possible code, within **$timebox** (default 60 minutes).

Rules:
1. Ask the `researcher` subagent for the current official minimal example first. Don't write from memory.
2. Create `spikes/<short-name>/` with ONE script and a 5-line README: what it proves, how to run it, the result.
3. Use devnet/testnet only. Secrets come from env vars; write the needed names into `.env.example`.
   Tell me which values to fill in. Don't ask me to paste secrets into the chat.
4. Run it. Success means real evidence: a tx signature and explorer link, an API response payload, an audio
   file, or a webhook delivery log.
5. Record the result in `docs/STATUS.md` under "Proven integrations" with the evidence.
6. If it isn't working by the end of the time box, STOP. Report what failed, what you tried, and 2 fallbacks
   (a simpler API, a different SDK, a mocked boundary we'd disclose). Recommend one, and tell me whether
   it's worth asking the sponsor at office hours or on Telegram (draft the question).

Spike code is throwaway. Don't polish it; the real integration gets written properly afterwards.
