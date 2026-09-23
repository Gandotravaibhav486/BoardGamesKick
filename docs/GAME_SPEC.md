# Game Spec

## Purpose

Game Spec is the machine-readable representation of a board game's rules.

It represents game logic and state.

It does NOT represent visual styling.

---

# 1. CORE PRINCIPLE

Game Spec must be:

- Structured
- Validatable
- Versioned
- Deterministic
- Serializable
- Interpretable by the engine

The LLM produces Game Spec.

The engine executes Game Spec.

---

# 2. PLAYERS

Game Spec should represent:

- Minimum players
- Maximum players
- Player identifiers
- Player state
- Player resources
- Player hands
- Player areas

---

# 3. ENTITIES

Support:

- Boards
- Spaces
- Pieces
- Tokens
- Cards
- Decks
- Resources
- Counters
- Zones

---

# 4. ZONES

Zones may be:

- Public
- Private
- Shared
- Player-owned

Examples:

- Hand
- Deck
- Discard
- Tableau
- Board
- Reserve
- Player area

---

# 5. CARDS AND DECKS

Represent:

- Card definitions
- Deck definitions
- Card properties
- Draw
- Discard
- Shuffle
- Play
- Reveal

---

# 6. DICE AND RANDOMNESS

Represent:

- Dice
- Random values
- Random selection
- Seed

All randomness must be deterministic given a seed.

---

# 7. RESOURCES

Represent:

- Resource definitions
- Resource amounts
- Resource limits
- Gain
- Spend
- Transfer

---

# 8. TURN STRUCTURE

Represent:

- Rounds
- Turns
- Phases
- Steps
- Active player
- Player order
- Dynamic order
- Fixed order
- Simultaneous actions

---

# 9. ACTIONS

Initial action vocabulary should include:

- Move
- Place
- Remove
- Flip
- Draw
- Discard
- Play
- Trade
- Roll
- Gain resource
- Spend resource
- Pass

---

# 10. CONDITIONS

Rules should support structured conditions such as:

- Equals
- Not equals
- Greater than
- Less than
- Greater/equal
- Less/equal
- AND
- OR
- NOT
- Has resource
- Has card
- Is player
- Is active player
- Entity exists

---

# 11. EFFECTS

Effects should include:

- Change resource
- Move entity
- Create entity
- Remove entity
- Draw card
- Discard card
- Reveal
- Hide
- Change turn state
- Record score

---

# 12. SCORING

Represent:

- Score sources
- Score calculation
- End-game scoring
- Tiebreakers
- Winner determination

---

# 13. END CONDITIONS

Represent:

- Immediate win
- End-of-round condition
- End-of-deck
- Resource threshold
- Score threshold
- Board condition

---

# 14. HIDDEN INFORMATION

Game Spec must identify visibility.

Example conceptual model:

visibility:
  public
  private
  owner
  subset

The server is responsible for redaction.

---

# 15. EVENTS

The engine should emit structured events.

Examples:

GAME_STARTED
TURN_STARTED
CARD_DRAWN
CARD_PLAYED
RESOURCE_CHANGED
TOKEN_MOVED
DICE_ROLLED
ACTION_CONFIRMED
ROUND_STARTED
GAME_ENDED

Presentation/animation systems consume these events.

---

# 16. VALIDATION

Every Game Spec must pass:

1. Schema validation
2. Structural validation
3. Rule validation
4. Engine compatibility validation

Invalid specifications must not reach the playable engine.

---

# 17. UNSUPPORTED RULES

The compiler must expose unsupported rules explicitly.

Example:

{
  "unsupportedRules": [
    {
      "rule": "...",
      "reason": "...",
      "suggestedClarification": "..."
    }
  ]
}

Never silently approximate unsupported rules.

---

# 18. FUTURE EXTENSIBILITY

Potential future additions:

- Graph boards
- Hex boards
- Tracks
- More expressive conditions
- Bounded expression language
- Simultaneous resolution
- Bots
- Advanced simulations

Do not implement these unless required by the current vertical slice.
## EXTENSIBILITY

The MVP implements only a constrained subset of the eventual Game Spec.

The schema and engine must be designed so future mechanics can be added without replacing the core architecture.

The MVP is intentionally NOT a complete board-game language.

Future extensions may include:

- simultaneous actions
- drafting
- hand passing
- triggered effects
- conditional effects
- complex dependencies
- production chains
- trading
- multi-stage phases
- advanced scoring
- player relationships
- custom resolution sequences