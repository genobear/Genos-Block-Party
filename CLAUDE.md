# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000 (opens browser automatically)
npm run build    # TypeScript check + Vite production build to dist/
npm run preview  # Preview production build locally
```

**Before starting the dev server**, check if it's already running:
```bash
lsof -i :3000    # Check if port 3000 is in use
```
If the server is already running, don't start another instance.

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

## Architecture Overview

Geno's Block Party is a Breakout clone built with **Phaser 3**, **TypeScript**, and **Vite**. It uses Phaser's Arcade physics for fast AABB collisions.

### Scene Flow

```
BootScene → MenuScene → GameScene (+ UIScene overlay) → GameOverScene
                              ↓
                         PauseScene
```

- **GameScene** and **UIScene** run in parallel - GameScene handles gameplay, UIScene displays the HUD
- Scenes communicate via Phaser events (`this.events.emit()` / `scene.events.on()`)
- UIScene subscribes to events like `scoreUpdate`, `livesUpdate`, `effectApplied`

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
| `src/objects/Brick.ts` | Brick class with `getDropChance()` - single source of truth for drops |
| `src/scenes/GameScene.ts` | Core gameplay loop, collision handling |
| `src/systems/PowerUpSystem.ts` | Power-up spawning, effects, and expiration |
| `src/systems/AudioManager.ts` | Singleton for music streaming and SFX playback |
| `src/pools/BallPool.ts` | Multi-ball management with physics restoration |

### Audio System

**AudioManager** is a singleton handling all game audio:
- **SFX**: Generated placeholder sounds (Web Audio synthesis) - replace with real files in `public/audio/sfx/`
- **Level Music**: On-demand streaming with shuffle playlist and crossfade transitions
- **Volume/Mute**: Persisted to localStorage, controllable via PauseScene

SFX trigger points:
- `AUDIO.SFX.POP` - Brick hit (not destroyed)
- `AUDIO.SFX.HORN` - Brick destroyed
- `AUDIO.SFX.BOUNCE` - Paddle bounce
- `AUDIO.SFX.SCRATCH` - Life lost
- `AUDIO.SFX.AIRHORN` - Level clear / win
- `AUDIO.SFX.CHIME` - Power-up collect
- `AUDIO.SFX.TROMBONE` - Game over

To add custom level music:
```
public/audio/music/level{N}/track{1-3}.mp3
```

### Power-Up System

Six power-ups with weighted drops (configured in `PowerUpTypes.ts`):
- **Balloon** (slow ball), **Cake** (wide paddle), **Drinks** (wobbly paddle - debuff)
- **Disco** (instant multi-ball), **Mystery** (random effect, excludes itself and Power Ball)
- **Power Ball** (doubles power-up drop chance for 12s)

Effects emit events to UIScene for visual indicators. Timed effects use `this.time.delayedCall()`.

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
