# FEATURES.md — Geno's Block Party

> A comprehensive feature inventory of the game, derived from a full codebase audit.
> Last updated from source: 2026-02-05

---

## 1. Gameplay

### Ball Physics & Movement
- Arcade physics with circular collision body (radius 10px)
- Perfect bounce (bounce factor 1,1) off walls and bricks
- World bounds collision on top, left, and right walls — **bottom is open** (ball falls out = life lost)
- Minimum speed enforcement prevents the ball from getting "stuck" going too slowly
- Minimum vertical velocity guard prevents boring near-horizontal loops
- Launch angle randomized between -120° and -60° (upward arc)
- Base speed: 400px/s, modified per level via `ballSpeedMultiplier`

### Paddle Mechanics
- Follows mouse/touch position with smooth interpolation (lerp factor 0.15)
- Clamped to screen bounds (can't leave the play area)
- Collision angle system: ball bounce angle is computed from where it hits the paddle
  - Center hit → straight up (-90°)
  - Left edge → steep left (-150°)
  - Right edge → steep right (-30°)
  - Smooth linear interpolation between edges
- Width: 120px base, expandable to 180px via Cake power-up
- Wobbly mode (Drinks debuff): sinusoidal offset applied to paddle target position

### Brick Types & HP System
| Type | Base HP | Score/Hit | Drop Chance | Color |
|------|---------|-----------|-------------|-------|
| **Present** | 1–3 | 10 | 15% | Pink |
| **Piñata** | 1–3 | 15 | 25% | Orange |
| **Balloon** | 1–3 | 20 | 30% | Cyan |
| **Drifter** | 1–3 | 25 | 20% | Ghostly blue |

### Drifter Bricks
- Special brick type that slowly drifts upward (~25 px/s)
- Gentle horizontal bobbing animation while drifting
- Semi-transparent ethereal appearance (alpha 0.75) with pulsing effect
- If it reaches the top of the screen (y < 60), it escapes: fades out, no points, no power-up drop
- Creates urgency — player must prioritize these or lose potential score
- Escaped drifters still count toward level completion (they're destroyed when they escape)
- High score value (25 pts) compensates for the escape risk

- Bricks display health indicator dots (1–3 dots on the brick face)
- Texture changes on damage to reflect remaining HP
- Hit animation: quick scale punch (1.1x / 0.9y) + white flash
- Destroy animation: scale to 0 + fade out with Back easing

### Level Progression
**10 levels** with named themes and unique brick layouts:

| # | Name | Speed | Drop Boost | Design |
|---|------|-------|------------|--------|
| 1 | The Warm-Up | 1.0× | 35% | Simple 3-row grid, close to paddle |
| 2 | Dance Floor | 1.0× | 32% | Checkerboard pattern |
| 3 | Gift Wrapped | 1.05× | 30% | Inverted pyramid with HP scaling |
| 4 | Balloon Bonanza | 1.08× | 30% | Two sections with gap corridor |
| 5 | Piñata Panic | 1.12× | 28% | Dense wall with vertical channels |
| 6 | The Maze | 1.15× | 28% | Pockets and passages |
| 7 | Disco Fever | 1.18× | 38% | Three distinct sections, high drops |
| 8 | Sugar Rush | 1.22× | 35% | Vertical columns creating chambers |
| 9 | Last Call | 1.28× | 32% | Fortress: tough core, soft shell |
| 10 | Grand Finale | 1.35× | 40% | Full vertical space, max chaos |

- Layout system: 10-column grid, bricks placed by (x, y) grid coordinates
- Ball speed scales by `1.0× → 1.35×` from level 1 to 10
- Level complete when all bricks are destroyed (countActive === 0)
- After level 10 → win state + Endless Mode unlocked

### Endless Mode
Unlocked after completing the 10-level Story Mode campaign. Features infinite procedurally generated waves with escalating difficulty.

#### Unlock Condition
- Complete all 10 Story Mode levels
- Unlock persisted to localStorage (`genos-block-party-endless-unlocked`)
- Celebration overlay displayed on first unlock

#### Procedural Generation
- Uses seeded random number generator (mulberry32) for consistent wave layouts
- Generates 20–40 bricks per wave depending on difficulty
- **Pattern types**: Scatter, Symmetric, Fortress, Maze, Clusters, Rows
- Pattern selection weighted by wave number (easier patterns early, harder later)

#### Difficulty Scaling
| Parameter | Formula | Range |
|-----------|---------|-------|
| Brick Count | 20 + min(wave × 2, 20) | 20 → 40 |
| Average HP | 1 + floor(wave / 10) | 1 → 3 |
| Grid Density | 0.3 + min(wave × 0.02, 0.4) | 30% → 70% |
| Ball Speed | 1.0 + min(wave × 0.03, 0.5) | 1.0× → 1.5× |

#### Wave Difficulty Tiers
- **Waves 1–5 (Easy)**: Sparse layouts, mostly Presents (low HP), simple patterns
- **Waves 6–15 (Medium)**: Mixed density, Balloons and Piñatas appear, varied patterns
- **Waves 16+ (Hard)**: Dense layouts, HP 2–3 average, fortress and maze patterns

#### Checkpoint System
- Checkpoint every 5 waves (wave 5, 10, 15, 20...)
- Visual celebration on checkpoint waves ("🎉 CHECKPOINT! 🎉")
- Checkpoint waves use simpler patterns as a "breather"
- Checkpoint number displayed on Game Over screen

#### Endless Mode Leaderboard
- Separate leaderboard from Story Mode (`genos-block-party-endless-leaderboard`)
- Stores wave reached alongside score
- High score entry includes wave number

#### Currency Bonus
- Base currency from score (same formula as Story Mode)
- **Wave bonus**: +3 coins per wave reached
- Example: Reaching wave 20 = base currency + 60 bonus coins

#### Mode Selection
- New Mode Select screen accessible from Menu → Start Game
- **Story Mode**: 10-level campaign (always available)
- **Endless Mode**: Shows 🔒 lock icon + "Beat Story Mode to unlock" until unlocked
- After unlock: Shows personal best wave record

### Score System & Multiplier
- Points earned per brick hit (not per brick destroyed) — **10 / 15 / 20** depending on type
- **MultiplierSystem** (`src/systems/MultiplierSystem.ts`) — extracted for testability:
  - `getValue()` — current multiplier value
  - `increment(currentTime)` — called on brick hit, uses diminishing returns: `+0.15 × (1 / currentMultiplier)`
  - `update(currentTime, deltaMs)` — handles time-based decay
  - `reset()` — returns to base value (called on life loss or level transition)
  - `applyToScore(points)` — multiplies and floors points
- **Multiplier mechanics** (1.0× to 5.0× cap):
  - Each brick hit increments the multiplier with diminishing returns
  - Decays after 1 second of no hits (`DECAY_DELAY_MS`)
  - Decay rate scales with multiplier level (low multiplier decays slowly, high decays fast)
  - Resets to 1.0× on life loss or level transition
  - UI shows multiplier when ≥ 1.1× with color coding: yellow → orange → red

### Lives System
- Start with **3 lives**
- Lose a life when all balls fall off the bottom
- Last life triggers **danger mode**: pulsing red vignette + spark trail on ball + slow-motion flash
- Game over at 0 lives

---

## 2. Power-Ups

### Drop System
- Each brick type has its own base drop chance (Present 15%, Piñata 25%, Balloon 30%)
- Drop rolls happen **per damage point** — a fireball dealing 3 damage rolls 3 times independently
- Power-up type selected via **weighted random**: each type has a `dropWeight` value
- Power-ups fall at 150px/s with wobble (rotation) and pulsing scale animations
- Collected on paddle overlap; plays collect animation (scale up + fade)
- Power Ball doubles all drop chances (capped at 100%)
- Electric Ball AOE hits have a **50% drop penalty** on their rolls

### Power-Up Types

| Power-Up | Emoji | Duration | Weight | Effect |
|----------|-------|----------|--------|--------|
| **Balloon** | 🎈 | 10s | 20 | Slow ball — velocity scaled to 60% **immediately**, min speed halved |
| **Cake** | 🎂 | 15s | 15 | Wide paddle — 1.5× width for duration |
| **Drinks** | 🍹 | 8s | 15 | Wobbly paddle — sinusoidal offset (debuff!) |
| **Disco** | 🪩 | Instant | 10 | Multi-ball — spawns 2 extra balls at current ball's position |
| **Mystery** | ❓ | Varies | 10 | Random — rolls any other power-up type (uniform, excludes Mystery) |
| **Power Ball** | 💪 | 12s | 12 | Doubles power-up drop chance from all bricks |
| **Fireball** | 🔥 | 10s | 10 | Piercing ball with stacking damage (see below) |
| **Electric Ball** | ⚡ | 8s | 12 | 1.5× speed + AOE damage to adjacent bricks |
| **DJ Scratch** | 🧲 | 15s | 12 | Magnet paddle — ball sticks on contact, click to release |
| **Confetti Cannon** | 🎊 | Instant | 10 | Fires confetti at 5-8 random bricks for 1 damage each |
| **Conga Line** | 💃 | 8s | 8 | Trailing ghost balls deal damage to bricks |
| **Spotlight** | 🔦 | 8s | 8 | Gentle homing toward nearest brick |
| **Dance Floor** | 🪩 | Instant | 10 | Shuffles all bricks to random grid positions |

### Fireball Stacking
- Collecting multiple Fireballs during active duration **stacks the level** (1 → 2 → 3 → ...)
- Timer resets on each collection
- Damage equals fireball level (level 3 = 3 damage per hit)
- **Piercing**: if fireball level ≥ brick HP, ball passes through without bouncing
- Visual intensity caps at level 3 (3 tiers of flame particle effects + smoke trail)

### Electric Ball Details
- Ball speed boosted 1.5× — **applies immediately on collection** (velocity recalculated mid-flight)
- On every brick hit (not just destruction), damages all **cardinal-adjacent** bricks (N/S/E/W)
- AOE hits deal 1 damage each, give 50% score, and have 50% reduced drop chance
- Lightning arc visual drawn to each adjacent brick with jagged bolt + particle impact
- Propagates to new balls spawned during the effect (via Disco)

### DJ Scratch (Magnet Paddle) Details
- Collecting activates magnetic paddle for 15 seconds
- On paddle collision while active, ball stops and sticks to paddle surface
- Ball follows paddle horizontally while stuck
- Click/tap to release all stuck balls (launches at random upward angle)
- Works with multi-ball — each ball sticks individually on contact
- When effect expires, any remaining stuck balls auto-release
- Timer refreshes if collected again while active
- Uses existing Scratch SFX on ball catch

### Conga Line Details
- Ball spawns 3 trailing ghost copies at 300ms intervals (positions from 300ms, 600ms, 900ms ago)
- Ghost balls are semi-transparent (alpha 0.5→0.3) with magenta tint
- Ghosts track the ball's position history and follow its path with delay
- When a ghost overlaps a brick, it deals 1 damage (ghosts pass through, don't bounce)
- Damage triggers score, multiplier increment, and power-up drop rolls
- Effect lasts 8 seconds, then ghosts fade out gracefully (300ms fade)
- Works with multi-ball — each ball gets its own set of ghosts
- Propagates to new balls spawned during the effect (via Disco)
- Ball lost: clears that ball's ghosts immediately
- Timer refreshes if collected again while active

### Spotlight Details
- Ball gently curves toward the nearest brick while the effect is active
- **Steering algorithm**: On each frame, calculates angle to nearest brick and adjusts velocity by max ~2.8° per frame
- Subtle homing — player still has control over general direction, but ball "drifts" toward bricks
- **Visual effects**:
  - Golden glow and tint on ball (0xffd700)
  - Light cone/beam emanating from ball in its direction of travel
  - Trailing golden particles with sparkle effects
- Effect lasts 8 seconds
- Works with multi-ball — each ball independently homes toward its nearest brick
- Propagates to new balls spawned during the effect (via Disco)
- Timer refreshes if collected again while active

### Dance Floor Details
- **Instant effect**: On collection, all active bricks shuffle to random positions on the grid
- **Animation**: Bricks animate smoothly to new positions (~450ms, Back easeOut)
- **Visual effects**:
  - Hot pink + white screen flash (disco theme)
  - Bricks wobble/rotate during movement
  - Camera shake on activation
- **Grid**: 10-column × 12-row valid positions (same as level layouts)
- **No overlapping**: Each brick gets a unique random position
- **Physics sync**: StaticBody positions update after animation completes
- Plays party horn SFX on activation

### Mystery Power-Up
- Shows "???" feedback on collection
- After 300ms delay, reveals the actual effect with its proper popup text
- Can resolve to any power-up type except Mystery itself (uniform distribution)

### Effect Propagation (Multi-Ball)
- **Fireball**: propagates to newly spawned balls AND applies to all existing balls
- **Electric Ball**: propagates to new balls AND applies to all existing balls
- **Balloon**: applies to all existing balls but does NOT propagate to newly spawned ones
- **Conga Line**: propagates to new balls AND applies to all existing balls
- **Spotlight**: propagates to new balls AND applies to all existing balls
- Disco spawns get the Disco Sparkle visual effect on all active balls

### Visual Feedback System
Each power-up has per-type feedback on collection:
- **Popup text**: Large centered text ("FIREBALL!", "WIDE PADDLE!", "WOBBLY!", etc.)
- **Sparkle particles**: Type-colored particle burst at collection point
- **Screen flash**: Brief colored flash (intensity/color varies by type)
- **HUD indicator**: Icon with countdown timer bar in bottom UI border, stack badges for Fireball

---

## 3. Meta / Progression

### Currency System
- Coins earned from score at end of game (win, lose, or quit)
- **Conversion formula**: `floor(sqrt(score) × 0.5)` + tier bonuses
- **Tier bonuses** (cumulative):
  - Score ≥ 1,000 → +5 coins
  - Score ≥ 5,000 → +10 coins
  - Score ≥ 10,000 → +20 coins
  - Score ≥ 25,000 → +30 coins
- Minimum 1 coin for any positive score
- Awarded on Game Over screen (animated count-up), or on quit-to-menu from pause
- Has `spendCurrency()` and `canAfford()` methods — **no shop exists yet** (see TODO)
- **Testability**: `CurrencyManager.resetInstance()` allows resetting the singleton between tests for proper localStorage integration testing

### High Score Leaderboard
- Top 5 scores stored locally in localStorage
- Sorted descending by score
- On new high score: 3-letter initials entry (keyboard input, A-Z only)
- Initials typed into individual boxes with blinking cursor
- After submission, entry panel animates out and is replaced by leaderboard display
- Current game's score highlighted in gold on leaderboard
- Pure functions extracted to `src/utils/leaderboard.ts` for testability
- Tests: `src/utils/leaderboard.test.ts`

### Persistence (localStorage)
| Key | Contents |
|-----|----------|
| `genos-block-party-leaderboard` | Array of `{initials, score}` objects, sorted desc, max 5 |
| `genos-block-party-currency` | Integer string (total coins) |
| `genos-block-party-audio` | JSON: `{musicVolume, sfxVolume, muted, forceLevelMusic, forceTrackChangeOnTransition}` |

---

## 4. UI / Scenes

### Boot Scene
- Loads audio manifest (`audio/manifest.json`)
- Generates all placeholder textures programmatically (paddle, ball, bricks, power-ups, particles)
- Synthesizes all SFX via Web Audio API (no audio files needed for SFX)
- Loads menu music from manifest path
- Launches MusicScene (background audio), then transitions to MenuScene
- HTML loading overlay shows progress percentage, then "Click to Start" button (unlocks audio context)

### Menu Scene
- Title: "GENO'S BLOCK PARTY — A Breakout Adventure"
- Buttons: **Start Game**, **Settings**, **Music Player**
- High score display (pulled from leaderboard localStorage)
- Floating colored particle decorations in background
- Start Game triggers animated transition (elements explode out, background whip)

### Game Scene (HUD via UIScene)
UIScene runs as an overlay on top of GameScene:
- **Top-left**: Score label + value (pulse animation on change)
- **Top-center**: Level name (scale animation on level change)
- **Top-right**: Lives as colored circles (pulse animation on last life)
- **Multiplier display**: Shows "×2.3" etc. next to score when ≥ 1.1× (color-coded)
- **Launch prompt**: "Click or tap to launch!" (pulses, hides on launch, reappears on reset)
- **Pause button**: Top-right circle with pause icon bars (also ESC or P key)
- **Power-up indicators**: Bottom bar — icons with countdown timer bars, stack badges
- **Mobile touch zone**: Extra 300px below play area on touch devices with "← swipe here →" hint

### Pause Scene
- Semi-transparent overlay with animated panel
- **Track info**: Current song name + artist (mini display)
- **Music controls**: Previous, Play/Pause, Stop (restart+pause), Next
- **Buttons**: Settings, Music Player, Resume, Restart, Quit to Menu
- Keyboard: ESC or P to resume
- Restart and Quit use animated transitions
- Quit awards currency for any partial progress

### Game Over Scene
- Different for **Win** ("YOU WIN!" green glow) vs **Lose** ("GAME OVER" red glow)
- Win plays airhorn SFX + confetti particles; Lose plays trombone SFX
- **Score panel**: Animated count-up from 0 to final score
- **Currency panel**: Shows coins earned (green "+N") + total coins (animated)
- **Leaderboard panel** or **High Score Entry** (if new high score)
- **Action buttons**: Play Again, Menu (both with transitions)
- All panels stagger-animate in with Back easing

### Settings Scene
- Modal overlay (works from Menu or Pause)
- **Music volume slider** (0–100%, drag or click)
- **SFX volume slider** (0–100%, drag or click)
- Back button returns to caller scene

### Music Player Scene
- Full-screen **vintage radio cabinet** UI with wood grain aesthetic
- Animated vacuum tube glow at top
- **Now Playing dial**: Track name, artist, genre with amber glow
- **Playback controls**: Previous, Stop, Play/Pause, Next
- **Station filter tabs**: ALL, LVL 1–9, MENU (two-row layout)
- **Track list**: Scrollable list (6 visible, scroll buttons + mouse wheel), shows playing indicator
- **Level Theme Lock toggle**: When ON, only current level's songs play during gameplay
- **Force Track Change toggle**: When ON (requires Level Theme Lock), auto-switches tracks on level/menu transitions
- **Volume slider**: Music volume with percentage display
- Accessible from Menu and Pause scenes
- Info icons with hover tooltips explain toggle behaviors

---

## 5. Audio

### Music System
- **Manifest-driven**: All tracks defined in `audio/manifest.json` with metadata
- **Per-level playlists**: Each level has its own set of tracks, shuffled on load
- **Crossfade transitions**: 500ms crossfade between tracks
- **Interruption-safe**: Abort controller prevents orphaned audio during rapid transitions
- **Background preloading**: Next level's music loads during current level
- **Dedicated MusicScene**: Runs independently, never paused — ensures music controls always work
- **Free play mode**: When Level Theme Lock is OFF, all tracks are in one shuffled mega-playlist

### Track Catalog
| Level | Artist | Genre | Tracks |
|-------|--------|-------|--------|
| Menu | Geno | Chiptune | 1 track |
| 1 | Vinnyl Vinnie | Funk / Lo-fi | 2 tracks |
| 2 | Stoop Kid | Funk / Hip-Hop | 5 tracks |
| 3 | DJ Synthwave Sam | Synthpop / Party / Electronic | 3 tracks |
| 4 | Señor Bass | Latin House | 3 tracks |
| 5 | Sonic Mushroom | Techno | 3 tracks |
| 6 | Rude Boy Rudy | Ska | 4 tracks |
| 7 | Neon Reaper | Synthwave | 5 tracks |
| 8 | The Augment | Drumstep | 7 tracks |
| 9 | MC Drop | Jungle | 6 tracks |

**Total: 40 tracks** (1 menu + 39 gameplay)

> Level 10 has no dedicated music — reuses previous level's playlist.

### SFX Catalog
All SFX are **synthesized at runtime** via Web Audio API (no audio files):

| Key | Trigger | Description |
|-----|---------|-------------|
| `sfx-pop` | Brick hit (not destroyed) | Soft bubble pop (400Hz, fast decay) |
| `sfx-horn` | Brick destroyed | Party horn (C5 with wobble, harmonics) |
| `sfx-bounce` | Ball-paddle collision | Pitch-dropping thud (500→200Hz) |
| `sfx-scratch` | Life lost | Record scratch (noise + pitch sweep) |
| `sfx-airhorn` | Level clear / Win | Air horn blast (440Hz chord, attack envelope) |
| `sfx-chime` | Power-up collected | Major chord arpeggio (A5-C♯6-E6) |
| `sfx-trombone` | Game over (lose) | Sad wah-wah descending notes (E♭4→B♭3) |
| `sfx-whoosh` | Transition exit | Noise + sweep down |
| `sfx-swoosh` | Transition enter | Rising pitch sweep |
| `sfx-zap` | Electric Ball AOE | High buzz + crackle (2000Hz + noise) |

### Volume Controls
- Music and SFX volumes independently adjustable (0–1)
- Defaults: Music 70%, SFX 100%
- Persisted to localStorage
- Mute toggle available (persisted)

### Now Playing Toast
- MTV/VH1-style notification — pure HTML/CSS, rendered outside Phaser canvas
- Appears 3.5s after track starts, visible for 5s, then slides out
- Shows track name + artist with animated equalizer bars
- Rapid track changes cancel pending toasts to prevent stacking

---

## 6. Visual Systems

### Ball Effect System
- **BallEffectManager**: Manages multiple simultaneous particle effects per ball
- **Effect registry**: Extensible — add new effects by creating a handler class and registering it
- **Tint blending**: When multiple effects are active, their tint colors are blended using multiplicative blending
- **Depth layering**: Effects sorted by depth (Smoke → Trail → Ball → Sparkle → Fire Overlay → Glow)

#### Effect Handlers
| Effect | Layers | Behavior |
|--------|--------|----------|
| **Fireball** | Flame trail + overlay + smoke (lv3) | 3 intensity tiers, ball tint cycles orange, pulse at lv2+ |
| **Electric Trail** | Streak + crackle + blur glow + glints | 4-layer system, cyan tint shimmer every 60ms, fast vibrating pulse |
| **Disco Sparkle** | Light beams + mirror facets + glints + sparkles | Mirror ball aesthetic, metallic color shimmer, dramatic pulse |

### Particle System
- **Confetti burst**: 12 particles on brick destruction, colored to match brick type
- **Celebration streamers**: 5 streamer sources across screen on level clear
- **Danger sparks**: Red/orange spark trail following ball on last life
- **Fireball trail**: Level-scaled flame particles (managed by effect handler)
- **Smoke trail**: Dark particles behind fireball at level 3
- All particles use object pooling via Phaser's emitter system

### Screen Effects
- **Screen shake**: Camera shake on brick hit (30ms/0.002), brick destroy (50ms/0.004), fireball scaled by level
- **Screen flash**: Color flash on level clear (multi-color sequence: white then gold)
- **Slow motion**: Time scale reduction (0.7×) on entering danger mode, smooth transition in/out
- **Danger vignette**: Pulsing red border overlay when on last life (alpha 0.12 → 0.25)
- **Camera flash**: Red flash on life lost (200ms)

### Background System
- **CSS-based**: Full-viewport background rendered outside Phaser canvas
- **Level backgrounds**: Loads `art/levelN/bg.jpg` with gradient fallback from level's `backgroundColor`
- **Gradient generation**: Radial gradient from lighter center to darker edges, derived from base hex color

### Transitions Between Scenes
- **TransitionManager** singleton orchestrates coordinated animations
- **Background transitions**: CSS whip animations (left, right, down) with configurable duration
- **Element exit styles**:
  - **Explode**: Elements burst outward from center with rotation
  - **Drop**: Elements fall with gravity + slight rotation
  - **Slide Out**: Elements slide off screen left/right
  - **Spiral**: Elements spiral toward center while shrinking
  - **Shatter**: Quick scale burst then collapse with rotation
- **Staggered timing**: Each element starts its animation slightly after the previous
- **Preset configs**: menu-to-game (explode), level-complete (drop), game-over-to-menu (spiral)
- **SFX**: Whoosh on exit, swoosh on enter

---

## 7. Debug

### Console Commands

**`GameDebug` object** (available at `window.GameDebug`):
| Command | Description |
|---------|-------------|
| `GameDebug.skipToLevel(n)` | Jump to level n (0-indexed). Clears effects, resets ball |
| `GameDebug.completeLevel()` | Instantly destroys all bricks, triggers level completion |
| `GameDebug.spawnPowerUp(type, x?, y?)` | Force-spawn a power-up. e.g. `GameDebug.spawnPowerUp('fireball', 400, 300)` or `'djscratch'` |
| `GameDebug.getState()` | Returns `{level, levelName, lives, score, activeBalls, canLaunch}` |

**`Brick` class** (available at `window.Brick`):
| Property | Description |
|----------|-------------|
| `Brick.debugDropChance = 1` | Override ALL drop chances (0–1). Set to `null` to restore defaults |
| `Brick.debugShowDropChance = true` | Show drop % overlay on every brick (updates live with Power Ball) |
| `Brick.powerBallActive = true` | Force Power Ball state (normally managed by power-up system) |

**`window.game`** — The Phaser.Game instance, exposed for low-level debugging.

> Debug values survive Vite HMR (stored on `window.__` properties).

---

## 8. CI / Testing

### Continuous Integration
- **GitHub Actions** workflow runs on every push to `master` and on pull requests targeting `master`
- **Node 22** (LTS) — pinned in CI to satisfy Vite 7's engine requirements
- Pipeline steps: `npm ci` → `npm run build` (TypeScript + Vite) → `npm run test:ci` (Vitest)
- Badge displayed in README for at-a-glance build status

### Test Framework
- **Vitest** — fast, Vite-native test runner with TypeScript support out of the box
- Browser API mocks (window, matchMedia, localStorage) provided via setup file
- Globals enabled (`describe`, `it`, `expect` available without imports)

### Smoke Test Coverage
| Test Suite | What It Validates |
|------------|-------------------|
| **Level Data** | All 10 levels have required fields, sequential IDs, positive speed multipliers, valid brick types/health/positions, no duplicate positions |
| **Power-Up Configs** | Every `PowerUpType` enum value has a matching `POWERUP_CONFIGS` entry with correct type, color, duration, dropWeight, and emoji |
| **Currency Conversion** | `CurrencyManager.calculateCurrencyFromScore()` returns correct values across all tier thresholds (0, 100, 1K, 5K, 10K, 25K scores) |
| **Currency Persistence** | `CurrencyManager` localStorage integration: loads on init, handles corrupted/negative values, saves after transactions, cross-session persistence, `resetCurrency()` behavior |
| **Brick Drop Chances** | Every `BrickType` has a `BRICK_DROP_CHANCES` entry between 0–1, with correct ordering (Present < Piñata < Balloon) |
| **Multiplier System** | `MultiplierSystem` initialization, increment with diminishing returns, max cap enforcement, decay mechanics (grace period, scaling), reset behavior, and score application |
| **Constants Validation** | All game constants in `config/Constants.ts` have sane values: positive dimensions, valid ranges (0–1 for volumes/probabilities), ascending tier thresholds, valid hex colors, positive scores/durations |
| **Drop Roll Probability** | Pure drop logic functions (`calculateDropChance`, `rollDrop`, `rollDropsForDamage`): base chances per brick type, Power Ball bonus (2× capped at 100%), AOE penalty (50%), debug override precedence, edge cases |
| **Paddle Collision** | Center/edge/clamped angle calculations return correct radian values |
| **Ball Launch** | `calculateLaunchVelocity()` returns angles within specified range, always upward (negative velocityY), magnitude matches input speed, handles edge cases (zero/negative/high speeds) |
| **Fireball Stacking** | `FireballState` functions: `reset()` initializes level 0, `incrementLevel()` increases by 1 (immutable), `isActive()` returns false at 0/true at 1+, `getDamage()` equals level, `getVisualTier()` maps levels to 4 tiers (0/1/2/3), `canPierce()` returns level ≥ brickHP, integration test covers full gameplay flow |

### Utility Functions
| Module | Function | Description |
|--------|----------|-------------|
| `utils/dropRoll.ts` | `calculateDropChance(brickType, powerBallActive, isAOE, debugOverride?)` | Computes effective drop chance with Power Ball bonus (2×), AOE penalty (50%), and debug override support. Returns 0-1. |
| `utils/dropRoll.ts` | `rollDrop(chance, rng?)` | Single drop roll with injectable RNG for deterministic testing. Returns boolean. |
| `utils/dropRoll.ts` | `rollDropsForDamage(damage, chance, rng?)` | Multi-damage roll (one roll per damage point) with injectable RNG. Returns count of successful drops. |
| `utils/paddleAngle.ts` | `calculatePaddleBounceAngle(relativeHitX, paddleWidth, minAngle?, maxAngle?)` | Pure function for paddle collision angle calculation. Returns angle in radians. Handles center hits (straight up), edge hits (steep angles), and clamping. |
| `utils/ballLaunch.ts` | `calculateLaunchVelocity(speed, minAngle?, maxAngle?)` | Pure function to calculate ball launch velocity. Extracted from `Ball.ts` for unit testing. Returns `{velocityX, velocityY, angleDeg}` with random angle in specified range (default: -120° to -60°). |
| `utils/leaderboard.ts` | `getLeaderboard(storage, key?)` | Retrieves leaderboard from localStorage. Returns empty array if key doesn't exist or contains invalid JSON. |
| `utils/leaderboard.ts` | `checkIsHighScore(score, leaderboard, maxEntries?)` | Checks if a score qualifies for the leaderboard (score > 0 AND either room available OR beats lowest). |
| `utils/leaderboard.ts` | `insertScore(entry, leaderboard, maxEntries?)` | Inserts entry into leaderboard, maintains descending sort, caps at maxEntries. Returns new array (immutable). |
| `utils/leaderboard.ts` | `saveLeaderboard(leaderboard, storage, key?)` | Saves leaderboard to localStorage as JSON. |
| `utils/fireball.ts` | `reset()` | Returns initial fireball state with level 0. |
| `utils/fireball.ts` | `incrementLevel(state)` | Increments fireball level by 1. Returns new state (immutable). |
| `utils/fireball.ts` | `isActive(state)` | Returns true if fireball level > 0. |
| `utils/fireball.ts` | `getDamage(state)` | Returns damage per hit (equals current level). |
| `utils/fireball.ts` | `getVisualTier(state)` | Returns visual tier (0-3) based on level: 0→0, 1-2→1, 3-4→2, 5+→3. |
| `utils/fireball.ts` | `canPierce(state, brickHP)` | Returns true if fireball level ≥ brickHP (ball passes through brick). |

### Commands
```bash
npm test          # Run all tests once
npm run test:ci   # Run tests with verbose reporter (CI)
npm run test:watch # Run tests in watch mode (development)
```

---

## 9. Utilities

### Weighted Random Selection
- **`src/utils/weightedSelection.ts`** — Pure, testable utility for weighted random selection
- `weightedSelect<T>(items, randomValue)` — Selects item based on weights and a provided random value (0-1)
- `getTotalWeight<T>(items)` — Convenience helper to sum item weights
- **Power-up selection** uses this utility with weights from `POWERUP_CONFIGS`
- Supports edge cases: zero weights, negative weights (treated as zero), empty arrays

---

## 10. Lifetime Stats & Milestones

### Lifetime Stats System
All-time player statistics are tracked and persisted to localStorage:

| Stat | Description |
|------|-------------|
| **Bricks Destroyed** | Total number of bricks destroyed across all games |
| **Power-Ups Collected** | Total power-ups collected (by type breakdown available) |
| **Games Played** | Total number of game sessions started |
| **Time Played** | Cumulative play time in hours/minutes |
| **Highest Multiplier** | Best multiplier achieved |
| **Total Score** | Sum of all scores earned |
| **Highest Level** | Furthest level reached (1-10) |
| **Perfect Games** | Games completed without losing a life |

- Storage key: `geno_lifetime_stats`
- Accessible via **Stats** button on main menu
- Stats scene shows all statistics with progress bars for milestones

### Milestones
Achievement-based milestones that unlock exclusive cosmetic rewards:

| Milestone | Requirement | Reward |
|-----------|-------------|--------|
| **Brick Basher** | Destroy 500 bricks | Bash paddle skin (orange/red) |
| **Block Buster** | Destroy 2,500 bricks | Crusher ball trail (rocky debris) |
| **Demolition Expert** | Destroy 10,000 bricks | Destroyer paddle skin (black/purple) |
| **Power Hungry** | Collect 100 power-ups | Power ball trail (electric blue) |
| **Combo Master** | Reach 5.0× multiplier | Master paddle skin (platinum) |
| **Party Veteran** | Play 25 games | Veteran ball trail (military green) |
| **Endurance** | Accumulate 1 hour of play time | Time paddle skin (clock themed) |
| **Perfect Run** | Complete a game without losing a life | Flawless ball trail (diamond sparkle) |

- Milestones are checked at game end
- Achievement celebration overlay shows when milestones are unlocked
- Milestone rewards appear in Party Shop with "🔒 [Milestone Name]" until unlocked
- Once unlocked, milestone items show "✓ Unlocked" and can be equipped for free
- Progress is saved in localStorage under `genos-block-party-milestones`

### Milestone-Exclusive Cosmetics
Items with `price: -1` in the shop catalog are milestone-exclusive:

**Paddle Skins:**
- Bash (0xff4500) — Brick Basher reward
- Destroyer (0x1a0033) — Demolition Expert reward
- Master (0xe5e4e2) — Combo Master reward
- Time (0x4169e1) — Endurance reward

**Ball Trails:**
- Crusher — Block Buster reward (rocky debris particles)
- Power — Power Hungry reward (electric blue particles)
- Veteran — Party Veteran reward (military green particles)
- Flawless — Perfect Run reward (diamond sparkle particles)

---

## 11. Achievement System

The Achievement System rewards players with bonus coins for accomplishing specific in-game feats. Achievements are tracked separately from Milestones (which unlock cosmetics).

### Achievement Types
- **Cumulative** — Based on lifetime stats (bricks destroyed, power-ups collected, games played)
- **Session-based** — Achieved within a single game (level completion, score thresholds, flawless runs)
- **Skill-based** — Specific gameplay feats (fireball stacking, multiplier levels)

### Achievement List

| ID | Name | Description | Coins | Type |
|----|------|-------------|-------|------|
| `party_starter` | Party Starter | Complete Level 1 | 10 | Session |
| `halfway_there` | Halfway There | Complete Level 5 | 25 | Session |
| `party_master` | Party Master | Complete all 10 levels | 100 | Session |
| `flawless_one` | Flawless Start | Clear Level 1 without losing a life | 20 | Session |
| `flawless_five` | Flawless Five | Clear Level 5 without losing a life | 50 | Session |
| `flawless_ten` | Perfect Party | Clear Level 10 without losing a life | 100 | Session |
| `fire_lord` | Fire Lord | Stack Fireball to level 5 | 75 | Skill |
| `combo_king` | Combo King | Reach 5x multiplier | 50 | Skill |
| `power_collector` | Power Collector | Collect 100 power-ups (lifetime) | 25 | Cumulative |
| `brick_breaker` | Brick Breaker | Destroy 500 bricks (lifetime) | 25 | Cumulative |
| `score_hunter` | Score Hunter | Reach 10,000 score in one game | 30 | Session |
| `endless_five` | Endless Explorer | Reach wave 5 in Endless Mode | 30 | Session |
| `endless_ten` | Endless Warrior | Reach wave 10 in Endless Mode | 50 | Session |
| `party_animal` | Party Animal | Play 10 games | 15 | Cumulative |

### Features
- **Achievement Gallery**: Accessible from menu via "🏆 ACHIEVEMENTS" button
- **Progress Tracking**: Cumulative achievements show progress bars in the gallery
- **Unlock Toast**: In-game notification with chime sound when achievement unlocks
- **Coin Rewards**: Coins automatically added to player balance on unlock
- **Persistent Storage**: Unlocked achievements saved to localStorage (`genos-block-party-achievements`)

### Flawless Achievements
Flawless achievements require completing a specific level without losing any lives *on that level*:
- Previous levels may have lost lives
- Only the target level must be completed flawlessly
- Lives at level start vs level end are tracked

### Session Tracking
The AchievementManager tracks session state including:
- Highest level completed this session
- Lives lost per level (for flawless detection)
- Highest fireball stack achieved
- Highest multiplier reached
- Session score
- Endless mode wave progression

### Integration
- Achievements are checked at game end (win or lose)
- Fireball stacking is tracked via power-up system events
- Multiplier is tracked on each brick hit
- Level completion records flawless status
- Endless waves are tracked as they're completed

---

## 12. TODO / Known Gaps

### Unused Systems
- **`CURRENCY.AWARD_SCENE_DURATION` and `COUNT_UP_DURATION` constants** are defined but the award is handled inline in GameOverScene rather than a dedicated award scene.

### Missing Content
- **Level 10 has no dedicated music** — will inherit from whatever level the player was on before
- **No level background images verified** — system tries to load `art/levelN/bg.jpg` but falls back to gradient if missing
- **`BallEffectType.DANGER_SPARKS`** is defined in the enum but has no effect handler registered (danger sparks are handled directly by ParticleSystem instead of the effect system)
- **`BallEffectType.BALLOON_TRAIL`** commented out as a future effect — not implemented

### Partially Implemented
- **Audio manifest `bpm` and `loopPoint` fields** are defined in the type system but never read or used — intended for future beat-sync effects and seamless loop points
- **Mute toggle**: `AudioManager` has `setMuted()`/`toggleMute()` but there's no mute button in the UI (only volume sliders)

### Obvious Next Steps
- **More levels**: Level data system supports unlimited levels via the `LEVELS` array
- **Custom art assets**: All graphics are currently generated programmatically in BootScene — real sprite sheets would elevate the visual quality
- **Beat-sync effects**: BPM data exists in manifest for future rhythm-based visual effects
- **Leaderboard online**: Currently localStorage only — could integrate with a backend for global scores
- **More power-up types**: Effect system is registry-based and designed for easy extension (DJ Scratch added as latest example)
- **Accessibility**: No colorblind mode, no screen reader support beyond the "Now Playing" toast ARIA attributes
