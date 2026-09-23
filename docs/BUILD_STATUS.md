# Build Status

Last updated:
2026-09-23

## Overall Status

STATUS: PHASE 1 COMPLETE (AI → playable game). Phase 2 NOT STARTED.

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

# Phase 2 — AI Game Builder

Status: PARTIALLY COVERED BY PHASE 1

- [x] Create Game flow, natural-language input, rules compiler (REAL), spec validation, unsupported-rule detection, ambiguity detection (reported, not interactively resolved), coverage report, Create → Compile → Play
- [ ] Clarification flow (answer questions → recompile) — NOT IMPLEMENTED
- [ ] 10-case compiler evaluation — NOT DONE
- [ ] Multiple archetypes — NOT IMPLEMENTED

---

# Phase 3 — Playable Tabletop

Status: DESKTOP COMPLETE FOR THE ARCHETYPE

- [x] Generic renderer, presentation spec, tiles/tokens, player areas, table, action bar, turn indicator, game log, legal-move highlighting (engine-driven), scores, game end
- [ ] Cards / hands / decks / resources rendering — types exist, NOT rendered (not needed by the archetype)
- [ ] Mobile QA, accessibility audit, visual regression, performance benchmark — NOT DONE

---

# Phase 4 — Community + Playtesting

Status: NOT STARTED (publish/discover/search/detail exist from Phase 0; no feedback, dashboard, or re-versioning)

# Phase 5 — Crowdfunding

Status: NOT STARTED (detail page shows a disabled "Campaign coming in a later phase" affordance; no campaign entities or payment abstraction)

# Phase 6 — Final QA

Status: NOT STARTED

---

# FINAL ACCEPTANCE

LANDING → CREATE → COMPILE → PLAY → PUBLISH → COMMUNITY → DISCOVER → PLAY → FEEDBACK → DASHBOARD → CROWDFUND → PLAY BEFORE BACKING

Current reach (all REAL except where noted): LANDING → CREATE → COMPILE (real AI) → PLAY (real engine, client-side) → PUBLISH → COMMUNITY → DISCOVER → PLAY. FEEDBACK, DASHBOARD, CROWDFUND, PLAY-BEFORE-BACKING as a campaign flow: NOT IMPLEMENTED.

Final status:

NOT ACCEPTED
