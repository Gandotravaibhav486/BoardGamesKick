# Build Status

Last updated:
2026-09-23

## Overall Status

STATUS: PHASE 0 COMPLETE (visual foundation). Phase 1 NOT STARTED.

Legend: **REAL** = implemented and verified · **MOCKED** = present but simulated, clearly labeled in-product · **NOT IMPLEMENTED** = absent

---

# Phase 0 — Visual Foundation

Status: COMPLETE (see Known Issues)

### Stack decisions

- Single Next.js 16 app at repo root (App Router, React 19, Tailwind v4, TypeScript, pnpm). The `apps/`/`packages/` monorepo from ARCHITECTURE.md is deferred; the same boundaries exist as folders under `src/lib/` (`game-spec`, `presentation`, `compiler`, `engine`, `showcase`) and `src/components/renderer`, so extraction later is mechanical.
- Persistence is an in-memory `Map` (`src/lib/store.ts`). MOCKED — resets on server restart.
- No auth. Every created game is attributed to designer "You".

### Completed

- [x] Design tokens (`src/app/globals.css`) + UI primitives (Button, Input/Textarea/Select/Field, Card, Badge, SiteNav/Footer) — REAL
- [x] Landing page `/` — hero, how-it-works, Play-Before-You-Back band, trust section, CTAs — REAL (no fabricated stats)
- [x] Create Game `/create` — validated form (zod, server action), loading state, field errors, pipeline sidebar with honest prototype note — REAL
- [x] Rules compiler boundary (`RulesCompiler`, `CompileInput`, `CompileResult`, `UnsupportedRule`) — REAL interface
- [x] Rules compiler implementation — **MOCKED** (`mock-compiler.ts`): returns the Tidepool showcase ruleset re-titled from the form; reports every submitted rule sentence as *not yet represented*; emits a visible "Prototype compiler" warning. No LLM call is made.
- [x] Game detail `/games/[id]` — hero, status, compiler report (notes / unsupported rules / coverage), how-to-play, rule-spec summary derived from the spec, versions list, Play-Before-You-Back panel, Publish (draft → published) — REAL
- [x] Community `/community` — featured showcase, published-games grid, `?q=` search, real empty states, drafts section — REAL
- [x] Game Spec TypeScript types (`src/lib/game-spec/types.ts`) — REAL
- [x] Game Spec zod schema + `validateGameSpec()` with schema and semantic checks (unique ids, zone/entity/action reference integrity, phase reachability, cellPattern vs grid dimensions, player bounds) — REAL, tested
- [x] Presentation Spec types — REAL
- [x] `GameEngine` interface (`src/lib/engine/types.ts`) — REAL interface, NO implementation
- [x] Original showcase game "Tidepool" spec + presentation (`src/lib/showcase/tidepool.ts`) — REAL data, validates clean with zero warnings
- [x] Generic tabletop renderer `/play/[id]` (`src/components/renderer/*`) — see Phase 0 tabletop notes below
- [x] Tests: vitest, 10 passing (`pnpm test`)
- [x] Screenshot tooling: `node scripts/shots.mjs` (Playwright-core + installed Chrome; reports horizontal overflow)

### Tabletop (`/play/[gameId]`)

- Renderer is data-driven from Game Spec + Presentation Spec + Game State: zones render by geometry (row / grid / stack), tiles take color + icon from `entityStyles`, layout from `zonePlacements`. No game-specific components. — REAL
- Interaction is SELECT → ACTION → CONFIRM with legal-destination highlighting, game log, turn indicator, score chips, mobile tab navigation (My Area / Table / Opponents / Log). — REAL UI
- Game logic behind the tabletop is **MOCKED**: `src/lib/engine/demo-runtime.ts` is a client-side heuristic that builds initial state from `spec.setup` and moves tiles between zones so the board feels alive. It does not evaluate spec conditions/effects, does not score, does not end the game, and is not server-authoritative. It must be replaced by the Phase 1 engine, not extended.
- Opponents are advanced via a "Simulate opponent turn" button using a seeded PRNG. — MOCKED (labeled)

### Verification

- [x] `pnpm typecheck` clean
- [x] `pnpm test` 10/10
- [x] `pnpm build` passes (Next 16.3.5, Turbopack; 6 routes)
- [x] `pnpm lint` clean
- [x] Landing → Create → Generate → Detail (`?compiled=1`) → Publish → Community shows game: exercised in a real browser (Playwright-core), zero console errors
- [x] Screenshots reviewed at 1440×900 and 390×844 for `/`, `/create`, `/community`, `/games/tidepool`, `/play/tidepool`; no horizontal overflow at 390px
- [x] Desktop tabletop interaction (select → highlight → confirm → simulate opponent → log) exercised in a real browser
- [ ] Mobile tabletop interaction — NOT VERIFIED (deliberately deprioritized: MVP demo is desktop-first). Tiles are selectable on mobile; the select → destination → confirm path was not confirmed working.
- [ ] Accessibility audit (axe) — NOT DONE; semantic headings, labels, focus rings and aria on tabs/errors are in place, but not audited
- [ ] Visual regression — NOT IMPLEMENTED
- [ ] Performance benchmark — NOT IMPLEMENTED

### Known Issues

- The compiler report on the detail page is recomputed from stored inputs on `?compiled=1` rather than persisted, because `GameVersion` has no field for compile output. Safe only while the compiler is deterministic; add a persisted compile report in Phase 1/2.
- `spec.actions[*].effects` in the Tidepool spec use placeholder zone refs (`pool-1`, `row-1`) because the Effect vocabulary cannot yet express "the pool the player selected" / "the row the player selected". Phase 1 must add parameter binding (selected zone/entity) to `ZoneRef`/`Effect` before an engine can execute these actions.
- Mobile tabletop interaction unverified (see Verification). Desktop is the demo target.
- In dev mode the Next.js devtools badge overlaps the mobile "My Area" tab; absent in production builds.
- Next.js appended an auto-generated `<!-- BEGIN:nextjs-agent-rules -->` block to `CLAUDE.md`; harmless, left in place.

---

# Phase 1 — Game Engine + Foundation

Status: NOT STARTED

### Completed

- [x] Game Spec schema (done in Phase 0)
- [ ] Deterministic engine
- [ ] Player state
- [ ] Cards/decks
- [ ] Tokens
- [ ] Resources
- [ ] Turns
- [ ] Actions
- [ ] Scoring
- [ ] Win conditions
- [x] Seeded randomness (mulberry32 PRNG exists in demo-runtime; move into engine)
- [ ] Hidden information (server-side redaction — `viewFor` is on the interface only)
- [ ] Engine tests
- [x] Showcase game spec (Tidepool) — needs engine to actually run

### Verification

- [ ] Unit tests
- [ ] Determinism tests
- [ ] Legal action tests
- [ ] Illegal action tests
- [ ] Headless game execution

### Known Issues

- Effect/ZoneRef vocabulary needs selection parameters (see Phase 0 Known Issues).

---

# Phase 2 — AI Game Builder

Status: NOT STARTED

### Completed

- [x] Create Game flow (UI done in Phase 0)
- [x] Natural-language rules input
- [ ] Rules compiler (LLM → Game Spec) — currently MOCKED
- [x] Game Spec validation
- [ ] Ambiguity detection
- [ ] Unsupported rule detection (report UI exists; always empty from mock)
- [ ] Clarification flow
- [~] Coverage report (UI exists; mock reports 0% coverage honestly)
- [~] Create → Compile → Play flow (works end-to-end against the mock)

### Verification

- [ ] Compiler tests
- [ ] 10-case compiler evaluation
- [ ] End-to-end creation test

---

# Phase 3 — Playable Tabletop

Status: NOT STARTED (visual foundation exists from Phase 0)

### Completed

- [x] Generic renderer (visual; needs engine wiring)
- [x] Presentation Spec (types + showcase instance)
- [ ] Cards
- [ ] Hands
- [ ] Decks (stack zones render as counts only)
- [x] Tokens/tiles
- [ ] Resources (types exist; not rendered)
- [x] Player areas
- [x] Table
- [x] Action bar
- [x] Turn indicator
- [x] Game log
- [x] Legal move highlighting (driven by demo heuristic, not engine)
- [x] Mobile layout (tabbed)
- [ ] Accessibility audit

### Verification

- [x] Desktop 1440x900 (screenshot review)
- [x] Mobile 390x844 (screenshot review)
- [ ] Accessibility
- [ ] Visual regression
- [ ] Performance benchmark

---

# Phase 4 — Community + Playtesting

Status: NOT STARTED (discovery + publish UI exists from Phase 0)

### Completed

- [x] Community page
- [x] Search
- [ ] Filters
- [x] Game cards
- [x] Game detail page
- [x] Publish flow (in-memory)
- [ ] Playtest flow
- [ ] Feedback
- [ ] Designer dashboard
- [~] Version history (list renders; only v1 ever exists — no re-compile creates v2 yet)

---

# Phase 5 — Crowdfunding

Status: NOT STARTED

- Detail page shows a disabled "Campaign coming in a later phase" affordance and explains Play-Before-You-Back. No campaign entities, pledges, rewards or payment abstraction exist. NOT IMPLEMENTED.

---

# Phase 6 — Final QA

Status: NOT STARTED

---

# FINAL ACCEPTANCE

The product is NOT considered complete until the following journey works:

LANDING → CREATE → COMPILE → PLAY → PUBLISH → COMMUNITY → DISCOVER → PLAY → FEEDBACK → DASHBOARD → CROWDFUND → PLAY BEFORE BACKING

Current reach: LANDING → CREATE → COMPILE (mock) → PLAY (visual demo, no rules) → PUBLISH → COMMUNITY → DISCOVER → PLAY. FEEDBACK, DASHBOARD, CROWDFUND, PLAY-BEFORE-BACKING (as a campaign flow) are NOT IMPLEMENTED.

Final status:

NOT ACCEPTED
