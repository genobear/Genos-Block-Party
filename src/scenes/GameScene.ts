import Phaser from 'phaser';
import { Paddle } from '../objects/Paddle';
import { Ball } from '../objects/Ball';
import { Brick } from '../objects/Brick';
import { BallPool } from '../pools/BallPool';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { ScreenEffects } from '../systems/ScreenEffects';
import { PowerUpFeedbackSystem } from '../systems/PowerUpFeedbackSystem';
import { CollisionHandler } from '../systems/CollisionHandler';
import { ElectricArcSystem } from '../systems/ElectricArcSystem';
import { AudioManager } from '../systems/AudioManager';
import { NowPlayingToast } from '../systems/NowPlayingToast';
import { BackgroundManager } from '../systems/BackgroundManager';
import { TransitionManager } from '../systems/TransitionManager';
import { BallSpeedManager } from '../systems/BallSpeedManager';
import { PowerUpType } from '../types/PowerUpTypes';
import { SafetyNet } from '../objects/SafetyNet';
import { BallEffectType } from '../effects/BallEffectTypes';
import { LEVELS, LevelData } from '../config/LevelData';
import {
  GAME_WIDTH,
  PLAYABLE_WIDTH,
  PLAYABLE_HEIGHT,
  PLAY_AREA_Y,
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BRICK_ROWS_START_Y,
  BRICK_COLS,
  STARTING_LIVES,
  AUDIO,
  MULTIPLIER,
} from '../config/Constants';

export class GameScene extends Phaser.Scene {
  // Game objects
  private paddle!: Paddle;
  private bricks!: Phaser.Physics.Arcade.StaticGroup;

  // Ball pool (all balls are equal, no primary ball)
  private ballPool!: BallPool;
  private powerUpSystem!: PowerUpSystem;

  // Visual effect systems
  private particleSystem!: ParticleSystem;
  private screenEffects!: ScreenEffects;
  private powerUpFeedbackSystem!: PowerUpFeedbackSystem;
  private collisionHandler!: CollisionHandler;
  private electricArcSystem!: ElectricArcSystem;
  private isInDanger: boolean = false;

  // Bounce House safety net collider
  private safetyNetCollider: Phaser.Physics.Arcade.Collider | null = null;

  // Audio
  private audioManager!: AudioManager;
  private unsubscribeTrackChange: (() => void) | null = null;

  // Speed management
  private speedManager!: BallSpeedManager;

  // Game state
  private score: number = 0;
  private lives: number = STARTING_LIVES;
  private currentLevelIndex: number = 0;
  private currentLevel!: LevelData;
  private isGameOver: boolean = false;
  private canLaunch: boolean = true;
  private lastDebugShowDropChance: boolean = false;
  private isLevelTransitioning: boolean = false;

  // Multiplier state
  private multiplier: number = MULTIPLIER.BASE;
  private lastHitTime: number = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    // Reset game state
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.currentLevelIndex = 0;
    this.isGameOver = false;
    this.isLevelTransitioning = false;
    this.canLaunch = true;

    // Reset multiplier state
    this.multiplier = MULTIPLIER.BASE;
    this.lastHitTime = 0;

    // Set transparent background so CSS background shows through
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');

    // Set up world bounds for playable area only (offset by UI borders)
    // Ball can escape bottom (no collision on bottom edge)
    this.physics.world.setBounds(0, PLAY_AREA_Y, PLAYABLE_WIDTH, PLAYABLE_HEIGHT);
    this.physics.world.setBoundsCollision(true, true, true, false);

    // Create paddle
    this.paddle = new Paddle(this);

    // Create ball pool and spawn initial ball attached to paddle
    this.ballPool = new BallPool(this);
    this.ballPool.spawnAttachedToPaddle(
      this.paddle,
      PLAYABLE_WIDTH / 2,
      PLAY_AREA_Y + PLAYABLE_HEIGHT - 100
    );

    // Listen for any ball loss
    this.events.on('ballLost', this.onBallLost, this);

    // Create power-up system (no longer needs primary ball reference)
    this.powerUpSystem = new PowerUpSystem(this, this.paddle, this.ballPool);

    // Expose Brick class for debug console: window.Brick.debugDropChance = 1
    (window as unknown as { Brick: typeof Brick }).Brick = Brick;

    // Expose debug commands: GameDebug.skipToLevel(1), GameDebug.completeLevel()
    (window as unknown as { GameDebug: object }).GameDebug = {
      skipToLevel: (levelIndex: number) => this.debugSkipToLevel(levelIndex),
      completeLevel: () => this.debugCompleteLevel(),
      spawnPowerUp: (type: string, x?: number, y?: number) => {
        const spawnX = x ?? 400;
        const spawnY = y ?? 300;
        return this.powerUpSystem.forceSpawn(spawnX, spawnY, type as PowerUpType);
      },
      getState: () => ({
        level: this.currentLevelIndex,
        levelName: this.currentLevel?.name,
        lives: this.lives,
        score: this.score,
        activeBalls: this.ballPool.getActiveCount(),
        canLaunch: this.canLaunch,
      }),
    };

    // Create visual effect systems
    this.particleSystem = new ParticleSystem(this);
    this.screenEffects = new ScreenEffects(this);
    this.powerUpFeedbackSystem = new PowerUpFeedbackSystem(this);

    // Get audio manager instance and initialize with this scene
    this.audioManager = AudioManager.getInstance();
    this.audioManager.init(this);

    // Get speed manager instance
    this.speedManager = BallSpeedManager.getInstance();

    // Wire up "Now Playing" toast notification
    const nowPlayingToast = NowPlayingToast.getInstance();
    this.unsubscribeTrackChange = this.audioManager.onTrackChange((metadata) => {
      nowPlayingToast.onTrackChange(metadata);
    });

    // Create collision handler with callbacks
    this.collisionHandler = new CollisionHandler(
      this,
      this.powerUpSystem,
      this.particleSystem,
      this.powerUpFeedbackSystem,
      this.audioManager,
      {
        onScoreChange: (points: number) => this.addScore(points),
        onBrickHit: () => this.incrementMultiplier(),
        onLevelComplete: () => this.handleLevelComplete(),
        getBrickCount: () => this.bricks.countActive(),
      }
    );

    // Create brick group
    this.bricks = this.physics.add.staticGroup();

    // Create electric arc system for Electric Ball AOE
    this.electricArcSystem = new ElectricArcSystem(this, this.bricks);
    this.collisionHandler.setElectricArcSystem(this.electricArcSystem);
    this.collisionHandler.setBricksGroup(this.bricks);

    // Load first level
    this.loadLevel(0);

    // Set up collisions
    this.setupCollisions();

    // Listen for world bounds events
    this.physics.world.on('worldbounds', this.handleWorldBounds, this);

    // Launch the UI scene
    this.scene.launch('UIScene');

    // Forward power-up events to UIScene
    this.powerUpSystem.events.on('effectApplied', (type: string, duration?: number, stackCount?: number) => {
      this.events.emit('effectApplied', type, duration, stackCount);
    });
    this.powerUpSystem.events.on('effectExpired', (type: string) => {
      this.events.emit('effectExpired', type);
    });

    // Wire mystery reveal to feedback system
    this.powerUpSystem.events.on('mysteryRevealed', (actualType: PowerUpType) => {
      this.powerUpFeedbackSystem.revealMystery(actualType);
    });

    // Wire safety net events (Bounce House power-up)
    this.powerUpSystem.events.on('safetyNetCreated', this.onSafetyNetCreated, this);
    this.powerUpSystem.events.on('safetyNetDestroyed', this.onSafetyNetDestroyed, this);

    // Handle extra life from Party Favor power-up
    this.powerUpSystem.events.on('grantExtraLife', () => {
      this.lives++;
      this.events.emit('livesUpdate', this.lives);
    });

    // Emit initial state to UI
    this.events.emit('scoreUpdate', this.score);
    this.events.emit('livesUpdate', this.lives);
    this.events.emit('levelUpdate', this.currentLevel.name);
    this.events.emit('multiplierUpdate', this.multiplier);

    // Input for launching ball
    this.input.on('pointerdown', this.handleClick, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleClick, this);

    // Register shutdown handler for cleanup
    this.events.on('shutdown', this.shutdown, this);
  }

  /**
   * Clean up event listeners to prevent memory leaks on scene restart
   */
  shutdown(): void {
    // Clean up scene events
    this.events.off('ballLost', this.onBallLost, this);
    this.events.off('shutdown', this.shutdown, this);

    // Clean up physics world events (check if physics exists)
    this.physics?.world?.off('worldbounds', this.handleWorldBounds, this);

    // Clean up power-up system event forwarding (check if system exists)
    this.powerUpSystem?.events?.off('effectApplied');
    this.powerUpSystem?.events?.off('effectExpired');
    this.powerUpSystem?.events?.off('mysteryRevealed');
    this.powerUpSystem?.events?.off('safetyNetCreated');
    this.powerUpSystem?.events?.off('safetyNetDestroyed');
    this.powerUpSystem?.events?.off('grantExtraLife');

    // Clean up safety net collider
    if (this.safetyNetCollider) {
      this.safetyNetCollider.destroy();
      this.safetyNetCollider = null;
    }

    // Clean up input events
    this.input?.off('pointerdown', this.handleClick, this);
    this.input?.keyboard?.off('keydown-SPACE', this.handleClick, this);

    // Clean up audio track change listener
    if (this.unsubscribeTrackChange) {
      this.unsubscribeTrackChange();
      this.unsubscribeTrackChange = null;
    }

    // Clean up visual effects
    if (this.isInDanger) {
      this.exitDangerMode();
    }
    this.screenEffects?.destroy();
  }

  update(time: number, delta: number): void {
    if (this.isGameOver || this.isLevelTransitioning) return;

    // Update paddle
    this.paddle.update(time, delta);

    // Update all active balls
    this.ballPool.getActiveBalls().forEach((ball) => {
      ball.update(time, delta);
    });

    // Update power-up and ball pool systems
    this.powerUpSystem.update();
    this.ballPool.update();

    // Update multiplier decay
    this.updateMultiplierDecay(time, delta);

    // Update debug drop chance display on bricks
    if (Brick.debugShowDropChance || this.lastDebugShowDropChance !== Brick.debugShowDropChance) {
      this.bricks.children.iterate((child) => {
        const brick = child as Brick;
        if (brick && brick.active) {
          brick.updateDropChanceText();
        }
        return true;
      });
      this.lastDebugShowDropChance = Brick.debugShowDropChance;
    }
  }

  private handleClick(): void {
    // Can launch if there are any unlaunched balls
    const hasUnlaunchedBall = this.ballPool.getActiveBalls().some((b) => !b.isLaunched());
    if (hasUnlaunchedBall && this.canLaunch && !this.isGameOver) {
      this.launchBall();
    }
  }

  private launchBall(): void {
    // Launch all unlaunched balls (speed is handled by BallSpeedManager)
    this.ballPool.getActiveBalls().forEach((ball) => {
      if (!ball.isLaunched()) {
        ball.launch();
      }
    });
    this.events.emit('ballLaunched');
    this.canLaunch = false;
  }

  /**
   * Handle individual ball loss - check if all balls are gone
   */
  private onBallLost(_ball: Ball): void {
    // Don't lose lives during level transition
    if (this.isLevelTransitioning) return;

    // Update multi-ball effects (remove disco sparkle when back to 1 ball)
    this.updateMultiBallEffects();

    // Check if any balls remain
    if (this.ballPool.getActiveCount() === 0) {
      this.handleAllBallsLost();
    }
  }

  /**
   * Update effects based on ball count (disco sparkle only when multi-ball)
   */
  private updateMultiBallEffects(): void {
    const ballCount = this.ballPool.getActiveCount();
    const activeBalls = this.ballPool.getActiveBalls();

    if (ballCount <= 1) {
      // Remove disco sparkle from remaining ball
      activeBalls.forEach((ball) => {
        ball.removeEffect(BallEffectType.DISCO_SPARKLE);
      });
    }
  }

  private loadLevel(index: number): void {
    // Guard: ensure bricks group exists (scene may be shutting down)
    if (!this.bricks) {
      console.warn('loadLevel called but bricks group not ready');
      return;
    }

    // Clear existing bricks
    this.bricks.clear(true, true);

    // Get level data
    this.currentLevelIndex = index;
    this.currentLevel = LEVELS[index];

    // Load and play level music (async, non-blocking)
    this.audioManager.loadLevelMusic(index + 1).catch(() => {
      // Music loading is optional - game continues without it
    });

    // Background preload next level's music
    if (index < LEVELS.length - 1) {
      this.audioManager.preloadLevelMusic(index + 2);
    }

    // Set the full-viewport background for this level
    BackgroundManager.setLevelBackground(index + 1);

    // Calculate brick grid offset to center it
    const totalWidth = BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING;
    const offsetX = (GAME_WIDTH - totalWidth) / 2 + BRICK_WIDTH / 2;

    // Create bricks from level data
    this.currentLevel.bricks.forEach((brickConfig) => {
      const x = offsetX + brickConfig.x * (BRICK_WIDTH + BRICK_PADDING);
      const y = BRICK_ROWS_START_Y + brickConfig.y * (BRICK_HEIGHT + BRICK_PADDING);

      const brick = new Brick(this, x, y, brickConfig.type, brickConfig.health);
      this.bricks.add(brick);
    });

    // Emit level update to UI
    this.events.emit('levelUpdate', this.currentLevel.name);

    // Set level speed multiplier on speed manager
    this.speedManager.setLevelMultiplier(this.currentLevel.ballSpeedMultiplier);
  }

  private setupCollisions(): void {
    // Ball vs Paddle - use overlap for custom physics control
    // (collider applies default bounce before callback runs, overwriting our custom angle)
    this.physics.add.overlap(
      this.ballPool.getGroup(),
      this.paddle,
      this.collisionHandler.handleBallPaddle.bind(this.collisionHandler) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // Ball vs Bricks (using ball pool group for multi-ball support)
    // processCallback returns false for fireball to prevent bounce (piercing)
    this.physics.add.collider(
      this.ballPool.getGroup(),
      this.bricks,
      this.collisionHandler.handleBallBrick.bind(this.collisionHandler) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      this.collisionHandler.shouldProcessBrickCollision.bind(this.collisionHandler) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      this
    );

    // Power-ups vs Paddle
    this.physics.add.overlap(
      this.powerUpSystem.getPowerUpGroup(),
      this.paddle,
      this.collisionHandler.handlePowerUpCollect.bind(this.collisionHandler) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  private handleWorldBounds(
    _body: Phaser.Physics.Arcade.Body,
    up: boolean,
    _down: boolean,
    left: boolean,
    right: boolean
  ): void {
    // Ball hit wall - we could play a sound here
    if (left || right || up) {
      // Optional: add wall bounce effect
    }
  }

  private handleAllBallsLost(): void {
    // Don't lose lives during level transition
    if (this.isLevelTransitioning) return;
    this.lives--;
    this.events.emit('livesUpdate', this.lives);

    // Play scratch sound for life lost
    this.audioManager.playSFX(AUDIO.SFX.SCRATCH);

    // Large screen shake
    this.cameras.main.shake(200, 0.01);

    // Reset multiplier on life loss
    this.resetMultiplier();

    // Clear power-up effects
    this.powerUpSystem.clear();
    this.events.emit('effectsCleared');

    // Exit danger mode when losing a life
    this.exitDangerMode();

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      // Reset ball
      this.resetBall();

      // Enter danger mode on last life
      if (this.lives === 1) {
        this.enterDangerMode();
      }
    }
  }

  private resetBall(): void {
    // Clear all balls
    this.ballPool.clearAll();

    // Spawn new ball attached to paddle
    this.ballPool.spawnAttachedToPaddle(
      this.paddle,
      this.paddle.x,
      PLAY_AREA_Y + PLAYABLE_HEIGHT - 100
    );

    this.canLaunch = true;
    this.events.emit('ballReset');
  }

  private handleLevelComplete(): void {
    // Prevent double-triggering during transition
    if (this.isLevelTransitioning || this.isGameOver) {
      return;
    }
    this.isLevelTransitioning = true;

    // Play airhorn for level clear
    this.audioManager.playSFX(AUDIO.SFX.AIRHORN);

    // Celebration effects
    this.screenEffects.levelClearFlash();
    this.particleSystem.celebrateStreamers();

    // Exit danger mode if active
    this.exitDangerMode();

    // Reset multiplier for next level
    this.resetMultiplier();

    // Clear power-ups and all balls
    this.powerUpSystem.clear();
    this.ballPool.clearAll();
    this.events.emit('effectsCleared');

    // Check if there are more levels
    if (this.currentLevelIndex < LEVELS.length - 1) {
      // Transition to next level with animation
      this.time.delayedCall(800, () => {
        this.transitionToNextLevel();
      });
    } else {
      // Game completed!
      this.time.delayedCall(1000, () => {
        this.gameWin();
      });
    }
  }

  private transitionToNextLevel(): void {
    const nextLevelNumber = this.currentLevelIndex + 2; // 1-indexed for display
    const transitionManager = TransitionManager.getInstance();
    transitionManager.init(this);

    // Get any active ball for transition animation (may be null)
    const activeBalls = this.ballPool.getActiveBalls();
    const transitionBall = activeBalls.length > 0 ? activeBalls[0] : null;

    transitionManager.transitionToNextLevel(
      nextLevelNumber,
      this.bricks,
      this.paddle,
      transitionBall,
      () => {
        // Reset paddle visual properties and position BEFORE loading level
        // (transition animation sets scale/alpha/rotation and moves position)
        this.paddle.setScale(1);
        this.paddle.setAlpha(1);
        this.paddle.setRotation(0);
        this.paddle.setPosition(GAME_WIDTH / 2, PLAY_AREA_Y + PLAYABLE_HEIGHT - 50);

        // Load the next level and reset
        this.loadLevel(this.currentLevelIndex + 1);
        this.resetBall();

        // Allow new transitions
        this.isLevelTransitioning = false;
      }
    );
  }

  private gameOver(): void {
    this.isGameOver = true;

    // Stop level music
    this.audioManager.stopMusic();

    // Clean up effects
    this.exitDangerMode();
    this.screenEffects.destroy();

    // Emit game over event
    this.events.emit('gameOver');

    // Transition to game over scene (currency awarded there)
    this.time.delayedCall(500, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', { score: this.score, isWin: false });
    });
  }

  private gameWin(): void {
    this.isGameOver = true;

    // Stop level music
    this.audioManager.stopMusic();

    // Clean up effects
    this.exitDangerMode();
    this.screenEffects.destroy();

    // Emit game win event
    this.events.emit('gameWin');

    // Transition to game over scene (currency awarded there)
    this.time.delayedCall(500, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', { score: this.score, isWin: true });
    });
  }

  private addScore(points: number): void {
    const multipliedPoints = Math.floor(points * this.multiplier);
    this.score += multipliedPoints;
    this.events.emit('scoreUpdate', this.score);
  }

  /**
   * Increment the score multiplier on each brick hit
   */
  private incrementMultiplier(): void {
    this.lastHitTime = this.time.now;

    // Diminishing increment: harder to grow at higher multipliers
    // At 1.0x: +0.15, at 3.0x: +0.075, at 5.0x: +0.0375
    const growthFactor = MULTIPLIER.BASE / this.multiplier;
    const increment = 0.15 * growthFactor;

    this.multiplier = Math.min(
      MULTIPLIER.MAX_MULTIPLIER,
      this.multiplier + increment
    );
    this.events.emit('multiplierUpdate', this.multiplier);
  }

  /**
   * Decay the multiplier over time when not hitting bricks
   * Decay rate scales with multiplier level - slower when low, faster when high
   */
  private updateMultiplierDecay(time: number, delta: number): void {
    if (this.multiplier <= MULTIPLIER.BASE) return;

    const timeSinceHit = time - this.lastHitTime;
    if (timeSinceHit > MULTIPLIER.DECAY_DELAY_MS) {
      // Scale decay rate based on how far above base we are
      // At 1.1x: ~2.5% decay rate, at 3.0x: ~50%, at 5.0x: 100%
      const multiplierAboveBase = this.multiplier - MULTIPLIER.BASE;
      const maxAboveBase = MULTIPLIER.MAX_MULTIPLIER - MULTIPLIER.BASE;
      const decayScale = multiplierAboveBase / maxAboveBase;
      const effectiveDecayRate = MULTIPLIER.DECAY_RATE * decayScale;

      const decay = effectiveDecayRate * (delta / 1000);
      this.multiplier = Math.max(MULTIPLIER.BASE, this.multiplier - decay);
      this.events.emit('multiplierUpdate', this.multiplier);
    }
  }

  /**
   * Reset the multiplier to base value
   */
  private resetMultiplier(): void {
    this.multiplier = MULTIPLIER.BASE;
    this.lastHitTime = 0;
    this.events.emit('multiplierUpdate', this.multiplier);
  }

  /**
   * Get the current score (for PauseScene quit flow)
   */
  public getScore(): number {
    return this.score;
  }

  /**
   * Enter danger mode when on last life
   */
  private enterDangerMode(): void {
    if (this.isInDanger) return;

    this.isInDanger = true;

    // Show danger indicator (pulsing red vignette)
    this.screenEffects.showDangerIndicator();

    // Add spark trail to all active balls
    this.ballPool.getActiveBalls().forEach((ball) => {
      ball.applyEffect(BallEffectType.DANGER_SPARKS);
    });

    // Enable slow-motion briefly when entering danger
    this.screenEffects.enableSlowMotion(0.7, 500);
  }

  /**
   * Exit danger mode
   */
  private exitDangerMode(): void {
    if (!this.isInDanger) return;

    this.isInDanger = false;

    // Hide danger indicator
    this.screenEffects.hideDangerIndicator();

    // Stop all danger spark effects
    this.ballPool.getActiveBalls().forEach((ball) => {
      ball.removeEffect(BallEffectType.DANGER_SPARKS);
    });

    // Ensure slow motion is disabled
    this.screenEffects.disableSlowMotion();
  }

  // ========== SAFETY NET (BOUNCE HOUSE) ==========

  /**
   * Handle safety net creation — set up physics collider with ball group
   */
  private onSafetyNetCreated(safetyNet: SafetyNet): void {
    // Clean up existing collider if any
    this.onSafetyNetDestroyed();

    // Use collider - let physics handle the bounce naturally (like brick collisions)
    this.safetyNetCollider = this.physics.add.collider(
      this.ballPool.getGroup(),
      safetyNet,
      this.handleSafetyNetBounce.bind(this) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  /**
   * Clean up safety net collider
   */
  private onSafetyNetDestroyed(): void {
    if (this.safetyNetCollider) {
      this.safetyNetCollider.destroy();
      this.safetyNetCollider = null;
    }
  }

  /**
   * Handle ball bouncing off the safety net
   */
  private handleSafetyNetBounce(
    _ballObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    netObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): void {
    const net = netObj as SafetyNet;

    // Guard: net may already have been consumed by another ball this frame
    if (!net.active) return;

    // Let physics handle the bounce naturally - don't modify velocity
    // This matches how brick collisions work

    // Play bounce SFX
    this.audioManager.playSFX(AUDIO.SFX.BOUNCE);

    // Consume the safety net (destroy with animation)
    this.powerUpSystem.consumeSafetyNet();
  }


  // ========== DEBUG METHODS ==========

  /**
   * DEBUG: Skip to a specific level (0-indexed)
   * Usage: GameDebug.skipToLevel(1) // Skip to level 2
   */
  private debugSkipToLevel(levelIndex: number): void {
    if (levelIndex < 0 || levelIndex >= LEVELS.length) {
      console.warn(`Invalid level index. Valid: 0-${LEVELS.length - 1}`);
      return;
    }

    // Clear any active power-ups and effects
    this.powerUpSystem.clear();
    this.events.emit('effectsCleared');
    this.exitDangerMode();

    // Reset paddle position and visual properties
    this.paddle.setPosition(GAME_WIDTH / 2, PLAY_AREA_Y + PLAYABLE_HEIGHT - 50);
    this.paddle.setScale(1);
    this.paddle.setAlpha(1);
    this.paddle.setRotation(0);

    // Load the new level
    this.loadLevel(levelIndex);
    this.resetBall();

    console.log(`Skipped to level ${levelIndex + 1}: ${LEVELS[levelIndex].name}`);
  }

  /**
   * DEBUG: Complete current level (trigger transition)
   * Usage: GameDebug.completeLevel()
   */
  private debugCompleteLevel(): void {
    // Destroy all remaining bricks
    this.bricks.clear(true, true);
    this.handleLevelComplete();
    console.log('Level completed via debug');
  }
}
