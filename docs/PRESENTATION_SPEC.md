# Presentation Spec

## Purpose

Presentation Spec describes how a Game Spec should be presented visually.

It must never contain executable game logic.

---

# 1. SEPARATION

Game Spec:

WHAT THE GAME IS

Presentation Spec:

HOW THE GAME LOOKS

Renderer:

Game Spec
+
Presentation Spec
+
Game State
+
Engine Events

---

# 2. THEMES

Support:

- Light
- Dark

Theme configuration should include:

- Background
- Surface
- Primary
- Secondary
- Accent
- Text
- Muted text
- Borders
- Success
- Warning
- Error

Colors must maintain accessible contrast.

---

# 3. TYPOGRAPHY

Define:

- Font family
- Heading scale
- Body scale
- Caption scale
- Weight
- Line height

Avoid excessive font variation.

---

# 4. ICON REGISTRY

Use a centralized icon registry.

Do not allow arbitrary per-game icon components.

Icons should have:

- Name
- Meaning
- Fallback
- Accessible label

---

# 5. COMPONENT TEMPLATES

Renderer should provide generic templates for:

- Card
- Token
- Resource
- Player area
- Board space
- Deck
- Hand
- Counter
- Action
- Game log
- Score
- Turn indicator

---

# 6. CARD PRESENTATION

Card configuration may describe:

- Orientation
- Size
- Header
- Illustration
- Cost
- Rules text
- Tags
- Footer
- State

Cards should automatically adapt to content length.

---

# 7. LAYOUT

Support:

- Table
- Player areas
- Opponent areas
- Board
- Hand
- Action bar
- Game log

Layout should be data-driven.

---

# 8. RESPONSIVE BREAKPOINTS

Desktop:

>= 1280px

Tablet:

768px–1279px

Phone:

< 768px

Desktop should prioritize the complete tabletop.

Mobile should provide dedicated navigation for:

- My Area
- Table
- Opponents
- Log

The hand should remain easily accessible.

---

# 9. TABLETOP INTERACTION

Support:

- Pan
- Zoom
- Inspect
- Select
- Action
- Confirm

Legal moves should be visually clear.

Illegal moves should be disabled or clearly communicated.

---

# 10. LEVEL OF DETAIL

Use appropriate LOD depending on available space.

For example:

Desktop:
full card detail

Tablet:
condensed card detail

Mobile:
focused card detail / inspect view

---

# 11. TEXT FITTING

The renderer must prevent:

- Text overflow
- Broken card layouts
- Invisible content
- Overlapping controls

Use controlled truncation or expandable inspection where appropriate.

---

# 12. ANIMATION

Animations should be driven by engine events.

Examples:

CARD_DRAWN
→ card movement animation

TOKEN_MOVED
→ token movement

RESOURCE_CHANGED
→ counter transition

GAME_ENDED
→ result presentation

Do not encode game rules inside animations.

---

# 13. PERFORMANCE

Prefer:

DOM/SVG for:

- Cards
- Text
- UI
- Controls
- Accessibility-sensitive content

Consider WebGL/PixiJS only when benchmarks demonstrate a need.

Target:

60fps on a reasonable laptop

30fps minimum on Android-class devices

---

# 14. ACCESSIBILITY

Test:

- Keyboard navigation
- Focus states
- Screen reader labels
- Color contrast
- Text size
- Interactive target sizes
- Reduced motion
- axe accessibility checks

Do not rely solely on color to communicate game state.

---

# 15. VISUAL DEFAULTS

Every valid Game Spec should render even if no custom Presentation Spec exists.

Provide generated/default:

- Theme
- Colors
- Typography
- Icons
- Layout
- Card appearance

The game should never render as an unstyled developer prototype.

---

# 16. NO GAME-SPECIFIC REACT

Never create:

GameAComponent.tsx
GameBComponent.tsx
GameCComponent.tsx

Instead:

Game Spec
+
Presentation Spec
+
Generic Renderer

must support different games.

---

# 17. QUALITY TARGET

The tabletop should feel like a polished commercial digital board-game interface.

Minimum verification:

Desktop:
1440 × 900

Mobile:
390 × 844

Check:

- Typography
- Spacing
- Overflow
- Buttons
- Cards
- Player areas
- Hand
- Table
- Log
- Turn indicator
- Loading
- Empty states
- Errors
- Accessibility