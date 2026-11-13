# Sponsor tooling notes (checked Nov 7, 2026; re-verify anything you build on)

## x402 (HTTP 402 pay-per-request)
- Open protocol: the server answers 402 with payment requirements, the client signs a payment and retries.
- Live on Base, Solana, and other chains; governed by the x402 Foundation (Linux Foundation) since Apr 2026.
- Packages: `@x402/evm` (EVM) and `@x402/svm` (Solana). Docs: https://x402.org · Solana: https://solana.com/x402
- Fits the Agentic Payments track directly ("agents that pay for APIs, data, or compute per request").

## Circle / Arc
- Arc public **mainnet launched Sep 16, 2026**; the hackathon allows testnet, and you should use testnet.
  EVM-compatible, USDC is the gas token, sub-second finality.
- Arc testnet: chain ID `5042002`, RPC `https://rpc.testnet.arc.network`, explorer `https://testnet.arcscan.app`.
  Consensus: permissioned validators running BFT (Malachite), with deterministic finality.
- ⚠ **USDC has two views on Arc that share ONE balance:** the native balance uses **18 decimals** (`eth_getBalance`,
  `msg.value`, gas math), while the ERC-20 interface at `0x3600000000000000000000000000000000000000` uses **6 decimals**
  (`balanceOf`, `transfer`). Pick one for app-level accounting (Circle recommends the ERC-20 interface) and convert carefully.
- Arc docs MCP (no auth): `https://docs.arc.network/mcp`
- Circle codegen MCP: `https://api.circle.com/v1/codegen/mcp` (Wallets, Contracts, CCTP, Bridge Kit, Gateway)
- Circle Skills plugin for Claude Code: `/plugin marketplace add circlefin/skills` then `/plugin install circle-skills@circle`
- **Nanopayments** (Circle Gateway): gas-free USDC payments down to $0.000001. The buyer signs EIP-3009
  authorizations offchain and Circle settles them in batches onchain; it follows x402.
  Starter kit: https://github.com/circlefin/arc-nanopayments (seller app + LangChain buyer agent + dashboard).
  Batching SDK: `@circle-fin/x402-batching`.
  ⚠ Earlier hackathon teams reported flaky Nanopayments testnet endpoints. Spike it on day 1 and keep a fallback
  (plain USDC transfer on Arc testnet).
- **Agent Wallets** (Circle Agent Stack, May 2026): operated through Circle CLI (`@circle-fin/cli`).
  ⚠ **Spending policies are mainnet-only; testnet rejects them.** For the hackathon, enforce budgets, allowlists, and
  approval thresholds in YOUR OWN code (or your own contract) and document them. That is also what the
  Agentic track asks you to show.

## Solana
- Official Solana Developer MCP (docs RAG + Anchor expert, read-only): `https://mcp.solana.com/mcp` (HTTP transport)
- Official skill: `npx skills add https://github.com/solana-foundation/solana-dev-skill`
  (framework-kit UI, `@solana/kit` SDK, Anchor/Pinocchio, LiteSVM/Mollusk tests, security patterns)
- Solana Agent Kit (SendAI): core package plus plugins (token, nft, defi, misc, blinks), with LangChain/Vercel AI
  adapters and an MCP adapter. Supports a `signOnly` mode, which helps with human-approval flows.
- Always say which SDK you mean: `@solana/web3.js` v1 and `@solana/kit` have very different APIs.

## Gemini Prediction Markets
- Docs: https://developer.gemini.com · LLM index: https://developer.gemini.com/llms.txt
- Public market data needs no key: `GET https://api.gemini.com/v1/prediction-markets/events?status=active&limit=50`,
  then `GET /v1/prediction-markets/events/{eventTicker}`. Live updates come over WebSocket `wss://ws.gemini.com`
  using the contract's `instrumentSymbol` (never construct symbols yourself).
- Private PM requests put the payload in the `X-GEMINI-PAYLOAD` header with an empty body; generic generated clients don't handle this.
- Sandbox: `https://api.sandbox.gemini.com` (creds from exchange.sandbox.gemini.com). The docs don't say whether
  **PM trading works in sandbox. Ask at Gemini office hours.**
- Tools: MCP server in `github.com/gemini/developer-platform/packages/mcp-server` (node; env `GEMINI_API_KEY`,
  `GEMINI_API_SECRET`, `GEMINI_BASE_URL`). Skills: `npx skills add gemini/developer-platform -a claude-code --all -y`
- Largest single bounty ($2.5k for 1st) and the only bounty whose winner gets a finalist pitch slot.

## QuickNode Streams
- QuickNode MCP (OAuth; manages Streams, webhooks, KV lists): `claude mcp add --transport http quicknode https://mcp.quicknode.com/mcp`, then `/mcp` to authorize.
- Bounty needs: at least one Stream **with a filter and a destination**, documented in the README.

## ElevenLabs
- Official MCP server: `elevenlabs-mcp` (Python, run with `uvx`; env `ELEVENLABS_API_KEY`). Good for generating
  demo narration and sound, and for prototyping voices.
- For the product itself, use the API/SDK or ElevenLabs Agents (conversational voice agents with tool calls).
  It must be a core feature, and the demo video must have audio.

## Grok Bot (xAI)
- Grok Bot: always-on agents with their own cloud computer, in beta since Aug 2026, with tighter X integration since Sep 2026.
- The bounty needs a Grok Bot chat export plus a 3–4 sentence README section. The X Premium perk link comes before the hackathon.

## Voicepay stress-test (checked Nov 13, 2026)
- Prior art on Arc+ElevenLabs voice payments exists: lablab.ai "AI Agents on Arc with USDC" (Oct 27-Nov 9 2025) had PayFlow AI, Speak and Send, ArcAgent (WhatsApp+voice), Voice Vault. Crowded; differentiate on policy/approval/phone UX.
- Circle dev-controlled wallets support ARC-TESTNET (since 2025-10-27); contractExecution also supported (Contracts Nov 25 2025). Node pkg `@circle-fin/developer-controlled-wallets`; createTransaction({blockchain:'ARC-TESTNET', walletAddress, tokenAddress:'0x3600000000000000000000000000000000000000', destinationAddress, amount:['1'], fee:{type:'level',config:{feeLevel:'MEDIUM'}}}).
  Source: https://developers.circle.com/wallets/dev-controlled/transfer-tokens-across-wallets
- A plain `transfer` bypasses a custom Solidity policy contract; to enforce it, route via POST /transactions/contractExecution into the policy contract.
- Arc testnet USDC faucet: https://faucet.circle.com
- ElevenLabs Twilio native integration: only PURCHASED Twilio numbers get inbound; verified caller IDs are outbound-only. https://elevenlabs.io/docs/eleven-agents/phone-numbers/twilio-integration/native-integration
- ElevenLabs agent overage $0.08/min; free-tier minutes/telephony access unverified (tiers listed 15/75/275 min).

## Added Nov 13: Odds Radio stress-test findings
- Gemini PM WS (public, no auth for market data): connect `wss://ws.gemini.com`, send `{"id":"1","method":"SUBSCRIBE","params":["{instrumentSymbol}@bookTicker"]}`. Streams: `@bookTicker`, `@depth5/10/20[@100ms]`, `@trade`, `contractStatus`. Example symbol `GEMI-BTC05M2606011000-UP`. Account streams need HMAC/OAuth headers (backend only). Source: https://developer.gemini.com/prediction-markets/websocket/streams.md
- QuickNode Streams: filters in JavaScript (or Go); destinations webhook/S3/Postgres/Azure/Kafka. Search results say Solana devnet/testnet listed, but unverified on the official Supported Chains page. Free trial: Solana real-time only, no backfill (paid). Re-verify.
- Prior art: "Prediction Markets HQ" is an AI-hosted daily podcast on Kalshi/Polymarket sports markets.

## Idea stress-test "Skin in the Game" (checked Nov 13, 2026)
- Gemini PM public API VERIFIED live (no key): `GET /v1/prediction-markets/events?status=active|settled&limit=50` (1004 active, 1000 settled; paginated via `offset`, `pagination.total`).
  Settled events carry `status:"settled"`, `resolvedAt`, `settlement.value`; each contract has `status:"settled"`, `marketState:"closed"`,
  `resolutionSide:"yes"|"no"`, `resolvedAt`, `settlementValue`, `source`. Active: crypto 5/15-min and hourly markets (resolve within minutes), weather (1-2 days), sports (2-3 days), commodities (Nov 20).
- Closest prior art: github.com/Mrgtee/precall (Arc testnet, PrecallRegistry bond, $0.01 x402 Gateway batched sell). Bond is SLASHED TO TREASURY, buyer is NOT refunded; Polymarket-based.
- Arc nanopayments starter: circlefin/arc-nanopayments (Node 22, Supabase, `@circle-fin/x402-batching` GatewayClient, faucet.circle.com for buyer USDC, "testnet only"; 7 open issues, 35 open PRs).

## Gemini PM: coverage + sandbox findings (checked Nov 13, 2026)
- Live active events: 1004 total. Categories: Sports ~800, Crypto ~89, Weather ~98 (daily high temp, ~10+ US cities), Commodities 6. NO rates/Fed/CPI/flights/rain/politics/mortgage markets.
- Sandbox https://api.sandbox.gemini.com serves public PM events (works, no key). Sandbox docs page (get-started/sandbox.md) never mentions PM; trading-quickstart only lists prod URL. Sandbox trading unconfirmed; contact trading@gemini.com / office hours.
- Trading needs: account with "Prediction Markets access", API key with Trader role, accepted PM terms (GET terms status -> POST accept), limit orders only in quickstart. Sandbox has no deposits/withdrawals (test balances only, $100k USD).
- Pagination: use limit=100&offset=N (limit=500 truncates ~11MB; rate limits hit by offset 500+ in rapid succession).
- Kalshi flight-cancellation contracts: reports conflict (Fortune Jul 2026 says pulled). Not on Gemini.

## Bonded Forecasters (Solana) (checked Nov 13, 2026)
- x402 Solana devnet: free testnet facilitator `https://x402.org/facilitator` (Base Sepolia + Solana devnet, `exact` scheme, no key). Devnet CAIP-2 `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`. Server: `@x402/express|hono|next|fastify` + `@x402/core` + `@x402/svm` (`ExactSvmScheme` from `@x402/svm/exact/server`); Next: `withX402` (settles only after success). Client: `@x402/fetch` + `@x402/svm` + `@solana/kit`. Avoid V1 names (`solana-devnet`, X-PAYMENT). Versions not listed in docs; pin on install. Docs: https://docs.x402.org/getting-started/quickstart-for-sellers , https://solana.com/docs/payments/agentic-payments/x402
- Devnet USDC mint (Circle): `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (https://developers.circle.com/stablecoins/usdc-contract-addresses). Token program (classic vs 2022) not stated in docs: assume classic SPL, verify via `getAccountInfo` owner. Faucet: https://faucet.circle.com (unverified for Solana devnet).
- Prior art: SolSignal (Colosseum Agent Hackathon; agents publish signals, accuracy bps onchain; SOL "stake" is a tier fee, no bond/refund; no win claimed). Trepa (Breakout consumer winner) is graded-forecast markets. No bonded-with-buyer-refund product found.
- Tipster trust problem: only practitioner sources (hidden losses, fake slips); no hard stats found. https://www.startuphub.ai/ai-news/prediction-markets/2026/verifying-prediction-market-track-records-what-s-real

## Drain Guard stress-test (checked Nov 13, 2026)
- QuickNode Streams Solana DEVNET VERIFIED listed (supported-chains page): datasets Block + Logs ("with Programs"); no receipts/traces. https://www.quicknode.com/docs/streams/supported-chains
- Filter shape: `function main(stream)` (async if using qnLib KV), `stream.data` = array of blocks (each with `blockTime`, `transactions`); return object/array/string to deliver, `null` to skip. No require/import/network/fs. Credits consumed even when filter returns null. https://www.quicknode.com/docs/streams/filters
- Streams claims "exactly-once delivery in finality order" (FAQ) -> likely finalized-only on Solana (~13s+ after slot). UNVERIFIED; no official latency number or free-tier cap found. Free trial: Solana real-time only, no backfill. Measure in spike.
- SPL Revoke: token-account owner signs (Token-2022 also lets current delegate revoke). A token account holds ONE delegate; a new Approve overwrites. Freeze (mint freeze authority) blocks transfers, burns AND delegate changes: https://solana.com/docs/tokens/basics . Guardian freeze only works on mints where WE hold freeze authority (custom devnet mint).
- Token-2022 permanent delegate = attacker needs no victim signature; revoke does nothing. Revoke.cash lists Solana; Phantom has a permission manager. Blowfish/Blockaid/Webacy Solana coverage not verified.

## Weatherproof stress-test (checked Nov 13, 2026)
- Gemini weather LIVE (700 of 1004 active events paged): only `WXHIGH` listed (34 events, 21 cities: ATL AUS BOS CHI DCA DEN DFW HOU LA LAS MIA MSP MSY NYC OKC PHL PHX SAN SAT SEA SFO), exactly 2 days ahead (today + tomorrow; no WXLOW listed now though spec allows it). Each event = categorical ladder of 6 mutually exclusive 2F brackets ("66F or below", "67-68F"... "75F or above"), centered on forecast; bracket parity shifts day to day. Ticker `WXHIGH-AUS-2611150459` (UTC expiry 04:59 next day). Settlement: NWS Climatological Report (Daily), first published version. Spec: https://developer.gemini.com/prediction-markets/tickers-weather.md (v1.0, 2026-03-27).
- Liquidity is tiny: volume $0 to $443 per event, many brackets one-sided (bestAsk 0.01 only), spreads 5-7c. Price fields: contracts[].prices.{bestBid,bestAsk,buy,sell}, lastTradePrice sometimes.
- Settled weather events not found in first 200 settled results; resolution timing unverified.
- Prior art: Kalshi "Blanket" (tryblanket.app, 2026) finds Kalshi hedges for small businesses (28 Wishes ice cream, LA); no custody, no insurance, not onchain. Chainlink HACK-26: WeatherShield, Parametrix (parametric weather, oracle-based). Arbol (Chainlink), Etherisc (Oxfam/Aon). None found pricing cover from PM odds. Sources: https://defirate.com/news/blanket-kalshi-prediction-market-small-businesses/ ; https://www.businessinsurance.com/prediction-markets-gain-role-in-risk-transfer/
- Insurable interest / insurance licensing: use "weather cover"/"payout agreement", testnet-only disclaimer, not insurance.

## Odds Radio (round 2) (checked Nov 13, 2026)
- WS volume test (node 26 global WebSocket, 5 min, 12 symbols @bookTicker, ~14:30 local Friday-eve): 1504 msgs total. 1016 were ONE symbol (GEMI-BTC2611132300-HI68300, hourly BTC); other crypto 40-170 msgs; the 6 sports contracts (NCAAM/NBA totals, pre-game) produced 1-3 msgs each = effectively dead. Note: `s` field comes back lowercase; fields b/B/a/A (+ c/C, c is NOT a usable last-trade price, constant).
- Mid-price moves >=3c tick-to-tick: 27, but most are bid/ask flicker on wide-spread contracts (SOL hi78 flipped 0.565<->0.595 repeatedly). Real net drift over 5 min: BTC hourly +13c, ETH +3c, SOL +2c, rest <=1.5c. => Real "story" moves: ~1 in 5 min across 12 symbols. Filter on depth/trade, not mid; sports only move once games are live (re-test during a live game).
- QuickNode Streams: Solana Mainnet/Devnet/Testnet ALL supported, datasets Block and Logs (with Programs) only. https://www.quicknode.com/docs/streams/supported-chains
  Free trial (1 month, 10M credits): 1 active stream, 1 Solana stream, 1 webhook, ~333k webhook payloads, 30 credits per matched block, 15 rps; filters + KV + webhook dest OK. Postgres/S3 need Build ($; 10 streams, 5 Solana, 10 webhooks, 2.7M payloads). https://www.quicknode.com/pricing
- ElevenLabs (https://elevenlabs.io/pricing/api): Free 10k credits/mo (~10 min TTS, 15 min Agents, 4 concurrent), Starter $6/mo 75k chars/75 min, Creator $22/mo 275k/275 min. Commercial license starts at Starter; Free has none. Models: Flash/Turbo $0.04/1k chars ~75ms; v4 Turbo ~100ms (real-time); v3 Conversational ~280ms; v3/v4 $0.08/1k.
  Text-to-Dialogue: available via API on v3/v4, max 2,000 chars total per request, no streaming documented, mp3 default. https://elevenlabs.io/docs/overview/capabilities/text-to-dialogue (model ID strings not on that page; check API ref.)
- Audience evidence (weak): third-party estimates only: Action Network betting podcast ~36.5k/mo, The Favorites ~39.4k/mo (millionpodcasts, modeled); VSiN claims 8M reach across network (company claim). No data on live audio for prediction markets. Prior art: Prediction Markets HQ.

## Correction: Gemini weather liquidity snapshot (checked Nov 13, 2026, evening)
- Full paging (1004 active events) shows 98 WXHIGH events across **49** city codes (not 21 as above), today + tomorrow only.
- Lifetime volume across all weather events: ~$1,312; 85 of 98 events had $0; max $443 (NYC). Only 88 of 644 brackets had both bid and ask; median spread 5c.
- Order books look like one market maker quoting 100 / 10 contract sizes on every bracket (~$100 depth). By category, 24h volume: Sports ~$39.7k (≈$37k college basketball, one game $24.5k), Crypto ~$4.7k (mostly BTC), Weather ~$1k, Commodities $0.
- Public order book endpoint works without a key: `GET https://api.gemini.com/v1/book/{instrumentSymbol}`.

## Arc + Python tooling (checked Nov 13, 2026; from Agent Credit Line / Agent Mutual research)
- x402 Python: PyPI `x402` v2.28.0 (Python 3.10+), extras `[fastapi]`, `[flask]`, `[evm]`, `[httpx]`. Server: `PaymentMiddlewareASGI`, `x402ResourceServer`, `HTTPFacilitatorClient`, `ExactEvmServerScheme`; client: `x402Client` + `ExactEvmScheme` on `eip155:*`. Keep async/sync variants matched. Arc (`eip155:5042002`) support in facilitators unverified. https://pypi.org/project/x402/
- Circle Nanopayments (Gateway batching) credits sellers a Gateway balance; individual payments are not attributable onchain. Plain x402 `exact` is. https://developers.circle.com/gateway/nanopayments
- Arc native USDC Transfer logs come from system address `0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE` (18 decimals); don't also count the ERC-20 log. https://docs.arc.io/app-kit/tutorials/onramp/confirm-purchase-onchain
- Circle Python SDK: `circle-developer-controlled-wallets` (v9+, Pydantic v2). https://developers.circle.com/sdks/developer-controlled-wallets-python-sdk
- Arc ERC-8004 agent registries: Identity `0x8004A818BFB912233c491871b3d84c89A494BD9e`, Reputation `0x8004B663056A597Dffe9eCcC1965A193B7388713`. https://docs.arc.network/arc/tutorials/register-your-first-ai-agent
- USYC (tokenized money-market fund) on Arc testnet: token `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C`, Teller `0x9fdF14c5B14173D74C08Af27AebFf39240dC105A`, Entitlements `0xcc205224862c7641930c87679e98999d23c26113`. Requires allowlisting via Circle Support; docs say institutions outside the US only, $100k minimum. Not usable by us: simulate yield. https://docs.arc.io/arc/references/contract-addresses

## Deposit Keeper: California research (checked Nov 13, 2026) — CHOSEN PROJECT (D-001)
- AB 2801 amends Civil Code 1950.5: landlords must photograph the unit at move-in, move-out and after repairs/cleaning, and share photos with the tenant, before deducting. Tenants have no photo duty; no timestamp/metadata requirement. Effective dates conflict across sources (Apr 1 2025 move-out / Jul 1 2025 move-in most common; one says Jan 1 2026): VERIFY against leginfo before pitching. https://baylegal.com/ab-2801-security-deposit-photo-documentation-rules/ ; https://smartrent.com/news/california-ab2801-increases-restrictions-on-security-deposits/
- Return deadline 21 days after move-out (Civil Code 1950.5). Deposit cap one month's rent since Jul 1 2024 (AB 12), small-landlord exception (terms vary by source). https://www.sf.gov/news/security-deposit-laws-are-changing-july-1-2024
- No state deposit-interest requirement. City of LA requires interest only for rent-stabilized units (C of O before Oct 1 1978); 0.52% for 2024. https://housing2.lacity.org/wp-content/uploads/2023/01/44-Interest-Payments-on-Security-Deposits-English.pdf
- Bad-faith retention penalty (up to 2x deposit) is from memory: VERIFY.
- Competitors: AB 2801 photo-compliance apps (Timemark, RentCheck, Rentec Direct) store photos but don't hold deposits or propose splits. Deposit alternatives (LeaseLock, Rhino/Jetty) sell non-refundable fees. AI move-out tools: Paraspot (acquired by AppWork Oct 2026), RentSolve, PropCheckAI (accuracy claims are vendor marketing). Hackathon rental-escrow prototypes exist (DeWork, Move In Proof, RentEscrow, Veriflow), no winners found.
- AI risk: no independent before/after room-damage benchmark found; BEAF (https://arxiv.org/abs/2407.13442) shows VLMs often ignore image changes. Mitigate with matched shot lists, region citations, confidence threshold, appeal.
