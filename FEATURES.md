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
- After level 10 → win state

### Score System & Multiplier
- Points earned per brick hit (not per brick destroyed) — **10 / 15 / 20** depending on type
- **Multiplier system** (1.0× to 5.0× cap):
  - Each brick hit increments the multiplier with diminishing returns: `+0.15 × (1 / currentMultiplier)`
  - Decays after 1 second of no hits
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
| **Balloon** | 🎈 | 10s | 20 | Slow ball — velocity scaled to 60%, min speed halved |
| **Cake** | 🎂 | 15s | 15 | Wide paddle — 1.5× width for duration |
| **Drinks** | 🍹 | 8s | 15 | Wobbly paddle — sinusoidal offset (debuff!) |
| **Disco** | 🪩 | Instant | 10 | Multi-ball — spawns 2 extra balls at current ball's position |
| **Mystery** | ❓ | Varies | 10 | Random — rolls any other power-up type (uniform, excludes Mystery) |
| **Power Ball** | 💪 | 12s | 12 | Doubles power-up drop chance from all bricks |
| **Fireball** | 🔥 | 10s | 10 | Piercing ball with stacking damage (see below) |
| **Electric Ball** | ⚡ | 8s | 12 | 1.5× speed + AOE damage to adjacent bricks |

### Fireball Stacking
- Collecting multiple Fireballs during active duration **stacks the level** (1 → 2 → 3 → ...)
- Timer resets on each collection
- Damage equals fireball level (level 3 = 3 damage per hit)
- **Piercing**: if fireball level ≥ brick HP, ball passes through without bouncing
- Visual intensity caps at level 3 (3 tiers of flame particle effects + smoke trail)

### Electric Ball Details
- Ball speed boosted 1.5×
- On every brick hit (not just destruction), damages all **cardinal-adjacent** bricks (N/S/E/W)
- AOE hits deal 1 damage each, give 50% score, and have 50% reduced drop chance
- Lightning arc visual drawn to each adjacent brick with jagged bolt + particle impact
- Propagates to new balls spawned during the effect (via Disco)

### Mystery Power-Up
- Shows "???" feedback on collection
- After 300ms delay, reveals the actual effect with its proper popup text
- Can resolve to any power-up type except Mystery itself (uniform distribution)

### Effect Propagation (Multi-Ball)
- **Fireball**: propagates to newly spawned balls AND applies to all existing balls
- **Electric Ball**: propagates to new balls AND applies to all existing balls
- **Balloon**: applies to all existing balls but does NOT propagate to newly spawned ones
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

### High Score Leaderboard
- Top 5 scores stored locally
- On new high score: 3-letter initials entry (keyboard input, A-Z only)
- Initials typed into individual boxes with blinking cursor
- After submission, entry panel animates out and is replaced by leaderboard display
- Current game's score highlighted in gold on leaderboard

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
| `GameDebug.spawnPowerUp(type, x?, y?)` | Force-spawn a power-up. e.g. `GameDebug.spawnPowerUp('fireball', 400, 300)` |
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
| **Brick Drop Chances** | Every `BrickType` has a `BRICK_DROP_CHANCES` entry between 0–1, with correct ordering (Present < Piñata < Balloon) |
| **Constants Validation** | All game constants in `config/Constants.ts` have sane values: positive dimensions, valid ranges (0–1 for volumes/probabilities), ascending tier thresholds, valid hex colors, positive scores/durations |

### Commands
```bash
npm test          # Run all tests once
npm run test:ci   # Run tests with verbose reporter (CI)
npm run test:watch # Run tests in watch mode (development)
```

---

## 9. TODO / Known Gaps

### Unused Systems
- **Currency system exists but has no shop**: `CurrencyManager` has `spendCurrency()`, `canAfford()`, and `resetCurrency()` methods, but there is no shop scene or purchasable items. Coins accumulate with no way to spend them.
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
- **Shop system**: Use accumulated currency to buy cosmetics, power-up loadouts, or upgrades
- **More levels**: Level data system supports unlimited levels via the `LEVELS` array
- **Custom art assets**: All graphics are currently generated programmatically in BootScene — real sprite sheets would elevate the visual quality
- **Beat-sync effects**: BPM data exists in manifest for future rhythm-based visual effects
- **Leaderboard online**: Currently localStorage only — could integrate with a backend for global scores
- **More power-up types**: Effect system is registry-based and designed for easy extension
- **Accessibility**: No colorblind mode, no screen reader support beyond the "Now Playing" toast ARIA attributes
