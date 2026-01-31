# Geno's Block Party - Project Plan

> **Last Updated**: 2026-01-30
> **Current Phase**: Phase 4 Complete, Phase 5 Ready

---

## Game Overview

**Genre**: Breakout clone with party theme

**Core Mechanics**:
- Paddle at bottom, mouse/touch controlled
- Ball bounces off walls, paddle, and bricks
- Bricks take 1-3 hits (color-coded by type)
- 3 lives, lose one when ball hits bottom
- Score counter, high score persistence (localStorage)

**Party Theme**:
- Bricks = wrapped presents (pink), piñata blocks (orange), balloon clusters (cyan)
- Ball = simple white circle
- Paddle = DJ deck style (purple with accent circles)
- Background = dark party atmosphere with confetti on brick break

---

## Visual Style

**Approach**: Placeholder shapes (colored rectangles/circles) - fast to implement, can swap in real art later.

| Element | Style | Color |
|---------|-------|-------|
| Ball | Simple circle | White |
| Paddle | Rounded rect with DJ deck accents | Purple (#8b5cf6) |
| Present brick | Rounded rect | Pink (#ff69b4) |
| Piñata brick | Rounded rect | Orange (#ffa500) |
| Balloon brick | Rounded rect | Cyan (#00bfff) |

Health indicated by opacity/brightness (full → faded as damaged) + dot indicators.

---

## Power-Ups

| Power-Up | Effect | Duration | Drop Weight |
|----------|--------|----------|-------------|
| 🎈 Balloon | Ball moves slower | 10s | 20 |
| 🎂 Cake | Wide paddle | 15s | 15 |
| 🍻 Drinks | Wobbly paddle (debuff) | 8s | 15 |
| 🪩 Disco | Spawn 2 extra balls | Instant | 10 |
| 🎁 Mystery | Random effect | Varies | 10 |

**Drop Chance**: 25% base (varies by level)

---

## Levels (10 Total)

| # | Name | Ball Speed | Notes |
|---|------|------------|-------|
| 1 | The Warm-Up | 1.0x | Simple 3-row layout, 1-hit presents |
| 2 | Dance Floor | 1.05x | Checkerboard pattern, mixed types |
| 3 | Gift Wrapped | 1.1x | Present pyramid, varying health |
| 4 | Balloon Bonanza | 1.15x | Heavy balloon clusters |
| 5 | Piñata Panic | 1.2x | Piñata-focused, high health |
| 6 | The Maze | 1.2x | Gaps and patterns |
| 7 | Disco Fever | 1.25x | Dense, high power-up drops |
| 8 | Sugar Rush | 1.3x | Fast-paced, lots of 1-hits |
| 9 | Last Call | 1.35x | High-health challenging pattern |
| 10 | Grand Finale | 1.4x | Maximum density, all types |

---

## Audio Plan

| Event | Sound |
|-------|-------|
| Brick hit (not destroyed) | Pop sound |
| Brick destroyed | Party horn |
| Paddle bounce | Bounce |
| Life lost | Record scratch |
| Level clear | Airhorn |
| Power-up collect | Chime |
| Game over | Sad trombone |
| Background | Upbeat party loop |

---

## Project Structure

```
src/
├── main.ts                    # Phaser game bootstrap
├── config/
│   ├── GameConfig.ts          # Phaser configuration (800x600, Arcade physics)
│   ├── Constants.ts           # Game constants (speeds, sizes, colors)
│   └── LevelData.ts           # All 10 level definitions
├── scenes/
│   ├── BootScene.ts           # Asset preloading with progress bar
│   ├── MenuScene.ts           # Title screen, high scores, start button
│   ├── GameScene.ts           # Main gameplay loop
│   ├── UIScene.ts             # HUD overlay (lives, score, level name)
│   └── GameOverScene.ts       # Final score, high score entry
├── objects/
│   ├── Paddle.ts              # Player paddle with power-up states
│   ├── Ball.ts                # Ball with physics and effects
│   ├── Brick.ts               # Individual brick (present/piñata/balloon)
│   ├── BrickGrid.ts           # Brick layout manager
│   └── PowerUp.ts             # Falling power-up items
├── systems/
│   ├── PowerUpSystem.ts       # Spawn logic and effect application
│   ├── ParticleSystem.ts      # Confetti, streamers on brick break
│   ├── AudioManager.ts        # Music and sound effects
│   ├── ScoreManager.ts        # Score, lives, localStorage persistence
│   └── ScreenEffects.ts       # Screen shake, flash effects
├── pools/
│   ├── BallPool.ts            # Object pool for multi-ball
│   └── PowerUpPool.ts         # Object pool for power-ups
└── types/
    ├── BrickTypes.ts          # Brick type definitions
    ├── PowerUpTypes.ts        # Power-up definitions
    └── GameState.ts           # State interfaces
```

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE

- [x] Initialize Vite + TypeScript + Phaser 3
- [x] Create GameConfig with Arcade physics
- [x] Implement BootScene with placeholder graphics generation
- [x] Create Paddle with mouse/touch input
- [x] Create Ball with basic physics
- [x] Ball-paddle collision with angle calculation
- [x] Create Brick class with health system
- [x] Create level data structure (10 levels defined)
- [x] Ball-brick collision and destruction
- [x] Basic score and lives tracking
- [x] Ball out-of-bounds = life loss
- [x] Game over when lives = 0
- [x] Level progression on clear
- [x] Menu scene with start button
- [x] High score persistence (localStorage)
- [x] Screen shake on collisions
- [x] Brick destruction animations

### Phase 2: Power-Ups ✅ COMPLETE

- [x] Create `src/types/PowerUpTypes.ts` - type definitions
- [x] Create `src/objects/PowerUp.ts` - falling power-up sprite
- [x] Create `src/pools/PowerUpPool.ts` - object pool
- [x] Create `src/systems/PowerUpSystem.ts` - spawn and effect logic
- [x] Implement Cake effect (wide paddle)
- [x] Implement Balloon effect (slow ball)
- [x] Implement Drinks effect (wobbly paddle)
- [x] Create `src/pools/BallPool.ts` - for multi-ball
- [x] Implement Disco effect (spawn 2 extra balls)
- [x] Implement Mystery effect (random selection)
- [x] Add power-up collision detection in GameScene
- [x] Visual indicators for active effects

### Phase 3: Polish & Effects ✅ COMPLETE

- [x] Create `src/systems/ParticleSystem.ts`
- [x] Confetti burst on brick destruction
- [x] Streamers on level clear
- [x] Power-up collection sparkle
- [x] Create `src/systems/ScreenEffects.ts` (expand current shake)
- [x] Screen flash on level clear
- [x] Slow-motion on last ball danger
- [x] Danger mode indicator (pulsing red vignette on last life)

### Phase 4: UI & Scenes ✅ COMPLETE

- [x] Create `src/scenes/UIScene.ts` - separate HUD overlay
- [x] Move score/lives/level display to UIScene
- [x] Add active power-up indicators to UI
- [x] Create `src/scenes/GameOverScene.ts` - proper end screen
- [x] High score entry (initials)
- [x] Top 5 leaderboard display
- [x] Create `src/scenes/PauseScene.ts` - pause overlay
- [x] Add pause button for mobile

### Phase 5: Audio ✅ COMPLETE

- [x] Create `src/systems/AudioManager.ts` singleton
- [x] Generate placeholder SFX (synthesized party sounds)
- [x] Generate placeholder menu music loop
- [x] Integrate all sound triggers (7 SFX trigger points)
- [x] Level music streaming with shuffle and crossfade
- [x] Volume controls in PauseScene
- [x] Mute toggle with localStorage persistence

**Note**: Placeholder sounds are generated via Web Audio synthesis. To use your custom level music:
1. Add MP3 files to `public/audio/music/level{N}/track{1-3}.mp3`
2. The AudioManager will auto-discover and shuffle them per level

### Phase 6: Content & Final Polish ⬜ NEXT

- [ ] Review and tune all 10 levels
- [ ] Balance difficulty curve
- [ ] Mobile touch optimization
- [ ] Cross-browser testing
- [ ] Performance profiling
- [ ] Build optimization

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/scenes/GameScene.ts` | Core gameplay, collisions, level management |
| `src/objects/Paddle.ts` | Player control, power-up states, bounce angles |
| `src/objects/Ball.ts` | Physics, launch mechanics, speed control |
| `src/objects/Brick.ts` | Health, destruction, score values |
| `src/config/LevelData.ts` | All 10 level definitions |
| `src/config/Constants.ts` | All tunable game values |

---

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
```

---

## Verification Checklist

- [ ] `npm run dev` - game loads at localhost:3000
- [ ] Menu displays, start button works
- [ ] Ball bounces off walls, paddle, bricks
- [ ] Bricks take correct number of hits
- [ ] Score increases correctly
- [ ] Lives decrease on ball loss
- [ ] Game over at 0 lives
- [ ] Level advances when cleared
- [ ] All 10 levels completable
- [ ] Power-ups drop and work correctly
- [ ] High score saves between sessions
- [ ] Touch controls work on mobile
- [ ] `npm run build` produces working dist/
