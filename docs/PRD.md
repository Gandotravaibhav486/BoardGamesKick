# Product Requirements Document

## Product

AI-native board game creation, playtesting, community, and crowdfunding platform.

Working product principle:

> PLAY BEFORE YOU BACK.

---

# 1. PRODUCT VISION

Allow a person to describe a board game in natural language and turn that idea into a playable digital prototype.

The platform should allow:

1. Create game
2. Describe rules
3. Compile rules with AI
4. Validate rules
5. Play the prototype
6. Publish it
7. Get community playtesters
8. Collect feedback
9. Iterate versions
10. Eventually crowdfund the physical game

Core loop:

IDEA
→ RULES
→ PLAYABLE PROTOTYPE
→ PLAYTEST
→ FEEDBACK
→ ITERATION
→ CROWDFUNDING

---

# 2. PRIMARY USERS

## Designer

Wants to:

- Create a game
- Convert rules into a playable prototype
- Test it
- Publish it
- Receive feedback
- Iterate
- Eventually crowdfund it

## Player

Wants to:

- Discover games
- Understand what a game is
- Play immediately
- Join playtests
- Give feedback
- Follow interesting games

## Backer

Wants to:

- Understand the game
- Play the prototype
- Review evidence from playtesting
- Inspect campaign details
- Back the physical game

---

# 3. MVP CORE JOURNEY

Designer:

CREATE
→ ENTER RULES
→ COMPILE
→ VALIDATE
→ PLAY
→ PUBLISH

Player:

DISCOVER
→ GAME PAGE
→ PLAY
→ COMPLETE
→ FEEDBACK

Designer:

FEEDBACK
→ ITERATE
→ NEW VERSION

Backer:

CAMPAIGN
→ PLAY THE GAME
→ REVIEW CAMPAIGN
→ SIMULATE/BACK

---

# 4. GAME CREATION

The creation flow should capture:

- Game title
- Short pitch
- Player count
- Estimated play time
- Complexity
- Mechanics
- Rules
- Optional supporting documents

The designer should be able to submit natural-language rules.

The system compiles them into Game Spec JSON.

---

# 5. RULES COMPILER

Pipeline:

Natural Language
→ LLM
→ Structured Game Spec
→ Schema Validation
→ Semantic Validation
→ Playable Prototype

The compiler must expose:

- ambiguities
- unsupported rules
- warnings
- clarification questions

Never silently discard rules.

---

# 6. PLAYABLE GAME

The generated game must be executable by the deterministic game engine.

The engine should support the MVP mechanics defined in GAME_SPEC.md.

Players should be able to:

- Join a game
- Understand their state
- Take legal actions
- See game state change
- Complete the game
- See result/scoring

---

# 7. COMMUNITY

Community should provide:

- Featured games
- New games
- Trending games
- Games needing playtesters
- Recently updated games
- Search
- Filters

Game detail pages should include:

- Hero
- Title
- Designer
- Pitch
- Metadata
- Play Now
- Join Playtest
- Follow
- Gameplay
- Rules
- Feedback
- Version history
- Designer information

---

# 8. PLAYTEST FEEDBACK

Players should be able to submit:

- Fun score: 1–5
- Clarity score: 1–5
- Balance score: 1–5
- Length score: 1–5
- Free-form feedback

Designers should see feedback in their dashboard.

---

# 9. VERSIONING

Games should have immutable versions.

A new rules change should create a new version rather than silently mutating the published version.

Version history should expose:

- Version number
- Date
- Changes
- Playable version
- Feedback associated with the version

---

# 10. CROWDFUNDING

Campaigns should support:

- Title
- Story
- Hero image
- Funding goal
- Deadline
- Progress
- Rewards
- Limited rewards
- Stretch goals
- Updates
- FAQ

Campaign states:

DRAFT
LIVE
FUNDED
FAILED

During MVP:

Use mock/sandbox payments.

Create an abstraction so a production provider can later be introduced.

---

# 11. KEY PRODUCT DIFFERENTIATOR

The campaign page should prominently support:

PLAY THE GAME

before:

BACK THIS GAME

The product should demonstrate actual playable evidence rather than relying only on campaign marketing.

---

# 12. MVP NON-GOALS

Do not prioritize during the build-day MVP:

- Production payment settlement
- Full KYC
- Tax infrastructure
- Complex marketplace payouts
- Advanced recommendation algorithms
- Sophisticated social graph
- Large-scale matchmaking
- Full competitive ranking
- Native mobile apps
- Fully general-purpose board-game DSL

---

# 13. SUCCESS CRITERIA

A user should be able to:

1. Create a game
2. Enter natural-language rules
3. Compile those rules
4. Resolve compiler issues
5. Generate a valid Game Spec
6. Launch a playable game
7. Complete a game
8. Publish it
9. Discover it from the community
10. Play it again
11. Leave feedback
12. View the game version
13. Create a campaign
14. Play before backing
15. Simulate a pledge