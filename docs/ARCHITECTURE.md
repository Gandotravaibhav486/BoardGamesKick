# Architecture

## 1. Architecture Principles

1. Server authoritative game state
2. Deterministic game engine
3. Structured Game Spec
4. No arbitrary executable game code from LLM
5. Generic renderer
6. Game logic separated from presentation
7. Versioned game definitions
8. Reusable platform components
9. Testable deterministic core
10. Provider abstractions for external services

---

# 2. High-Level Architecture

Browser
   ↓
Next.js Application
   ↓
Application/API Layer
   ↓
Game Service
   ↓
Deterministic Game Engine
   ↓
Game State

Supporting systems:

AI Rules Compiler
Database
Authentication
Storage
Realtime layer
Job queue
Payment abstraction

---

# 3. Suggested Repository Structure

Use the existing repository structure where sensible.

A possible target:

apps/
  web/

packages/
  engine/
  game-spec/
  compiler/
  renderer/
  ui/

docs/
  FABLE_INSTRUCTIONS.md
  PRD.md
  ARCHITECTURE.md
  GAME_SPEC.md
  PRESENTATION_SPEC.md
  BUILD_STATUS.md

---

# 4. GAME ENGINE

The engine must be independent from React.

Input:

Game Spec
Initial State
Seed

Output:

Game State
Events
Legal Actions
Result

Example:

engine.initialize(spec, seed)

engine.getLegalActions(state)

engine.applyAction(state, action)

engine.getEvents()

engine.getResult()

---

## 4b. MVP engine scope (Phase 1 decision)

The engine implements one archetype ("tile-drafting"), selected by
`spec.mechanics.archetype` and driven entirely by `spec.mechanics.params`
plus zone `role`s. It is pure and deterministic: all randomness flows through
`state.rngState`, and `applyAction` re-derives legality from
`getLegalActions` before mutating anything. `LegalAction` is a concrete,
fully-specified move the client echoes back as an `ActionIntent`.

Phase 1 runs the engine in the browser (single-player vs. seeded bots); the
server-authoritative loop in §5 is unchanged as the target and is NOT yet
implemented.

---

# 5. SERVER AUTHORITY

Clients do not directly mutate authoritative game state.

Client sends:

ACTION_INTENT

Server:

1. Validates player
2. Validates action
3. Applies action to engine
4. Produces events
5. Updates state
6. Broadcasts resulting state/events

---

# 6. AI COMPILER

The compiler should be treated as a transformation pipeline:

Rules
 ↓
LLM structured output
 ↓
Game Spec
 ↓
Schema validation
 ↓
Semantic validation
 ↓
Coverage report
 ↓
Playable engine

The LLM is not trusted as executable code.

---

# 7. DATABASE

Use the existing database if present.

Core entities should conceptually include:

User
Game
GameVersion
GameSpec
PresentationSpec
GameSession
Playtest
Feedback
Campaign
Reward
Pledge

Do not create unnecessary entities until required.

---

# 8. VERSIONING

A published GameVersion should be immutable.

Changes create:

GameVersion N+1

rather than mutating:

GameVersion N

---

# 9. PRESENTATION

Renderer consumes:

Game Spec
+
Presentation Spec
+
Game State
+
Engine Events

Renderer should not contain game-specific rule logic.

---

# 10. LLM BOUNDARY

Allowed:

LLM → structured Game Spec

Not allowed:

LLM → arbitrary JavaScript
LLM → arbitrary React
LLM → executable game code

---

# 11. RANDOMNESS

Game randomness must be deterministic when given a seed.

This enables:

- Replays
- Debugging
- Testing
- Reproducibility

---

# 12. HIDDEN INFORMATION

Server maintains authoritative complete state.

Client receives only information that player is allowed to see.

Do not send private cards/resources to clients and rely only on frontend hiding.

---

# 13. REALTIME

Realtime infrastructure should sit above the authoritative game engine.

The engine should remain usable without sockets.

This allows:

- Headless testing
- Bots
- Simulations
- Replays
- Async games

---

# 14. PAYMENT

Use:

PaymentProvider interface

rather than coupling campaign logic directly to Stripe/Razorpay.

MVP implementation:

MockPaymentProvider

Future implementations:

Stripe
Razorpay

---

# 15. SECURITY

Important boundaries:

- Validate all Game Specs
- Validate all actions server-side
- Validate ownership
- Protect private information
- Rate-limit expensive compiler calls
- Never execute generated code
- Validate uploads
- Protect payment webhooks
- Make webhook handling idempotent

---

# 16. PERFORMANCE

Prefer:

- Deterministic pure engine functions
- Server-side validation
- Efficient state updates
- Event-based updates
- Lazy loading
- Virtualization where necessary

Do not introduce complex optimization before measuring.

For rendering, benchmark DOM/SVG against WebGL before committing to a rendering technology for high-object-count scenes.