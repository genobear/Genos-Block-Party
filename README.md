# Geno's Block Party

[![CI](https://github.com/genobear/Genos-Block-Party/actions/workflows/ci.yml/badge.svg)](https://github.com/genobear/Genos-Block-Party/actions/workflows/ci.yml)

A party-themed Breakout clone built with Phaser 3, TypeScript, and Vite.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (opens browser at localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **Phaser 3** - Game framework with Arcade physics
- **TypeScript** - Type-safe development
- **Vite** - Fast dev server and bundler

## Project Structure

```
src/
├── config/          # Game configuration
│   ├── Constants.ts    # All tunable values (speeds, sizes, colors)
│   ├── GameConfig.ts   # Phaser game config
│   └── LevelData.ts    # 10 level brick layouts
├── scenes/          # Phaser scenes
│   ├── BootScene.ts       # Asset loading
│   ├── MusicScene.ts      # Dedicated audio (never pauses)
│   ├── MenuScene.ts       # Main menu
│   ├── SettingsScene.ts   # Audio settings
│   ├── MusicPlayerScene.ts # Full music browser
│   ├── GameScene.ts       # Core gameplay
│   ├── UIScene.ts         # HUD overlay
│   ├── PauseScene.ts      # Pause menu
│   └── GameOverScene.ts   # Game over screen
├── objects/         # Game objects
│   ├── Ball.ts           # Ball with effect state
│   ├── Brick.ts          # Destructible brick
│   ├── Paddle.ts         # Player paddle
│   └── PowerUp.ts        # Collectible power-up
├── systems/         # Game systems
│   ├── AudioManager.ts        # Music and SFX singleton
│   ├── PowerUpSystem.ts       # Power-up effects
│   ├── CollisionHandler.ts    # Collision logic
│   ├── TransitionManager.ts   # Scene transitions
│   ├── ElectricArcSystem.ts   # Electric Ball AOE
│   ├── PowerUpFeedbackSystem.ts # Collection feedback
│   ├── NowPlayingToast.ts     # Track notifications
│   └── BackgroundManager.ts   # CSS backgrounds
├── effects/         # Ball particle effects
│   ├── BallEffectManager.ts   # Effect composition
│   ├── BallEffectTypes.ts     # Effect enums
│   └── handlers/              # Effect implementations
├── pools/           # Object pools
│   ├── BallPool.ts           # Multi-ball management
│   └── PowerUpPool.ts        # Power-up recycling
└── types/           # TypeScript types
    ├── BrickTypes.ts         # Brick definitions
    ├── PowerUpTypes.ts       # Power-up configs
    └── TransitionTypes.ts    # Transition presets
```

## Common Patterns

### Scene Communication

Scenes communicate via Phaser's event system:

```typescript
// Emit from GameScene
this.events.emit('scoreUpdate', newScore);

// Listen in UIScene
gameScene.events.on('scoreUpdate', (score: number) => {
  this.updateScoreDisplay(score);
});
```

### Object Pooling

`BallPool` and `PowerUpPool` recycle game objects to avoid garbage collection stutters:

```typescript
// Get object from pool
const ball = this.ballPool.spawn(x, y);

// Return to pool
this.ballPool.despawn(ball);
```

### Singleton Systems

Several systems use the singleton pattern:

```typescript
// Get instance anywhere
const audio = AudioManager.getInstance();
audio.playSFX(AUDIO.SFX.BOUNCE);

const transitions = TransitionManager.getInstance();
transitions.transition('level-complete', nextLevel, elements);
```

## Extending the Game

### Adding a New Power-up

1. **Add type to enum** in `src/types/PowerUpTypes.ts`:
```typescript
export enum PowerUpType {
  // ...existing types
  NEWPOWER = 'newpower',
}
```

2. **Add config** in `POWERUP_CONFIGS`:
```typescript
[PowerUpType.NEWPOWER]: {
  type: PowerUpType.NEWPOWER,
  color: 0xff00ff,      // Visual color
  duration: 10000,      // ms (0 for instant)
  dropWeight: 10,       // Higher = more common
  emoji: '🆕',
},
```

3. **Add effect handler** in `src/systems/PowerUpSystem.ts`:
```typescript
private applyNewPower(): void {
  // Effect logic here
  this.scene.events.emit('effectApplied', 'newpower', duration);
}
```

4. **(Optional) Add ball effect** if it changes ball visuals - see Ball Effects section.

### Adding a New Scene

1. **Create scene file** in `src/scenes/`:
```typescript
export class NewScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NewScene' });
  }

  create(): void {
    // Scene setup
  }
}
```

2. **Register in GameConfig** (`src/config/GameConfig.ts`):
```typescript
scene: [BootScene, /* ... */, NewScene],
```

3. **Launch from another scene**:
```typescript
this.scene.start('NewScene', { returnTo: 'MenuScene' });
```

### Adding Ball Effects

The effect system supports composable, stacking particle effects on balls.

1. **Create handler** extending `BaseBallEffect`:
```typescript
// src/effects/handlers/NewEffectHandler.ts
export class NewEffectHandler extends BaseBallEffect {
  protected createEmitters(): void {
    this.trailEmitter = this.createEmitter({
      speed: { min: 20, max: 50 },
      scale: { start: 0.3, end: 0 },
      lifespan: 300,
      tint: 0xff00ff,
    });
  }

  update(ball: Ball): void {
    this.trailEmitter?.setPosition(ball.x, ball.y);
  }
}
```

2. **Add to BallEffectTypes** enum
3. **Register in BallEffectManager** factory

### Adding Transition Presets

Define new presets in `src/types/TransitionTypes.ts`:

```typescript
export const TRANSITION_PRESETS = {
  'my-transition': {
    backgroundType: TransitionType.WHIP_DOWN,
    elementExit: ElementExitStyle.SPIRAL,
    exitDuration: 400,
    entryDuration: 300,
  },
};
```

## Extensible Systems

### TransitionManager

Coordinated scene transitions with element animations:

```typescript
const tm = TransitionManager.getInstance();
await tm.transition(
  'level-complete',          // Preset name
  nextLevelNumber,           // For background manager
  [brick1, brick2, paddle],  // Elements to animate out
  () => { /* midpoint */ },  // Called between exit/entry
  () => { /* complete */ }   // Called when done
);
```

### BallEffectManager

Composable particle effects that can stack:

```typescript
// Apply effect to ball
ball.effectManager.applyEffect(BallEffectType.FIREBALL);

// Remove effect
ball.effectManager.removeEffect(BallEffectType.FIREBALL);

// Check if active
ball.effectManager.hasEffect(BallEffectType.FIREBALL);
```

### PowerUpFeedbackSystem

Visual feedback on collection (particles, screen flash, popup text):

```typescript
// Automatically triggered on power-up collection
// Configure per-power-up in the system's config object
```

### AudioManager

Manages music streaming and SFX:

```typescript
const audio = AudioManager.getInstance();

// Play SFX
audio.playSFX(AUDIO.SFX.BOUNCE);

// Music controls
audio.playLevelMusic(levelNumber);
audio.setMusicVolume(0.5);
audio.setSFXVolume(0.8);
audio.toggleMute();
```

Add level music: `public/audio/music/level{N}/track{1-3}.mp3`

## Debug Tools

Open browser console during gameplay:

```javascript
// Show drop chance % on each brick
Brick.debugShowDropChance = true

// Force drop rate (1 = 100%)
Brick.debugDropChance = 1

// Reset to normal
Brick.debugDropChance = null

// Simulate Power Ball active
Brick.powerBallActive = true
```

## License

MIT
