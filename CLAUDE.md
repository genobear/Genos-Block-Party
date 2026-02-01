# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **For developers**: See [README.md](README.md) for setup instructions and common patterns.

## Gameplay Testing

**Claude must rely on the user to test gameplay.** The Playwright browser interface is too slow for real-time game testing—you can't accurately observe physics, timing, or visual feedback at game speed.

**Testing workflow:**
1. Claude makes code changes
2. Claude tells the user **exactly what to test** (specific scenarios, power-ups, edge cases)
3. User plays the game and reports results
4. Claude can read browser console output to diagnose issues
5. Claude can provide console commands for the user to run during gameplay (spawn power-ups, trigger states, etc.)

**When requesting tests, be specific:**
- "Test collecting the Disco power-up and verify 3 extra balls spawn"
- "Let the ball fall off screen and confirm you lose a life"
- "Hit a cyan balloon brick and check if a power-up drops ~30% of the time"
- "Collect FireBall twice and verify the damage stacks to level 2"
- "Test ElectricBall hitting a brick surrounded by others and confirm AOE damage"

## Architecture Overview

Geno's Block Party is a Breakout clone built with **Phaser 3**, **TypeScript**, and **Vite**. It uses Phaser's Arcade physics for fast AABB collisions.

### Scene Flow

```
                              ┌─────────────────┐
                              │   MusicScene    │ (always running, never paused)
                              └─────────────────┘
                                      │
BootScene → MenuScene ──────────→ GameScene (+ UIScene overlay) → GameOverScene
               │                       │                               │
               │                       ↓                               │
               │                  PauseScene ←─────────────────────────┘
               │                       │
               ↓                       ↓
        SettingsScene ←───────→ MusicPlayerScene
```

**Scene Categories:**
- **MusicScene**: Dedicated audio scene that never pauses, ensures music always works
- **GameScene + UIScene**: Run in parallel—gameplay logic + HUD overlay
- **SettingsScene**: Audio volume/mute controls (accessible from Menu or Pause)
- **MusicPlayerScene**: Full music browser with playback controls and level filtering

Scenes communicate via Phaser events (`this.events.emit()` / `scene.events.on()`). UIScene subscribes to events like `scoreUpdate`, `livesUpdate`, `effectApplied`.

### Object Pooling

**BallPool** and **PowerUpPool** manage reusable game objects to avoid GC stutters:
- Primary ball is always tracked separately (`ballPool.setPrimaryBall()`)
- Extra balls from Disco power-up come from the pool
- When all balls are lost, player loses a life

### Critical: Ball Physics Lifecycle

Phaser's `group.add(sprite)` resets physics body properties. Always restore physics after adding to a group:

```typescript
// In BallPool.setPrimaryBall()
this.group.add(ball);
// MUST restore after group.add():
body.setBounce(1, 1);
body.setCollideWorldBounds(true);
body.onWorldBounds = true;
```

Ball initialization is centralized in `Ball.initializePhysics()` - call this in `activate()` for consistent physics across all lifecycle paths.

### Collision Handler Parameter Order

Phaser collision callbacks can receive objects in either order. Always use `instanceof` checks:

```typescript
const ball = (obj1 instanceof Ball) ? obj1 : (obj2 instanceof Ball) ? obj2 : null;
const brick = (obj1 instanceof Brick) ? obj1 : (obj2 instanceof Brick) ? obj2 : null;
```

### Key Files

| File | Purpose |
|------|---------|
| `src/config/Constants.ts` | All tunable values (speeds, sizes, colors, durations, audio) |
| `src/config/LevelData.ts` | 10 level definitions with brick layouts |
| `src/types/BrickTypes.ts` | Brick types and per-brick drop chances (`BRICK_DROP_CHANCES`) |
| `src/types/PowerUpTypes.ts` | Power-up configs (colors, durations, weights, emojis) |
| `src/types/TransitionTypes.ts` | Transition presets and animation configs |
| `src/objects/Brick.ts` | Brick class with `getDropChance()` - single source of truth for drops |
| `src/objects/Ball.ts` | Ball class with fireball/electric state and effect manager |
| `src/scenes/GameScene.ts` | Core gameplay loop, collision handling |
| `src/systems/PowerUpSystem.ts` | Power-up spawning, effects, and expiration |
| `src/systems/AudioManager.ts` | Singleton for music streaming and SFX playback |
| `src/systems/TransitionManager.ts` | Scene transitions with coordinated animations |
| `src/systems/ElectricArcSystem.ts` | Electric Ball AOE effects and lightning visuals |
| `src/systems/PowerUpFeedbackSystem.ts` | Visual feedback on power-up collection |
| `src/effects/BallEffectManager.ts` | Composable stacking particle effects on balls |
| `src/pools/BallPool.ts` | Multi-ball management with physics restoration |

### Audio System

**AudioManager** is a singleton handling all game audio:
- **SFX**: Generated placeholder sounds (Web Audio synthesis) - replace with real files in `public/audio/sfx/`
- **Level Music**: On-demand streaming with shuffle playlist and crossfade transitions
- **Volume/Mute**: Persisted to localStorage, controllable via PauseScene/SettingsScene

SFX trigger points:
- `AUDIO.SFX.POP` - Brick hit (not destroyed)
- `AUDIO.SFX.HORN` - Brick destroyed
- `AUDIO.SFX.BOUNCE` - Paddle bounce
- `AUDIO.SFX.SCRATCH` - Life lost
- `AUDIO.SFX.AIRHORN` - Level clear / win
- `AUDIO.SFX.CHIME` - Power-up collect
- `AUDIO.SFX.TROMBONE` - Game over

**NowPlayingToast** shows MTV-style track notifications (HTML overlay outside Phaser).

To add custom level music:
```
public/audio/music/level{N}/track{1-3}.mp3
```

### Power-Up System

Eight power-ups with weighted drops (configured in `PowerUpTypes.ts`):

| Power-up | Effect | Duration | Emoji |
|----------|--------|----------|-------|
| **Balloon** | Slow ball | 10s | 🎈 |
| **Cake** | Wide paddle | 15s | 🎂 |
| **Drinks** | Wobbly paddle (debuff) | 8s | 🍹 |
| **Disco** | Spawn 2 extra balls | instant | 🪩 |
| **Mystery** | Random effect | varies | ❓ |
| **Power Ball** | Double drop chance | 12s | 💪 |
| **FireBall** | Piercing damage, stacks | 10s | 🔥 |
| **ElectricBall** | AOE damage to adjacent | 8s | ⚡ |

**FireBall mechanics:**
- Pierces bricks if fireball level ≥ brick health
- Collecting multiple FireBalls increases stack level (1→2→3)
- Damage dealt equals stack level
- Screen shake scales with level

**ElectricBall mechanics:**
- Damages adjacent bricks (N/S/E/W) on every hit
- Uses `ElectricArcSystem` for grid-based neighbor detection
- Lightning arc visuals with 100ms delay before damage

Effects emit events to UIScene for visual indicators. Timed effects use `this.time.delayedCall()`.

### Ball Effect System

`BallEffectManager` handles composable, stacking particle effects:
- Multiple effects can run simultaneously on one ball
- Factory pattern: register handler → auto-instantiate on apply
- Color blending when multiple effects tint the ball

Effect handlers in `src/effects/handlers/`:
- `FireballEffectHandler` - Fire trail, embers, smoke, glow
- `ElectricBallEffectHandler` - Electric streaks, crackles, motion blur
- `DiscoEffectHandler` - Rainbow sparkle bursts

### Transition System

`TransitionManager` orchestrates scene transitions:

**Exit animations:** EXPLODE, DROP, SLIDE_OUT, SPIRAL, SHATTER
**Background transitions:** WHIP_LEFT, WHIP_RIGHT, WHIP_DOWN, DISSOLVE

Presets:
- `'menu-to-game'` - WHIP_LEFT + EXPLODE
- `'level-complete'` - WHIP_DOWN + DROP
- `'game-over-to-menu'` - WHIP_RIGHT + SPIRAL

### Per-Brick Drop Chances

Each brick type has its own base drop chance (defined in `BrickTypes.ts`):
- **PRESENT** (pink): 15%
- **PINATA** (orange): 25%
- **BALLOON** (cyan): 30%

When Power Ball is active, these chances are doubled (capped at 100%).

### Critical: Drop Chance Single Source of Truth

`Brick.getDropChance()` is the **single source of truth** for calculating drop probability. All modifiers (Power Ball, debug override, future effects) must be applied here:

```typescript
// In Brick.ts - getDropChance() is used by both gameplay and debug display
shouldDropPowerUp(): boolean {
  return Math.random() < this.getDropChance();  // Uses getDropChance()
}

getDropChance(): number {
  if (Brick.debugDropChance !== null) return Brick.debugDropChance;

  let chance = BRICK_DROP_CHANCES[this.brickType];
  if (Brick.powerBallActive) chance = Math.min(chance * 2, 1);
  // Add future modifiers here - they'll automatically work in gameplay AND debug display
  return chance;
}
```

### Debug Tools

Debug commands available in browser console:

```javascript
Brick.debugShowDropChance = true   // Show drop % on each brick
Brick.debugShowDropChance = false  // Hide overlay

Brick.debugDropChance = 1          // Force 100% drop rate (magenta text)
Brick.debugDropChance = 0.5        // Force 50% drop rate
Brick.debugDropChance = null       // Use normal calculation

Brick.powerBallActive = true       // Simulate Power Ball effect (yellow text)
```

Text colors indicate active modifiers:
- **White**: Normal brick-type rate
- **Yellow**: Power Ball boosted (2x)
- **Magenta**: Debug override active

### Current Status

Phases 1-5 complete (core gameplay, power-ups, polish effects, UI, audio). Phase 6 (Content & Final Polish) is next - see `docs/PROJECT-PLAN.md` for full checklist.
