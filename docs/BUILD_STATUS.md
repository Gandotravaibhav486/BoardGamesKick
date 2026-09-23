# Build Status

Last updated:
2026-09-23

## Overall Status

STATUS: PHASE 2 COMPLETE (publish → community → play before you back → mock back). Phase 3+ NOT STARTED.

Legend: **REAL** = implemented and verified · **MOCKED** = present but simulated, clearly labeled in-product · **NOT IMPLEMENTED** = absent

---

# Phase 0 — Visual Foundation

Status: COMPLETE (commit `8a95cca`)

Single Next.js 16 app at repo root (App Router, React 19, Tailwind v4, TypeScript, pnpm). Design tokens + UI primitives, landing page, create form, community page, game detail page, generic tabletop renderer, Game Spec types + zod schema + semantic validation, original showcase game "Tidepool". See git history for details. Persistence is an in-memory `Map` (`src/lib/store.ts`) — MOCKED, resets on server restart. No auth; created games are attributed to "You".

---

# Phase 1 — AI → Playable Game

Status: COMPLETE (desktop demo target)

### Architecture decision

The generic condition/effect vocabulary in GAME_SPEC.md is retained as the long-term target but is NOT interpreted by the engine yet. Instead every spec carries `mechanics: { archetype: "tile-drafting", params }` and zones carry a functional `role`. The LLM produces a compact `TileDraftingDesign`; `buildTileDraftingGame()` (`src/lib/game-spec/tile-drafting.ts`) expands it deterministically into a full spec + presentation, which is then schema- and semantically-validated. The LLM never writes zones, actions, effects or code. Anything outside the archetype is reported as an unsupported rule.

### Completed — REAL

- [x] **AI rules compiler** (`src/lib/compiler/anthropic-compiler.ts`): `@anthropic-ai/sdk`, `client.messages.parse` with `zodOutputFormat` structured output, model `claude-opus-5`, effort medium, 120s timeout. Pipeline: LLM → normalize design → build spec → `validateGameSpec` → one retry with validation errors fed back → ok/failed. Typed SDK errors become a `failed` CompileResult with a human-readable issue. Credentials via the Anthropic SDK's default resolution (`ant auth login` profile or `ANTHROPIC_API_KEY`); none hardcoded.
- [x] Compiler honesty: `unsupportedRules` (rule / reason / suggested clarification), `ambiguities` (with clarification questions), sentence-level `coverage`, `fit: "unsupported"` when the description is not a tile-drafting game. Compile report persisted on `GameVersion.compileReport` and rendered on the detail page ("Compiled by claude-opus-5 in 23.8s").
- [x] **Deterministic engine** (`src/lib/engine/tile-drafting-engine.ts`): pure functions, all randomness via `state.rngState` (mulberry32). `initialize` runs `spec.setup`; `getLegalActions` returns concrete moves; `applyAction` re-validates then moves tiles (right-aligned rows, overflow → penalty → discard, starting marker), auto-resolves the build phase (mosaic placement, adjacency or flat scoring, penalties floored at 0), refills pools (reshuffling discard into supply when exhausted), advances rounds, applies end bonuses (rows / columns / sets), determines winners with tiebreak; `getResult`; `viewFor` redacts private zones. `chooseBotAction` = deterministic simple bot.
- [x] **Tabletop wired to the engine** (`src/components/renderer/Tabletop.tsx`): SELECT → ACTION → CONFIRM using engine legal actions; illegal rows dimmed with reasons; opponents auto-play via the seeded bot (900ms); events → game log with score highlighting; round-end banner; game-over overlay with sorted scores, winner, "Play again". `demo-runtime.ts` deleted.
- [x] **Create → Generate flow**: staged progress panel during the real compile; failure panel lists unsupported rules / issues / uncovered sentences with values preserved for retry; success redirects to the detail page with the persisted report; "Play now" opens the generated game in the same generic renderer.
- [x] Tidepool rebuilt from a `TileDraftingDesign` via the builder (same theme, names, scoring); validates with zero warnings.
- [x] Tile icons switch to dark ink on light tile colors (LLM-chosen palettes).

### Verification

- [x] `pnpm typecheck` 0 errors · `pnpm lint` clean · `pnpm test` 42 passed, 1 skipped (live LLM test gated on `LIVE_LLM=1`) · `pnpm build` passes
- [x] Engine tests (28): entity conservation across a full game, determinism (same seed → deep-equal; same action sequence → deep-equal), legal/illegal actions, right-aligned placement, overflow → penalty, starting marker, adjacency scoring cases (1 / 2 / L-shape 4), flat scoring, penalty floor, round progression + refill from discard, full 3-player bot game to `finished`, "rounds" end condition
- [x] Compiler tests (4, no network): ok path, unsupported fit, retry-then-succeed on validation failure, SDK error → failed result. Live test: Tidepool rules → status ok, 5 tile types, 12/12 sentences covered, ~23s
- [x] Browser (Playwright, 1440×900): `/play/tidepool` — select → 6 legal destinations → confirm → bots auto-play → round-end banner → full game to "Game over" (final 31 / 29 / 0, completed-row bonus logged)
- [x] Browser end-to-end with the REAL compiler (`node scripts/e2e-create-play.mjs`): new description "Harbor Lights" (7 docks, 5 lantern colours, harbourmaster token, bilge penalties, lighthouse mosaic, plus a trading rule) → compiled in 24.6s by claude-opus-5 → detail page shows 3 ambiguities and 1 unsupported rule (trading) → Play now → 29 tiles rendered with the LLM's theme → move applied, bots played, zero console errors
- [ ] Mobile tabletop — NOT VERIFIED (deliberately out of scope; desktop demo)
- [ ] Accessibility audit — NOT DONE
- [ ] Compiler evaluation across 10+ varied descriptions — NOT DONE (2 live runs: Tidepool, Harbor Lights; both ok)

### Known limitations

- **Single archetype.** Only tile-drafting games compile and run. Descriptions outside it return an honest `failed` result with guidance; they do not become playable.
- **Client-side engine.** The engine runs in the browser (single human vs. two seeded bots). Server-authoritative play, hidden-information redaction over the wire, and multiplayer are NOT IMPLEMENTED (`viewFor` exists but is unused).
- **Generic effects not executed.** `spec.actions[*].effects`, `preconditions` and `endsWhen` are validated data only; the engine executes `mechanics.params`.
- **Compile latency** 20–30s per generation (claude-opus-5, medium effort). Progress UI is timer-based, not streamed.
- `needs-clarification` status is defined but never produced; ambiguities are folded into `ok` results as issues so the game stays playable.
- No `server-only` guard on `anthropic-compiler.ts` (package not installed); it is only imported from server actions / RSC today.
- In-memory store — created games vanish on server restart.

---

# Phase 2 — Publish → Community → Play Before You Back

Status: COMPLETE (desktop demo target; commit follows `21ac498`)

### Completed — REAL (in-memory persistence)

- [x] **Publish flow** — draft → published via server action; published games appear in `/community` immediately (existing Phase 0 flow, verified end to end with an AI-generated game)
- [x] **Community / discovery** (`src/app/community/page.tsx`, `src/components/marketing/game-card.tsx`, `game-preview.tsx`) — curated Featured layout for Tidepool, card grid with data-driven abstract preview art built only from each game's Presentation Spec colors (no images, no fake screenshots), designer, players, play time, pitch, Play / Details, `?q=` search, honest empty states, drafts section
- [x] **Game detail page** — hero, how-to-play, rule-spec summary, versions, playtest feedback, Play-Before-You-Back band, campaign section
- [x] **Play before you back** (`src/app/games/[gameId]/campaign-section.tsx`) — PLAY → UNDERSTAND → BACK visual, primary "Play the game" CTA → `/play/[id]?from=campaign`; every tabletop exit ("Back to game page", "Exit", game-over button) returns to `/games/[id]#campaign` so the backing decision is presented right after playing
- [x] **Playtest feedback** (`feedback-form.tsx`, `feedback-upvote-button.tsx`, `feedback-actions.ts`) — fun/clarity scores 1–5, comment, author; list with averages, upvotes (server action, optimistic), designer-response block; real empty state for games with no feedback. REAL mechanics; Tidepool ships with 4 seeded demo reviews (clearly fictional content on the showcase game only)

### Completed — MOCKED (clearly labeled in-product)

- [x] **Crowdfunding** (`src/lib/store.ts` `Campaign`/`RewardTier`/`Backer`, `campaign-actions.ts`) — goal, raised, progress bar, deadline countdown, backer count, story, 4 reward tiers (two limited with sold-out handling), "Back this game" → tier selection → "Confirm backing (simulated)" → success state; raised/backer counts update. Every campaign shows "Simulated crowdfunding demo — no real payments" and the story text says so. Backers and tier claims are deterministic mock data seeded per game; Tidepool: $6,000 goal, ~73% funded, ~285 mock backers. No payment provider, no `PaymentProvider` abstraction yet.
- [x] Community funding badge ("73% funded") derived from the same mock campaign data

### Verification

- [x] `pnpm typecheck` 0 errors · `pnpm lint` clean · `pnpm test` 42 passed / 1 skipped · `pnpm build` passes
- [x] Full demo flow in a real browser (`node scripts/e2e-full-demo.mjs`, 1440×900, 11/11 steps, zero console errors): LANDING → CREATE → GENERATE (real AI, 21s) → PLAY generated game (select → confirm) → tabletop exit lands on `#campaign` → PUBLISH → COMMUNITY lists it + Tidepool featured → TIDEPOOL page shows campaign → "Play the game" → `/play/tidepool?from=campaign` → return to `#campaign` → MOCK BACK (285 → 286 backers) → simulated label present
- [ ] Mobile — NOT VERIFIED (desktop demo)
- [ ] Accessibility audit — NOT DONE

### Known limitations

- All persistence is in-memory: published games, feedback, and mock pledges reset on server restart (Tidepool + its seeded campaign/feedback are re-seeded).
- Mock campaign numbers are generated, not entered by the designer; there is no campaign creation/editing UI.
- Feedback has no auth; author is free text. Upvote is once per browser session only.
- Seeded reward-tier `claimed` counts for the base backers are independent of the backer list (demo cosmetics).
- No re-versioning: playtest feedback does not yet feed a "new version" flow (CREATE → PLAY → FEEDBACK → IMPROVE is demonstrated, the IMPROVE step is manual).

---

# Phase 3 — Playable Tabletop

Status: DESKTOP COMPLETE FOR THE ARCHETYPE (see Phase 1); mobile QA, accessibility, visual regression NOT DONE

# Phase 4 — Community + Playtesting

Status: COVERED BY PHASE 2 except designer dashboard and version-from-feedback — NOT IMPLEMENTED

# Phase 5 — Crowdfunding

Status: MOCKED (see Phase 2). Campaign creation UI, `PaymentProvider` abstraction, stretch goals, updates, FAQ — NOT IMPLEMENTED

# Phase 6 — Final QA

Status: NOT STARTED

---

# FINAL ACCEPTANCE

LANDING → CREATE → COMPILE → PLAY → PUBLISH → COMMUNITY → DISCOVER → PLAY → FEEDBACK → DASHBOARD → CROWDFUND → PLAY BEFORE BACKING

Current reach: LANDING → CREATE → COMPILE (real AI) → PLAY (real engine, client-side) → PUBLISH → COMMUNITY → DISCOVER → PLAY → FEEDBACK (real, in-memory) → CROWDFUND (MOCKED, labeled) → PLAY BEFORE BACKING (real flow, mock pledge). DASHBOARD: NOT IMPLEMENTED.

Final status:

NOT ACCEPTED
