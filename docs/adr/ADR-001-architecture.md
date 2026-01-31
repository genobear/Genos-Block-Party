# ADR-001: Core Architecture for Geno's Block Party

> **Status**: Approved
> **Date**: 2026-01-30
> **Decision**: Core architecture for Geno's Block Party

## Context

Building a Breakout-style browser game called "Geno's Block Party" with a party theme, power-ups, multiple levels, and persistent high scores.

## Decision

### Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Game Engine | **Phaser 3** | Mature 2D engine, excellent docs, built-in physics |
| Physics | **Arcade** | Fast AABB collisions, perfect for breakout mechanics |
| Language | **TypeScript** | Type safety, better IDE support, fewer runtime bugs |
| Bundler | **Vite** | Fast HMR, simple config, modern ESM support |
| Persistence | **localStorage** | No backend needed, sufficient for high scores |

### Architecture Pattern

- **Scene-based**: Separate scenes for Boot, Menu, Game, UI overlay, GameOver
- **Composition over inheritance**: Game objects composed of sprite + physics body + controllers
- **Event-driven communication**: Scenes communicate via Phaser events, not direct references
- **Object pooling**: Balls and power-ups pooled to avoid GC stutters

### Visual Approach

- **Placeholder graphics** for initial development
- Color-coded shapes (rectangles, circles)
- Can swap in real art assets later without code changes

### Project Structure

```
src/
├── main.ts                    # Phaser game bootstrap
├── config/
│   ├── GameConfig.ts          # Phaser configuration
│   ├── Constants.ts           # Game constants
│   └── LevelData.ts           # Level definitions
├── scenes/
│   ├── BootScene.ts           # Asset preloading
│   ├── MenuScene.ts           # Title screen
│   ├── GameScene.ts           # Main gameplay
│   └── ...
├── objects/
│   ├── Paddle.ts              # Player paddle
│   ├── Ball.ts                # Ball physics
│   ├── Brick.ts               # Destructible bricks
│   └── ...
├── systems/
│   └── ...                    # Cross-cutting concerns
├── pools/
│   └── ...                    # Object pools
└── types/
    └── ...                    # TypeScript interfaces
```

## Consequences

### Positive

- Fast iteration with Vite HMR
- Type safety catches errors early
- Object pooling ensures smooth performance
- Scene separation makes code maintainable
- Placeholder graphics allow rapid prototyping

### Negative

- TypeScript adds build step complexity
- Placeholder graphics means game won't look polished initially

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Matter.js physics | Overkill for simple breakout; slower than Arcade |
| Vanilla Canvas | Would need to build everything from scratch |
| JavaScript (no TS) | Lose type safety benefits |
| Webpack | Slower than Vite, more complex config |

## Related Documents

- **[PROJECT-PLAN.md](../PROJECT-PLAN.md)** - Full implementation plan with phases and checklists

## Updates

### 2026-01-30 - Initial Decision

- Established core tech stack
- Defined scene architecture
- Chose placeholder graphics approach for MVP

### 2026-01-30 - Phase 1 Complete

- Implemented core game loop (paddle, ball, bricks)
- All 10 levels defined in LevelData.ts
- Score, lives, and high score persistence working
- Screen shake and brick animations implemented
- Ready for Phase 2: Power-ups

### 2026-01-30 - Phase 2 Complete

- Power-up system with object pooling (PowerUpPool, BallPool)
- All 5 power-ups implemented: Balloon, Cake, Drinks, Disco, Mystery
- Power-up collision detection and collection
- Visual effect indicators in bottom-left corner
- Multi-ball support via BallPool
- Ready for Phase 3: Polish & Effects

### 2026-01-30 - Bug Fix: Ball Physics Issues

Multiple physics bugs fixed:

1. **Ball not bouncing off walls after reactivation**
   - Root cause: `Ball.activate()` didn't restore collision settings
   - Fix: Added `setBounce()`, `setCollideWorldBounds()`, `onWorldBounds` in `activate()`

2. **Collision handler parameter order**
   - Root cause: Phaser can pass collision parameters in either order
   - Fix: Used `instanceof` checks in `handleBallPaddleCollision` and `handleBallBrickCollision`

3. **Ball sticking to paddle**
   - Root cause: Ball could re-collide multiple times
   - Fix: Added velocity check (only process if ball moving downward) and position reset

4. **Paddle setImmovable error**
   - Root cause: `setImmovable()` not valid on Body type
   - Fix: Changed to `body.immovable = true`

5. **World bounds timing**
   - Fix: Moved world bounds setup to before creating physics objects

6. **Primary ball not bouncing on first life**
   - Root cause: Adding ball to BallPool group reset collision settings
   - Fix: Added collision settings restoration in `BallPool.setPrimaryBall()`

### 2026-01-30 - Refactoring: Consistent Ball Initialization

#### Problem

Ball physics were inconsistent - working after the first death but not on the first life. The root cause was **inconsistent initialization paths**:

| Lifecycle | Code Path | Physics Status |
|-----------|-----------|----------------|
| First life | `new Ball()` → `attachToPaddle()` → `group.add()` → `launch()` | Broken (group.add resets physics) |
| After death | `reset()` → `activate()` → `attachToPaddle()` → `launch()` | Working (activate restores physics) |
| Extra balls | pool `activate()` → velocity set | Working |

**Key insight**: Phaser's `group.add(ball)` resets physics properties like bounce and world bounds collision.

#### Solution

1. **Centralized physics initialization** in `Ball.initializePhysics()`:
   ```typescript
   private initializePhysics(): void {
     const body = this.body as Phaser.Physics.Arcade.Body;
     body.setCircle(BALL_RADIUS);
     body.setBounce(1, 1);
     body.setCollideWorldBounds(true);
     body.setAllowGravity(false);
     body.onWorldBounds = true;
     body.enable = true;
   }
   ```

2. **Restore physics after group.add()** in `BallPool.setPrimaryBall()`:
   ```typescript
   setPrimaryBall(ball: Ball): void {
     this.primaryBall = ball;
     this.group.add(ball);  // This resets physics!

     // MUST restore physics after group.add()
     const body = ball.body as Phaser.Physics.Arcade.Body;
     body.setBounce(1, 1);
     body.setCollideWorldBounds(true);
     body.onWorldBounds = true;
   }
   ```

3. **Renamed `isActive()` to `isLaunched()`** for clarity:
   - `Ball.isLaunched()` - checks if ball is in play (has been launched)
   - `Ball.active` (Phaser property) - checks if ball is active in the scene/pool

#### Architectural Pattern: Ball Physics Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     BALL INITIALIZATION                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Constructor: scene.physics.add.existing() + initializePhysics()  │
│  2. BallPool.setPrimaryBall(): group.add() + RESTORE PHYSICS    │
│  3. Launch: ball.launch() sets velocity                         │
├─────────────────────────────────────────────────────────────────┤
│                     BALL REACTIVATION                            │
├─────────────────────────────────────────────────────────────────┤
│  1. ball.reset() - clears state                                 │
│  2. ball.activate() - calls initializePhysics()                 │
│  3. ball.attachToPaddle() - ready for launch                    │
└─────────────────────────────────────────────────────────────────┘
```

#### Critical Rule

> **Always restore physics properties after `group.add()`**
>
> Phaser's physics groups can reset body properties when adding sprites.
> Any critical physics settings (bounce, world bounds, etc.) must be
> re-applied after the sprite is added to the group.

#### Files Modified

| File | Change |
|------|--------|
| `src/objects/Ball.ts` | Added `initializePhysics()`, renamed `isActive()` → `isLaunched()` |
| `src/pools/BallPool.ts` | Restore physics after `group.add()` in `setPrimaryBall()` |
| `src/scenes/GameScene.ts` | Updated to use `isLaunched()` |
| `src/systems/PowerUpSystem.ts` | Updated to use `isLaunched()` |

### 2026-01-31 - Phase 5 Complete: Audio System

#### Architecture Decision: Dual Audio Backend

| Audio Type | Backend | Loading Strategy | Rationale |
|------------|---------|------------------|-----------|
| **SFX** | Web Audio | Preload in BootScene | Decoded in memory, instant low-latency playback |
| **Level Music** | HTML5 Audio | On-demand per level | Streams as it downloads, low memory footprint |
| **Menu Music** | HTML5 Audio | Preload in BootScene | Single file, acceptable load time |

#### Implementation: AudioManager Singleton

Created `src/systems/AudioManager.ts` as singleton managing all game audio:

```typescript
// Key responsibilities:
- playSFX(key: string)           // Instant SFX playback
- playMusic(key: string, loop)   // Single track playback
- loadLevelMusic(levelNumber)    // Discover & load level tracks
- crossfadeTo(key, duration)     // Smooth 500ms transitions
- pauseMusic() / resumeMusic()   // Pause menu support
- Volume/mute with localStorage persistence
```

#### Deviation: Generated Placeholder SFX

Instead of requiring external audio files for development, SFX are **synthesized via Web Audio API** in `BootScene.generatePlaceholderSFX()`:

| SFX Key | Sound | Synthesis Technique |
|---------|-------|---------------------|
| `sfx-pop` | Soft bubble pop | 400Hz sine, fast decay envelope |
| `sfx-horn` | Party horn | C5 with wobble, harmonics |
| `sfx-bounce` | Bouncy thud | Pitch drop 500→200Hz |
| `sfx-scratch` | Record scratch | Noise + frequency sweep |
| `sfx-airhorn` | Celebration | Stacked harmonics, attack envelope |
| `sfx-chime` | Sparkle | Major chord (A5, C#6, E6) |
| `sfx-trombone` | Sad wah-wah | Descending notes with vibrato |

**AudioBuffer → WAV conversion** required for Phaser compatibility (Phaser expects URL-loadable audio).

#### Level Music Discovery Pattern

Level music auto-discovered via folder convention:
```
public/audio/music/level{N}/track{1-3}.mp3
```

AudioManager attempts to load `track1.mp3`, `track2.mp3`, `track3.mp3` for each level, gracefully handling missing files. Tracks are shuffled (Fisher-Yates algorithm) per level and crossfade on completion.

#### SFX Trigger Points

| Event | SFX Key | Location |
|-------|---------|----------|
| Brick hit (not destroyed) | `sfx-pop` | `GameScene.handleBallBrickCollision()` |
| Brick destroyed | `sfx-horn` | `GameScene.handleBallBrickCollision()` |
| Paddle bounce | `sfx-bounce` | `GameScene.handleBallPaddleCollision()` |
| Life lost | `sfx-scratch` | `GameScene.handleBallLost()` |
| Level clear | `sfx-airhorn` | `GameScene.handleLevelComplete()` |
| Power-up collect | `sfx-chime` | `GameScene.handlePowerUpCollision()` |
| Game over | `sfx-trombone` | `GameOverScene.create()` |
| Win | `sfx-airhorn` | `GameOverScene.create()` |

#### UI Controls: PauseScene

Added to `PauseScene.ts`:
- Music volume slider (0-100%)
- SFX volume slider (0-100%)
- Mute toggle button
- Music auto-pauses when pause menu opens, resumes on close

#### Files Added/Modified

| File | Change |
|------|--------|
| `src/systems/AudioManager.ts` | **NEW** - Singleton audio manager |
| `src/config/Constants.ts` | Added `AUDIO` configuration object |
| `src/scenes/BootScene.ts` | Added placeholder SFX generation, menu music loading |
| `src/scenes/GameScene.ts` | All 7 SFX triggers, level music loading |
| `src/scenes/MenuScene.ts` | Menu music playback |
| `src/scenes/PauseScene.ts` | Volume/mute UI controls |
| `src/scenes/GameOverScene.ts` | Game over/win sounds |

### 2026-01-31 - Audio Manifest System

#### Context

The original folder discovery pattern (`level{N}/track{1-3}.mp3`) had limitations:
- No way to know what files exist without trial-and-error loading
- No metadata support (song names, artists, genres)
- Inconsistent naming (e.g., `[2] Fortune On The Block.mp3`)
- No validation before attempting to load

#### Decision: Manifest-Based Audio Loading

Replaced folder discovery with a JSON manifest at `public/audio/manifest.json`:

```json
{
  "version": 1,
  "sfx": {
    "pop": { "generated": true },
    "horn": { "generated": true }
  },
  "music": {
    "menu": {
      "file": "audio/music/menu/menu-theme.mp3",
      "name": "Block Party Theme"
    },
    "levels": [
      {
        "levels": [1],
        "tracks": [
          { "file": "audio/music/level1/track1.mp3", "name": "Party Starter", "genre": "upbeat" },
          { "file": "audio/music/level1/track2.mp3", "name": "Dance Floor", "genre": "disco" }
        ]
      }
    ]
  }
}
```

#### Manifest Schema

TypeScript types defined in `src/types/AudioManifest.ts`:

| Interface | Purpose |
|-----------|---------|
| `TrackMetadata` | File path + optional name, artist, genre, bpm, loopPoint |
| `SfxEntry` | Marks SFX as generated or file-based |
| `LevelMusicConfig` | Maps level numbers to track lists |
| `AudioManifest` | Root schema with version, sfx, and music sections |

#### Loading Flow

```
BootScene.preload()
└─ load.json('audio-manifest', 'audio/manifest.json')

BootScene.create()
├─ AudioManager.setManifest(manifest)  // Index all tracks
├─ load.audio('menu-music', manifest.music.menu.file)
└─ scene.start('MenuScene')

GameScene.loadLevelMusic(levelNumber)
├─ getTracksForLevel(levelNumber)      // Lookup in manifest
├─ Load tracks from manifest paths
└─ Shuffle and play
```

#### Metadata Accessors

New methods on AudioManager for future "Now Playing" UI:

```typescript
getCurrentTrackMetadata(): TrackMetadata | null
getCurrentTrackName(): string | null
getCurrentTrackArtist(): string | null
getCurrentTrackGenre(): string | null
getTrackMetadata(key: string): TrackMetadata | null
getAvailableLevelsWithMusic(): number[]
```

#### Key Changes

| Old Approach | New Approach |
|--------------|--------------|
| `discoverLevelTracks()` guesses paths | `getTracksForLevel()` reads manifest |
| Hardcoded `track1.mp3`, `track2.mp3` | Any filename, defined in manifest |
| No metadata | Full track info (name, artist, genre, etc.) |
| Load errors silent | Manifest validated at boot |

#### Files Modified

| File | Change |
|------|--------|
| `src/types/AudioManifest.ts` | **NEW** - TypeScript interfaces |
| `public/audio/manifest.json` | **NEW** - Audio manifest |
| `src/scenes/BootScene.ts` | Load manifest, pass to AudioManager |
| `src/systems/AudioManager.ts` | `setManifest()`, `getTracksForLevel()`, metadata accessors |

#### Adding New Music

To add tracks, edit `public/audio/manifest.json` - no code changes needed:

```json
{
  "levels": [3],
  "tracks": [
    { "file": "audio/music/level3/boss-battle.mp3", "name": "Final Showdown", "genre": "intense" }
  ]
}
```

#### Future Possibilities

- "Now Playing" overlay using `getCurrentTrackName()`
- Genre-based playlists
- BPM sync for visual effects
- Event emission on track change for reactive UI

### 2026-01-31 - Bug Fix: Power-Up Double-Collection

#### Problem

Power-ups were triggering effects multiple times when collected, causing:

1. **Multiball explosion**: Disco power-up spawning 4+ balls instead of 2
2. **Velocity stacking**: Multiple Balloon effects compounding slowdown

#### Root Cause

The collision handler checked `powerUp.active`, but the power-up remained active during its 200ms collection animation. If the paddle overlapped for multiple frames, `collect()` was called repeatedly.

```typescript
// OLD CODE - vulnerable to double-collection
if (!powerUp || !powerUp.active) return;  // Still true during animation!

// PowerUp.playCollectAnimation() takes 200ms before calling deactivate()
```

#### Solution

Added a `collected` flag that's set **immediately** on first collection, before the animation starts:

```typescript
// PowerUp.ts - new flag and methods
private collected: boolean = false;

isCollected(): boolean { return this.collected; }
markCollected(): void { this.collected = true; }

// Reset in activate()
this.collected = false;
```

```typescript
// GameScene.ts - check and set flag before processing
if (!powerUp || !powerUp.active || powerUp.isCollected()) return;
powerUp.markCollected();  // Prevent re-entry
```

Also added guard in `Ball.setFloating()` to prevent velocity stacking:

```typescript
setFloating(duration: number): void {
  if (this.isFloating) return;  // Don't stack effects
  // ...
}
```

#### Files Modified

| File | Change |
|------|--------|
| `src/objects/PowerUp.ts` | Added `collected` flag, `isCollected()`, `markCollected()` |
| `src/scenes/GameScene.ts` | Check `isCollected()` before processing, call `markCollected()` |
| `src/objects/Ball.ts` | Guard `setFloating()` against re-application |

#### Pattern: Immediate State Guard for Animated Actions

> When an action triggers an animation but the object remains "active" during the animation,
> use an immediate state flag to prevent re-triggering:
>
> 1. Check the flag before processing
> 2. Set the flag **immediately** (before animation starts)
> 3. Reset the flag when the object is recycled/reactivated

### 2026-01-31 - Power-Up Feedback System

#### Context

Power-up collection feedback was scattered across multiple locations:
- Sparkle particles in `ParticleSystem.sparkleCollect()`
- Camera flash in `GameScene.handlePowerUpCollision()`
- HUD indicators in `UIScene.showPowerUpIndicator()`

This made it difficult to customize feedback per power-up type and add new visual effects.

#### Decision: Consolidated PowerUpFeedbackSystem

Created `src/systems/PowerUpFeedbackSystem.ts` to centralize all collection visual feedback with per-power-up configuration.

#### Architecture

```
GameScene.handlePowerUpCollision()
├─ audioManager.playSFX('sfx-chime')     // Sound stays in GameScene
├─ powerUpFeedbackSystem.onCollect()     // NEW - consolidated visuals
│   ├─ playParticles(x, y, config)       // Type-specific sparkle colors
│   ├─ playScreenEffect(config)          // Type-specific flash/shake
│   └─ showPopupText(name, color)        // Center-screen popup
└─ powerUpSystem.collect()               // Game effect application
```

#### Configuration Pattern

Each power-up type has extensible feedback configuration:

```typescript
interface PowerUpFeedbackConfig {
  displayName: string;       // "SLOW BALL!", "WIDE PADDLE!", etc.
  color: number;             // Text and theme color
  particles?: {
    colors?: number[];       // Override default sparkle colors
    count?: number;          // Override particle count
    custom?: string;         // Hook for custom particle method
  };
  screenEffect?: {
    flash?: { duration: number; color: number; alpha?: number };
    shake?: { duration: number; intensity: number };
  };
}
```

#### Default Per-Type Effects

| Power-Up | Display Text | Color | Particle Tint | Screen Effect |
|----------|--------------|-------|---------------|---------------|
| Balloon | "SLOW BALL!" | Red | Red/white | White flash |
| Cake | "WIDE PADDLE!" | Gold | Gold/white | White flash |
| Drinks | "WOBBLY!" | Green | Green/white | White flash |
| Disco | "MULTI-BALL!" | Purple | Rainbow | Purple flash |
| Mystery | "???" → reveal | Green | Green/white | White flash |

#### Popup Text Animation

```
0ms      150ms     250ms     850ms     1250ms
│         │         │         │         │
├─Pop-in──┼─Settle──┼──Hold───┼─Fade────┤
│ 0→1.2   │ 1.2→1   │  stay   │ ↑+fade  │
│ α:0→1   │         │         │ α→0     │
```

- **Pop-in**: Scale 0→1.2, alpha 0→1, Back.easeOut
- **Settle**: Scale 1.2→1, Quad.easeOut
- **Hold**: 600ms center screen
- **Fade**: Float up 50px, alpha→0, scale→0.8

#### Mystery Power-Up Reveal

Mystery shows "???" initially, then reveals actual effect after 300ms delay:

```typescript
// In GameScene - wired via event
this.powerUpSystem.events.on('mysteryRevealed', (actualType: PowerUpType) => {
  this.powerUpFeedbackSystem.revealMystery(actualType);
});
```

#### Extensibility Hooks

Future per-type customization requires only editing `POWERUP_FEEDBACK_CONFIG`:

```typescript
// Example: Add screen shake to Disco
[PowerUpType.DISCO]: {
  displayName: 'MULTI-BALL!',
  color: COLORS.POWERUP_DISCO,
  particles: {
    colors: [0xff00ff, 0x00ffff, 0xffff00],
    count: 20,
  },
  screenEffect: {
    flash: { duration: 100, color: COLORS.POWERUP_DISCO },
    shake: { duration: 150, intensity: 0.003 },  // Add shake
  },
}
```

#### Files Modified

| File | Change |
|------|--------|
| `src/systems/PowerUpFeedbackSystem.ts` | **NEW** - Consolidated feedback system |
| `src/scenes/GameScene.ts` | Instantiate system, remove old sparkle/flash, wire mystery event |

#### What Stays Separate

| Concern | Location | Rationale |
|---------|----------|-----------|
| Sound | `GameScene` | Audio is separate concern from visuals |
| Collection animation | `PowerUp.playCollectAnimation()` | Object-owned behavior |
| HUD indicator | `UIScene.showPowerUpIndicator()` | Persistent UI, not momentary feedback |

### 2026-01-31 - Bug Fix: Power-Up Spawn Rate

#### Problem

Power-ups were spawning at ~6.25% instead of the intended 25% rate. The debug command (`window.powerUpSystem.debugDropChance = 1`) only achieved ~25% instead of 100%.

#### Root Cause: Double Probability Check

Two independent random checks were being applied:

| Layer | Location | Check |
|-------|----------|-------|
| 1 | `Brick.shouldDropPowerUp()` | `Math.random() < 0.25` |
| 2 | `PowerUpSystem.trySpawn()` | `Math.random() < 0.25` |

**Combined probability**: 0.25 × 0.25 = **6.25%**

The debug command only modified Layer 2, so even at 100% it resulted in: 0.25 × 1.0 = 25%.

#### Solution

Removed the redundant probability check from `PowerUpSystem.trySpawn()`. The Brick class now owns the spawn decision exclusively.

**Before:**
```typescript
// Brick.shouldDropPowerUp() - 25% gate
// PowerUpSystem.trySpawn() - another 25% gate (6.25% total)
```

**After:**
```typescript
// Brick.shouldDropPowerUp() - single 25% gate
// PowerUpSystem.trySpawn() - always spawns when called
```

#### Debug Command Migration

| Old | New |
|-----|-----|
| `window.powerUpSystem.debugDropChance = 1` | `window.Brick.debugDropChance = 1` |

The debug flag is now a static property on the `Brick` class, allowing true 0-100% control.

#### Files Modified

| File | Change |
|------|--------|
| `src/systems/PowerUpSystem.ts` | Removed probability check from `trySpawn()`, removed `debugDropChance` property |
| `src/objects/Brick.ts` | Added `static debugDropChance` property, `shouldDropPowerUp()` uses it |
| `src/scenes/GameScene.ts` | Updated debug exposure from `powerUpSystem` to `Brick` class |

#### Pattern: Single Responsibility for Spawn Decisions

> When implementing drop/spawn mechanics with multiple components involved,
> ensure only ONE component makes the probability decision:
>
> - **Brick** decides WHETHER to drop (probability check)
> - **PowerUpSystem** handles WHAT to spawn (type selection) and HOW (pooling)
>
> This prevents accidental probability multiplication and makes debug overrides predictable.
