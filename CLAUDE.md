# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # install deps (pnpm 12, Node 24)
pnpm dev              # Next.js dev server on http://localhost:3000
pnpm build            # production build — must pass before a phase is "done"
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint
pnpm test             # vitest run (all tests)
pnpm exec vitest run src/lib/game-spec/validate.test.ts   # single test file
scripts/screenshot.sh /play/tidepool shots/play.png 390x844   # headless Chrome screenshot (dev server must be running)
```

## Current State

Check `docs/BUILD_STATUS.md` for the current phase and what is REAL vs MOCKED vs NOT IMPLEMENTED. Phase 0 (visual foundation) is a single Next.js 16 app at the repo root (App Router, React 19, Tailwind v4, TypeScript). The monorepo `apps/`/`packages/` layout from `docs/ARCHITECTURE.md` was deferred; the same boundaries live as folders under `src/lib/` so they can be extracted later.

## Code Layout (the boundaries that matter)

- `src/lib/game-spec/` — Game Spec TS types (`types.ts`, source of truth), zod schema, `validateGameSpec()` (schema + semantic checks). Presentation-free.
- `src/lib/presentation/` — Presentation Spec types. Pure data.
- `src/lib/compiler/` — `RulesCompiler` boundary. `mock-compiler.ts` returns the showcase ruleset and honestly reports zero coverage; the real LLM compiler slots in here.
- `src/lib/engine/` — `GameEngine` interface (Phase 1 target). `demo-runtime.ts` is a client-side, heuristic demo used only to make the Phase 0 tabletop interactive — it is NOT the engine and must be replaced, not extended.
- `src/lib/showcase/tidepool.ts` — the original showcase game (tile drafting). Must run through generic code paths only.
- `src/lib/store.ts` — in-memory game store (MOCKED persistence; resets on restart).
- `src/components/renderer/` — generic tabletop renderer driven by spec + presentation + state. No game-specific components allowed here.
- `src/components/ui/` — app-shell primitives (Button, Input, Card, SiteNav). Design tokens live in `src/app/globals.css` and are exposed as Tailwind colors (`bg-primary`, `bg-felt`, `bg-tile-ember`, ...).

## Project Vision

An AI-native platform for creating, playtesting, and crowdfunding board games. The core loop:

```
IDEA → RULES → PLAYABLE PROTOTYPE → PLAYTEST → FEEDBACK → ITERATION → CROWDFUNDING
```

The key differentiator is **"play before you back"** — backers can play a real digital prototype of a game before funding its physical production, rather than relying on marketing copy alone.

## Required Reading Before Working

Read these in order before starting any phase of work (see `docs/FABLE-INSTRUCTIONS.md` §16):

1. `docs/FABLE-INSTRUCTIONS.md` — orchestration/role instructions, delegation model, working style
2. `docs/PRD.md` — product requirements, user journeys, MVP scope
3. `docs/ARCHITECTURE.md` — system architecture and technical principles
4. `docs/GAME_SPEC.md` — the game-rules data model
5. `docs/PRESENTATION_SPEC.md` — the visual/presentation data model
6. `docs/BUILD_STATUS.md` — current phase status, what's done, what's known-broken

Keep all six documents current as work progresses; update `docs/BUILD_STATUS.md` after completing each major phase.

## Core Architectural Principle (non-negotiable)

**The LLM must never generate arbitrary executable game code.** The AI rules compiler only ever produces structured, schema-validated data:

```
Natural Language Rules → AI Rules Compiler → Game Spec (JSON)
  → Schema Validation → Semantic Validation → Deterministic Game Engine
  → Game State → Generic Renderer → Playable Game
```

- LLM output is always structured data (Game Spec JSON), never JS/JSX/React.
- Every Game Spec goes through schema validation, then semantic/rule validation, before it can reach the playable engine.
- If a requested rule can't be represented, the compiler must surface it explicitly as an `unsupportedRules` entry (rule, reason, suggested clarification) — never silently drop or approximate it.

## Game Spec vs. Presentation Spec

These are strictly separate concerns and must not be merged:

- **Game Spec** (`docs/GAME_SPEC.md`) — the *what*: players, entities (boards/pieces/cards/decks/tokens/resources/zones), turn structure, actions, conditions, effects, scoring, win conditions, randomness (seeded/deterministic), hidden information/visibility. This is what the deterministic engine executes.
- **Presentation Spec** (`docs/PRESENTATION_SPEC.md`) — the *how it looks*: themes, typography, icon registry, component templates (card/token/resource/player area/etc.), layout, responsive breakpoints, animation config. Must be data-driven — **never** create per-game React components (no `GameAComponent.tsx`); a single generic renderer must handle all games by consuming Game Spec + Presentation Spec + Game State + engine events.

## Engine Design

- The engine must be framework-independent (no React dependency) so it's usable headlessly for testing, bots, simulations, and replays.
- Engine interface shape: `engine.initialize(spec, seed)`, `engine.getLegalActions(state)`, `engine.applyAction(state, action)`, `engine.getEvents()`, `engine.getResult()`.
- All randomness must be deterministic given a seed.
- Game logic must be server-authoritative: clients send `ACTION_INTENT` only; the server validates player/action, applies it to the engine, produces events, updates state, and broadcasts results. Clients never mutate authoritative state directly.
- Hidden information: the server holds the complete authoritative state and redacts what each client is allowed to see. Never rely on the frontend to hide private data (e.g. opponents' hands) that was already sent to the client.
- Realtime/socket infrastructure sits above the engine — the engine itself must remain usable without sockets.

## Suggested Repository Structure

Referenced by `docs/ARCHITECTURE.md`; adapt to whatever already exists rather than blindly imposing this if the repo evolves differently:

```
apps/
  web/
packages/
  engine/       # deterministic game engine (framework-independent)
  game-spec/    # Game Spec schema + validation
  compiler/     # NL rules -> Game Spec pipeline
  renderer/     # generic presentation-spec-driven renderer
  ui/           # shared UI components
docs/           # the six docs listed above
```

## Versioning

Published `GameVersion`s are immutable. A rules change creates `GameVersion N+1`; it never mutates `GameVersion N`.

## Payments

Route all payment operations through a `PaymentProvider` abstraction. MVP uses `MockPaymentProvider`; do not couple crowdfunding/campaign logic directly to a real provider (e.g. Stripe/Razorpay) even in MVP.

## Non-Goals for MVP

Per `docs/PRD.md` §12, do not prioritize: production payment settlement, full KYC, tax infrastructure, complex marketplace payouts, advanced recommendation algorithms, sophisticated social graphs, large-scale matchmaking, competitive ranking, native mobile apps, or a fully general-purpose board-game DSL.

## Verification Expectations

A phase is not "done" when code compiles — per `docs/FABLE-INSTRUCTIONS.md` §15, a phase is complete only when implementation exists, tests pass, integration works, UX has been checked in-browser, known failures are documented, and `docs/BUILD_STATUS.md` is updated. Minimum manual UI verification targets: desktop 1440×900 and mobile 390×844 (see `docs/PRESENTATION_SPEC.md` §17).

Do not fake game results, player counts, community activity, pledges, reviews, or playtest statistics anywhere in the product, including during MVP development.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
