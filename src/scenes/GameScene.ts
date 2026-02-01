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
import { PowerUpType } from '../types/PowerUpTypes';
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
} from '../config/Constants';

export class GameScene extends Phaser.Scene {
  // Game objects
  private paddle!: Paddle;
  private ball!: Ball;
  private bricks!: Phaser.Physics.Arcade.StaticGroup;

  // Power-up and multi-ball systems
  private ballPool!: BallPool;
  private powerUpSystem!: PowerUpSystem;

  // Visual effect systems
  private particleSystem!: ParticleSystem;
  private screenEffects!: ScreenEffects;
  private powerUpFeedbackSystem!: PowerUpFeedbackSystem;
  private collisionHandler!: CollisionHandler;
  private electricArcSystem!: ElectricArcSystem;
  private dangerSparks: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private isInDanger: boolean = false;

  // Audio
  private audioManager!: AudioManager;
  private unsubscribeTrackChange: (() => void) | null = null;

  // Game state
  private score: number = 0;
  private lives: number = STARTING_LIVES;
  private currentLevelIndex: number = 0;
  private currentLevel!: LevelData;
  private isGameOver: boolean = false;
  private canLaunch: boolean = true;
  private lastDebugShowDropChance: boolean = false;

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

    // Set transparent background so CSS background shows through
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');

    // Set up world bounds for playable area only (offset by UI borders)
    // Ball can escape bottom (no collision on bottom edge)
    this.physics.world.setBounds(0, PLAY_AREA_Y, PLAYABLE_WIDTH, PLAYABLE_HEIGHT);
    this.physics.world.setBoundsCollision(true, true, true, false);

    // Create paddle
    this.paddle = new Paddle(this);

    // Create ball (positioned within playable area)
    this.ball = new Ball(this, PLAYABLE_WIDTH / 2, PLAY_AREA_Y + PLAYABLE_HEIGHT - 100);
    this.ball.attachToPaddle(this.paddle);

    // Create ball pool and add primary ball
    this.ballPool = new BallPool(this);
    this.ballPool.setPrimaryBall(this.ball);

    // Listen for extra ball loss to check if all balls are gone
    this.events.on('extraBallLost', this.checkAllBallsLost, this);

    // Create power-up system
    this.powerUpSystem = new PowerUpSystem(this, this.paddle, this.ball, this.ballPool);

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
        ballLaunched: this.ball.isLaunched(),
        canLaunch: this.canLaunch,
      }),
    };

    // Create visual effect systems
    this.particleSystem = new ParticleSystem(this);
    this.screenEffects = new ScreenEffects(this);
    this.powerUpFeedbackSystem = new PowerUpFeedbackSystem(this);

    // Initialize effect manager for the primary ball (for fireball, disco, etc.)
    this.ball.initEffectManager(this);

    // Get audio manager instance
    this.audioManager = AudioManager.getInstance();

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
        onLevelComplete: () => this.handleLevelComplete(),
        getBrickCount: () => this.bricks.countActive(),
      }
    );

    // Create brick group
    this.bricks = this.physics.add.staticGroup();

    // Create electric arc system for Electric Ball AOE
    this.electricArcSystem = new ElectricArcSystem(this, this.bricks);
    this.collisionHandler.setElectricArcSystem(this.electricArcSystem);

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

    // Emit initial state to UI
    this.events.emit('scoreUpdate', this.score);
    this.events.emit('livesUpdate', this.lives);
    this.events.emit('levelUpdate', this.currentLevel.name);

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
    this.events.off('extraBallLost', this.checkAllBallsLost, this);
    this.events.off('shutdown', this.shutdown, this);

    // Clean up physics world events (check if physics exists)
    this.physics?.world?.off('worldbounds', this.handleWorldBounds, this);

    // Clean up power-up system event forwarding (check if system exists)
    this.powerUpSystem?.events?.off('effectApplied');
    this.powerUpSystem?.events?.off('effectExpired');
    this.powerUpSystem?.events?.off('mysteryRevealed');

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

    // Update ball
    this.ball.update(time, delta);

    // Update power-up and ball pool systems
    this.powerUpSystem.update();
    this.ballPool.update();

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

    // Check if primary ball fell out of bounds
    // Only lose life if all balls are gone (multi-ball support)
    if (this.ball.active && this.ball.isLaunched() && this.ball.isOutOfBounds()) {
      this.ball.deactivate();

      // Check if any extra balls remain
      if (this.ballPool.getActiveCount() === 0) {
        this.handleBallLost();
      }
    }
  }

  private handleClick(): void {
    if (!this.ball.isLaunched() && this.canLaunch && !this.isGameOver) {
      this.launchBall();
    }
  }

  private launchBall(): void {
    this.ball.launch(this.currentLevel.ballSpeedMultiplier);
    this.events.emit('ballLaunched');
    this.canLaunch = false;
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

    // Update power-up system with current level's speed multiplier
    if (this.powerUpSystem) {
      this.powerUpSystem.setSpeedMultiplier(this.currentLevel.ballSpeedMultiplier);
    }
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

  /**
   * Check if all balls are lost after an extra ball falls out
   */
  private checkAllBallsLost(): void {
    // Don't lose lives during level transition
    if (this.isLevelTransitioning) return;

    if (this.ballPool.getActiveCount() === 0) {
      this.handleBallLost();
    }
  }

  private handleBallLost(): void {
    // Don't lose lives during level transition
    if (this.isLevelTransitioning) return;
    this.lives--;
    this.events.emit('livesUpdate', this.lives);

    // Play scratch sound for life lost
    this.audioManager.playSFX(AUDIO.SFX.SCRATCH);

    // Large screen shake
    this.cameras.main.shake(200, 0.01);

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
    // Clear any extra balls
    this.ballPool.clearExtras();

    // Reset primary ball (positioned within playable area)
    this.ball.reset();
    this.ball.activate(this.paddle.x, PLAY_AREA_Y + PLAYABLE_HEIGHT - 100);
    this.ball.attachToPaddle(this.paddle);
    this.canLaunch = true;
    this.events.emit('ballReset');
  }

  private isLevelTransitioning: boolean = false;

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

    // Clear power-ups and extra balls
    this.powerUpSystem.clear();
    this.ballPool.clearExtras();
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

    transitionManager.transitionToNextLevel(
      nextLevelNumber,
      this.bricks,
      this.paddle,
      this.ball,
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

    // Transition to game over scene
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

    // Transition to game over scene (with win state)
    this.time.delayedCall(500, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', { score: this.score, isWin: true });
    });
  }

  private addScore(points: number): void {
    this.score += points;
    this.events.emit('scoreUpdate', this.score);
  }

  /**
   * Enter danger mode when on last life with last ball
   */
  private enterDangerMode(): void {
    if (this.isInDanger) return;

    this.isInDanger = true;

    // Show danger indicator (pulsing red vignette)
    this.screenEffects.showDangerIndicator();

    // Add spark trail to ball
    this.dangerSparks = this.particleSystem.dangerSparks(this.ball);

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

    // Stop danger sparks
    this.particleSystem.stopDangerSparks(this.dangerSparks);
    this.dangerSparks = null;

    // Ensure slow motion is disabled
    this.screenEffects.disableSlowMotion();
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
