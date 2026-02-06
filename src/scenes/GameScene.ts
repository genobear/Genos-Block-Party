import Phaser from 'phaser';
import { Paddle } from '../objects/Paddle';
import { Ball } from '../objects/Ball';
import { Brick } from '../objects/Brick';
import { DrifterBrick } from '../objects/DrifterBrick';
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
import { MultiplierSystem } from '../systems/MultiplierSystem';
import { LifetimeStatsManager } from '../systems/LifetimeStatsManager';
import { EndlessModeManager } from '../systems/EndlessModeManager';
import { AchievementManager, Achievement } from '../systems/AchievementManager';
import { PowerUpType } from '../types/PowerUpTypes';
import { BrickType } from '../types/BrickTypes';
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
  COLORS,
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

  // Conga Line ghost collision tracking (prevent multiple hits per frame)
  private ghostHitBricks: Set<Brick> = new Set();

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

  // Multiplier system
  private multiplierSystem!: MultiplierSystem;

  // Lifetime stats tracking
  private statsManager!: LifetimeStatsManager;

  // Endless mode
  private isEndlessMode: boolean = false;
  private endlessModeManager!: EndlessModeManager;

  // Achievement tracking
  private achievementManager!: AchievementManager;
  private livesAtLevelStart: number = STARTING_LIVES;

  constructor() {
    super('GameScene');
  }

  init(data: { isEndlessMode?: boolean }): void {
    this.isEndlessMode = data?.isEndlessMode || false;
  }

  create(): void {
    // Get endless mode manager
    this.endlessModeManager = EndlessModeManager.getInstance();

    // Start endless session if in endless mode
    if (this.isEndlessMode) {
      this.endlessModeManager.startSession();
    }
    // Reset game state
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.currentLevelIndex = 0;
    this.isGameOver = false;
    this.isLevelTransitioning = false;
    this.canLaunch = true;

    // Initialize multiplier system
    this.multiplierSystem = new MultiplierSystem();

    // Initialize lifetime stats and record game start
    this.statsManager = LifetimeStatsManager.getInstance();
    this.statsManager.recordGameStart();

    // Initialize achievement manager and start session
    this.achievementManager = AchievementManager.getInstance();
    this.achievementManager.startSession(this.isEndlessMode);
    this.livesAtLevelStart = STARTING_LIVES;

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

    // Provide brick position callback for Spotlight power-up
    this.powerUpSystem.setBricksCallback(() => this.getActiveBrickPositions());

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
        onBrickDestroyed: () => this.statsManager.recordBrickDestroyed(),
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

    // Launch the UI scene with endless mode flag
    this.scene.launch('UIScene', { isEndlessMode: this.isEndlessMode });

    // Forward power-up events to UIScene
    this.powerUpSystem.events.on('effectApplied', (type: string, duration?: number, stackCount?: number) => {
      this.events.emit('effectApplied', type, duration, stackCount);

      // Track fireball stack for achievements
      if (type === PowerUpType.FIREBALL && stackCount !== undefined) {
        this.achievementManager.recordFireballStack(stackCount);
      }
    });
    this.powerUpSystem.events.on('effectExpired', (type: string) => {
      this.events.emit('effectExpired', type);
    });

    // Track power-up collection for lifetime stats
    this.powerUpSystem.events.on('collected', (type: string) => {
      this.statsManager.recordPowerUpCollected(type);
    });

    // Wire mystery reveal to feedback system
    this.powerUpSystem.events.on('mysteryRevealed', (actualType: PowerUpType) => {
      this.powerUpFeedbackSystem.revealMystery(actualType);
    });

    // Wire Bass Drop event - screen nuke: 1 damage to all bricks
    this.powerUpSystem.events.on('bassDrop', this.handleBassDrop, this);

    // Wire Confetti Cannon event - damage 5-8 random bricks
    this.powerUpSystem.events.on('confettiCannon', this.handleConfettiCannon, this);

    // Wire Dance Floor event - shuffle all bricks
    this.powerUpSystem.events.on('danceFloor', this.handleDanceFloor, this);

    // Listen for drifter brick escapes (they still count as cleared for level completion)
    this.events.on('drifterEscaped', this.handleDrifterEscaped, this);

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
    this.events.emit('multiplierUpdate', this.multiplierSystem.getValue());

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
    this.powerUpSystem?.events?.off('bassDrop', this.handleBassDrop, this);
    this.powerUpSystem?.events?.off('confettiCannon', this.handleConfettiCannon, this);
    this.powerUpSystem?.events?.off('danceFloor', this.handleDanceFloor, this);
    this.events?.off('drifterEscaped', this.handleDrifterEscaped, this);
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

    // Check conga line ghost collisions with bricks
    this.updateCongaLineCollisions();

    // Update multiplier decay
    const previousMultiplier = this.multiplierSystem.getValue();
    this.multiplierSystem.update(time, delta);
    if (this.multiplierSystem.getValue() !== previousMultiplier) {
      this.events.emit('multiplierUpdate', this.multiplierSystem.getValue());
    }

    // Track lifetime stats: play time and highest multiplier
    this.statsManager.updatePlayTime(delta);
    this.statsManager.updateHighestMultiplier(this.multiplierSystem.getValue());

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
    if (this.isGameOver) return;

    // Release any magneted balls first (DJ Scratch)
    const magnetedBalls = this.ballPool.getActiveBalls().filter((b) => b.isMagneted());
    if (magnetedBalls.length > 0) {
      magnetedBalls.forEach((ball) => {
        ball.releaseMagnet(this.speedManager.getEffectiveSpeed());
      });
      return;
    }

    // Can launch if there are any unlaunched balls
    const hasUnlaunchedBall = this.ballPool.getActiveBalls().some((b) => !b.isLaunched());
    if (hasUnlaunchedBall && this.canLaunch) {
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

    // Calculate brick grid offset to center it
    const totalWidth = BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING;
    const offsetX = (GAME_WIDTH - totalWidth) / 2 + BRICK_WIDTH / 2;

    if (this.isEndlessMode) {
      // Endless mode: use procedural generation
      const wave = this.endlessModeManager.getCurrentWave();
      const brickConfigs = this.endlessModeManager.generateWave(wave);

      // Create bricks from procedural data
      brickConfigs.forEach((brickConfig) => {
        const x = offsetX + brickConfig.x * (BRICK_WIDTH + BRICK_PADDING);
        const y = BRICK_ROWS_START_Y + brickConfig.y * (BRICK_HEIGHT + BRICK_PADDING);

        // Use DrifterBrick for drifter type, regular Brick otherwise
        const brick = brickConfig.type === BrickType.DRIFTER
          ? new DrifterBrick(this, x, y, brickConfig.health)
          : new Brick(this, x, y, brickConfig.type, brickConfig.health);
        this.bricks.add(brick);
      });

      // Emit wave update to UI
      const waveName = this.endlessModeManager.getWaveDisplayName(wave);
      this.events.emit('levelUpdate', waveName);
      this.events.emit('waveUpdate', wave);

      // Check for checkpoint wave
      if (this.endlessModeManager.isCheckpointWave()) {
        this.events.emit('checkpoint', this.endlessModeManager.getCheckpoint());
      }

      // Set speed multiplier based on wave
      const speedMultiplier = this.endlessModeManager.getSpeedMultiplier(wave);
      this.speedManager.setLevelMultiplier(speedMultiplier);

      // Use level music based on wave (cycle through levels 1-9)
      const musicLevel = ((wave - 1) % 9) + 1;
      this.audioManager.loadLevelMusic(musicLevel).catch(() => {
        // Music loading is optional
      });

      // Background based on wave (cycle through levels 1-10)
      const bgLevel = ((wave - 1) % 10) + 1;
      BackgroundManager.setLevelBackground(bgLevel);
    } else {
      // Story mode: use predefined levels
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

      // Create bricks from level data
      this.currentLevel.bricks.forEach((brickConfig) => {
        const x = offsetX + brickConfig.x * (BRICK_WIDTH + BRICK_PADDING);
        const y = BRICK_ROWS_START_Y + brickConfig.y * (BRICK_HEIGHT + BRICK_PADDING);

        // Use DrifterBrick for drifter type, regular Brick otherwise
        const brick = brickConfig.type === BrickType.DRIFTER
          ? new DrifterBrick(this, x, y, brickConfig.health)
          : new Brick(this, x, y, brickConfig.type, brickConfig.health);
        this.bricks.add(brick);
      });

      // Emit level update to UI
      this.events.emit('levelUpdate', this.currentLevel.name);

      // Set level speed multiplier on speed manager
      this.speedManager.setLevelMultiplier(this.currentLevel.ballSpeedMultiplier);
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

  // ========== CONGA LINE GHOST COLLISIONS ==========

  /**
   * Check for conga line ghost ball collisions with bricks
   * Ghosts pass through bricks but deal 1 damage on contact
   */
  private updateCongaLineCollisions(): void {
    // Clear the hit tracking set each frame
    this.ghostHitBricks.clear();

    // Check all active balls for conga line ghosts
    this.ballPool.getActiveBalls().forEach((ball) => {
      if (!ball.isCongaLineActive()) return;

      const ghosts = ball.getCongaGhosts();
      ghosts.forEach((ghost) => {
        if (!ghost.visible) return;

        // Get ghost bounds
        const ghostBounds = ghost.getBounds();

        // Check overlap with all active bricks
        this.bricks.children.iterate((child) => {
          const brick = child as Brick;
          if (!brick || !brick.active) return true;

          // Skip if we already hit this brick this frame
          if (this.ghostHitBricks.has(brick)) return true;

          // Check bounds overlap
          const brickBounds = brick.getBounds();
          if (Phaser.Geom.Intersects.RectangleToRectangle(ghostBounds, brickBounds)) {
            // Mark brick as hit this frame
            this.ghostHitBricks.add(brick);

            // Deal damage to brick
            this.damageBrickFromGhost(brick);
          }

          return true;
        });
      });
    });
  }

  /**
   * Apply damage to a brick from a conga line ghost
   * Similar to handleBrickDestroyed but simplified for ghost hits
   */
  private damageBrickFromGhost(brick: Brick): void {
    // Increment multiplier
    this.incrementMultiplier();

    // Apply 1 damage
    const destroyed = brick.takeDamage(1);

    if (destroyed) {
      // Track brick destroyed for lifetime stats
      this.statsManager.recordBrickDestroyed();

      // Score for destroyed brick
      this.addScore(brick.getScoreValue());

      // Roll for power-up drop (ghost hits are like AOE - maybe add penalty?)
      if (brick.shouldDropPowerUp(false)) {
        const dropPos = brick.getPowerUpDropPosition();
        this.powerUpSystem.spawn(dropPos.x, dropPos.y);
      }

      // Audio for destroyed brick
      this.audioManager.playSFX(AUDIO.SFX.HORN);

      // Confetti burst
      const brickColor = this.getBrickColorForParticles(brick.getType());
      this.particleSystem.burstConfetti(brick.x, brick.y, brickColor);

      // Immediately deactivate for countActive()
      brick.setActive(false);
      brick.disableBody(true);

      // Play destroy animation
      brick.playDestroyAnimation();

      // Check level completion
      if (this.bricks.countActive() === 0) {
        this.handleLevelComplete();
      }
    } else {
      // Hit but not destroyed - play pop sound and add small score
      this.audioManager.playSFX(AUDIO.SFX.POP);
      this.addScore(brick.getScoreValue());
    }
  }

  private handleAllBallsLost(): void {
    // Don't lose lives during level transition
    if (this.isLevelTransitioning) return;
    this.lives--;
    this.events.emit('livesUpdate', this.lives);

    // Track life lost for perfect game detection
    this.statsManager.recordLifeLost();

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

    // Record level completion for achievements
    if (this.isEndlessMode) {
      const currentWave = this.endlessModeManager.getCurrentWave();
      this.achievementManager.recordEndlessWave(currentWave);
    } else {
      // Calculate if lives were lost this level
      const livesLostThisLevel = this.lives < this.livesAtLevelStart;
      this.achievementManager.recordLevelComplete(this.currentLevelIndex + 1, livesLostThisLevel);
    }

    // Clear power-ups and all balls
    this.powerUpSystem.clear();
    this.ballPool.clearAll();
    this.events.emit('effectsCleared');

    if (this.isEndlessMode) {
      // Endless mode: advance to next wave (infinite)
      this.endlessModeManager.nextWave();

      // Transition to next wave with animation
      this.time.delayedCall(800, () => {
        this.transitionToNextWave();
      });
    } else {
      // Story mode: check if there are more levels
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

        // Track lives at start of this level for flawless achievement detection
        this.livesAtLevelStart = this.lives;

        // Allow new transitions
        this.isLevelTransitioning = false;
      }
    );
  }

  private transitionToNextWave(): void {
    const nextWave = this.endlessModeManager.getCurrentWave();
    const transitionManager = TransitionManager.getInstance();
    transitionManager.init(this);

    // Get any active ball for transition animation (may be null)
    const activeBalls = this.ballPool.getActiveBalls();
    const transitionBall = activeBalls.length > 0 ? activeBalls[0] : null;

    // Use level number based on wave for visual consistency (cycle 1-10)
    const displayLevel = ((nextWave - 1) % 10) + 1;

    transitionManager.transitionToNextLevel(
      displayLevel,
      this.bricks,
      this.paddle,
      transitionBall,
      () => {
        // Reset paddle visual properties and position
        this.paddle.setScale(1);
        this.paddle.setAlpha(1);
        this.paddle.setRotation(0);
        this.paddle.setPosition(GAME_WIDTH / 2, PLAY_AREA_Y + PLAYABLE_HEIGHT - 50);

        // Load the next wave (endless mode uses wave number, not level index)
        this.loadLevel(0); // Index doesn't matter for endless mode
        this.resetBall();

        // Track lives at start of this wave for achievement detection
        this.livesAtLevelStart = this.lives;

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

    // End endless mode session if active
    if (this.isEndlessMode) {
      this.endlessModeManager.endSession();
    }

    // End achievement session and check for newly unlocked achievements
    this.achievementManager.endSession(this.score, this.currentLevelIndex + 1);
    const newAchievements = this.achievementManager.checkAchievements();
    newAchievements.forEach((achievement) => {
      this.showAchievementToast(achievement);
    });

    // Emit game over event
    this.events.emit('gameOver');

    // Transition to game over scene (currency awarded there)
    this.time.delayedCall(500, () => {
      this.scene.stop('UIScene');

      if (this.isEndlessMode) {
        const waveReached = this.endlessModeManager.getCurrentWave();
        const checkpoint = this.endlessModeManager.getCheckpoint();
        this.scene.start('GameOverScene', {
          score: this.score,
          isWin: false,
          isEndlessMode: true,
          waveReached,
          checkpoint,
        });
      } else {
        this.scene.start('GameOverScene', {
          score: this.score,
          isWin: false,
          level: this.currentLevelIndex + 1,
          isEndlessMode: false,
        });
      }
    });
  }

  private gameWin(): void {
    this.isGameOver = true;

    // Stop level music
    this.audioManager.stopMusic();

    // Clean up effects
    this.exitDangerMode();
    this.screenEffects.destroy();

    // Unlock endless mode on campaign completion
    this.endlessModeManager.unlockEndlessMode();

    // End achievement session and check for newly unlocked achievements
    this.achievementManager.endSession(this.score, 10);
    const newAchievements = this.achievementManager.checkAchievements();
    newAchievements.forEach((achievement) => {
      this.showAchievementToast(achievement);
    });

    // Emit game win event
    this.events.emit('gameWin');

    // Transition to game over scene (currency awarded there)
    this.time.delayedCall(500, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        score: this.score,
        isWin: true,
        level: 10,
        isEndlessMode: false,
        justUnlockedEndless: true,
      });
    });
  }

  private addScore(points: number): void {
    const multipliedPoints = this.multiplierSystem.applyToScore(points);
    this.score += multipliedPoints;
    this.events.emit('scoreUpdate', this.score);
  }

  /**
   * Increment the score multiplier on each brick hit
   */
  private incrementMultiplier(): void {
    this.multiplierSystem.increment(this.time.now);
    const currentMultiplier = this.multiplierSystem.getValue();
    this.events.emit('multiplierUpdate', currentMultiplier);

    // Track multiplier for achievements
    this.achievementManager.recordMultiplier(currentMultiplier);
  }

  /**
   * Reset the multiplier to base value
   */
  private resetMultiplier(): void {
    this.multiplierSystem.reset();
    this.events.emit('multiplierUpdate', this.multiplierSystem.getValue());
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

  /**
   * Handle Bass Drop power-up: apply 1 damage to ALL active bricks on screen
   * Rolls for power-up drops, handles destruction, checks level completion
   */
  private handleBassDrop(): void {
    // Massive screen shake + purple flash
    this.cameras.main.shake(400, 0.02);

    // Play airhorn SFX for dramatic bass drop impact
    this.audioManager.playSFX(AUDIO.SFX.AIRHORN);

    // Iterate all active bricks and apply 1 damage
    const bricksToProcess: Brick[] = [];
    this.bricks.children.iterate((child) => {
      const brick = child as Brick;
      if (brick && brick.active) {
        bricksToProcess.push(brick);
      }
      return true;
    });

    bricksToProcess.forEach((brick) => {
      // Increment multiplier for each brick hit
      this.incrementMultiplier();

      // Score for each brick hit
      this.addScore(brick.getScoreValue());

      // Roll for power-up drop before applying damage (AOE penalty applies)
      if (brick.shouldDropPowerUp(true)) {
        const dropPos = brick.getPowerUpDropPosition();
        this.powerUpSystem.spawn(dropPos.x, dropPos.y);
      }

      // Apply 1 damage
      const isDestroyed = brick.takeDamage(1);

      if (isDestroyed) {
        // Track brick destroyed for lifetime stats
        this.statsManager.recordBrickDestroyed();

        // Audio for destroyed brick
        this.audioManager.playSFX(AUDIO.SFX.HORN);

        // Confetti burst
        const brickColor = this.getBrickColorForParticles(brick.getType());
        this.particleSystem.burstConfetti(brick.x, brick.y, brickColor);

        // Immediately deactivate for countActive()
        brick.setActive(false);
        brick.disableBody(true);

        // Play destroy animation
        brick.playDestroyAnimation();
      } else {
        // Hit but not destroyed
        this.audioManager.playSFX(AUDIO.SFX.POP);
      }
    });

    // Check level completion after all bricks processed
    if (this.bricks.countActive() === 0) {
      this.handleLevelComplete();
    }
  }

  // ========== CONFETTI CANNON ==========

  /**
   * Handle Confetti Cannon power-up: fire confetti at 5-8 random bricks for 1 damage each
   */
  private handleConfettiCannon(): void {
    // Collect all active bricks
    const activeBricks: Brick[] = [];
    this.bricks.children.iterate((child) => {
      const brick = child as Brick;
      if (brick && brick.active) {
        activeBricks.push(brick);
      }
      return true;
    });

    // Shuffle and pick 5-8 random bricks
    const targetCount = Phaser.Math.Between(5, 8);
    Phaser.Utils.Array.Shuffle(activeBricks);
    const targets = activeBricks.slice(0, Math.min(targetCount, activeBricks.length));

    // Brief camera shake
    this.cameras.main.shake(150, 0.01);

    // Play party horn SFX
    this.audioManager.playSFX(AUDIO.SFX.AIRHORN);

    // Create confetti particle burst from paddle
    this.createConfettiEffect();

    // Apply 1 damage to each target brick
    targets.forEach((brick) => {
      this.incrementMultiplier();
      const destroyed = brick.takeDamage(1);
      if (destroyed) {
        this.handleBrickDestroyed(brick);
      } else {
        // Visual flash on hit brick
        this.tweens.add({
          targets: brick,
          alpha: { from: 0.3, to: 1 },
          duration: 200,
        });
      }
    });

    // Check level completion after all bricks processed
    if (this.bricks.countActive() === 0) {
      this.handleLevelComplete();
    }
  }

  /**
   * Create colorful confetti burst effect from paddle position
   */
  private createConfettiEffect(): void {
    const paddleX = this.paddle.x;
    const paddleY = this.paddle.y;

    // Colorful confetti colors
    const colors = [0xff1493, 0x00ff00, 0xffff00, 0x00ffff, 0xff6600, 0xff00ff];

    for (let i = 0; i < 30; i++) {
      const confetti = this.add.rectangle(
        paddleX + Phaser.Math.Between(-20, 20),
        paddleY,
        Phaser.Math.Between(4, 8),
        Phaser.Math.Between(4, 8),
        Phaser.Utils.Array.GetRandom(colors)
      );

      this.tweens.add({
        targets: confetti,
        x: confetti.x + Phaser.Math.Between(-100, 100),
        y: confetti.y - Phaser.Math.Between(100, 300),
        angle: Phaser.Math.Between(-180, 180),
        alpha: { from: 1, to: 0 },
        duration: Phaser.Math.Between(500, 1000),
        ease: 'Quad.easeOut',
        onComplete: () => confetti.destroy(),
      });
    }
  }

  // ========== DANCE FLOOR ==========

  /**
   * Handle Dance Floor power-up: shuffle all bricks to random positions on the grid
   * Bricks animate smoothly to their new positions with disco-themed effects
   */
  private handleDanceFloor(): void {
    // Collect all active bricks
    const activeBricks: Brick[] = [];
    this.bricks.children.iterate((child) => {
      const brick = child as Brick;
      if (brick && brick.active) {
        activeBricks.push(brick);
      }
      return true;
    });

    if (activeBricks.length === 0) return;

    // Disco screen flash (hot pink then white)
    this.cameras.main.flash(150, 255, 20, 147); // Hot pink flash
    this.time.delayedCall(100, () => {
      this.cameras.main.flash(100, 255, 255, 255); // White flash
    });

    // Play party SFX
    this.audioManager.playSFX(AUDIO.SFX.AIRHORN);

    // Calculate grid parameters (same math as loadLevel)
    const totalWidth = BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING;
    const offsetX = (GAME_WIDTH - totalWidth) / 2 + BRICK_WIDTH / 2;

    // Generate all valid grid positions (10 cols x 12 rows gives plenty of space)
    const maxRows = 12;
    const allPositions: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const x = offsetX + col * (BRICK_WIDTH + BRICK_PADDING);
        const y = BRICK_ROWS_START_Y + row * (BRICK_HEIGHT + BRICK_PADDING);
        allPositions.push({ x, y });
      }
    }

    // Fisher-Yates shuffle the positions
    for (let i = allPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
    }

    // Assign unique random positions to each brick and animate
    activeBricks.forEach((brick, index) => {
      const newPos = allPositions[index];

      // Animate brick to new position
      this.tweens.add({
        targets: brick,
        x: newPos.x,
        y: newPos.y,
        duration: 450,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Update physics body after animation (StaticBody needs manual sync)
          const body = brick.body as Phaser.Physics.Arcade.StaticBody;
          if (body) {
            body.updateFromGameObject();
          }
        },
      });

      // Add a little rotation wobble for fun
      this.tweens.add({
        targets: brick,
        angle: { from: Phaser.Math.Between(-15, 15), to: 0 },
        duration: 450,
        ease: 'Sine.easeOut',
      });
    });

    // Brief camera shake for impact
    this.cameras.main.shake(200, 0.008);
  }

  /**
   * Handle brick destruction for Confetti Cannon hits
   */
  private handleBrickDestroyed(brick: Brick): void {
    // Track brick destroyed for lifetime stats
    this.statsManager.recordBrickDestroyed();

    // Score for destroyed brick
    this.addScore(brick.getScoreValue());

    // Roll for power-up drop
    if (brick.shouldDropPowerUp(false)) {
      const dropPos = brick.getPowerUpDropPosition();
      this.powerUpSystem.spawn(dropPos.x, dropPos.y);
    }

    // Audio for destroyed brick
    this.audioManager.playSFX(AUDIO.SFX.HORN);

    // Confetti burst
    const brickColor = this.getBrickColorForParticles(brick.getType());
    this.particleSystem.burstConfetti(brick.x, brick.y, brickColor);

    // Immediately deactivate for countActive()
    brick.setActive(false);
    brick.disableBody(true);

    // Play destroy animation
    brick.playDestroyAnimation();
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

  /**
   * Get positions of all active bricks (for Spotlight homing)
   */
  private getActiveBrickPositions(): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    this.bricks.children.iterate((child) => {
      const brick = child as Brick;
      if (brick && brick.active) {
        positions.push({ x: brick.x, y: brick.y });
      }
      return true;
    });
    return positions;
  }

  /**
   * Handle drifter brick escape - brick floated to the top without being hit
   * No points awarded, but still counts toward level completion
   */
  private handleDrifterEscaped(_brick: DrifterBrick): void {
    // Brick is already being destroyed by DrifterBrick.escape()
    // Just need to check level completion after it's destroyed
    // Use a short delay to ensure the brick has been removed from the group
    this.time.delayedCall(50, () => {
      if (this.bricks.countActive() === 0) {
        this.handleLevelComplete();
      }
    });
  }

  /**
   * Get brick color for particle effects (used by bass drop handler)
   */
  private getBrickColorForParticles(type: BrickType): number {
    switch (type) {
      case BrickType.PRESENT: return COLORS.PRESENT;
      case BrickType.PINATA: return COLORS.PINATA;
      case BrickType.BALLOON: return COLORS.BALLOON;
      case BrickType.DRIFTER: return COLORS.DRIFTER;
      default: return 0xffffff;
    }
  }

  // ========== ACHIEVEMENT TOAST ==========

  /**
   * Show a toast notification when an achievement is unlocked
   */
  private showAchievementToast(achievement: Achievement): void {
    const centerX = GAME_WIDTH / 2;
    const toastY = 150;

    // Create toast background
    const toastBg = this.add.rectangle(centerX, toastY, 350, 70, 0x1a4d1a, 0.95);
    toastBg.setStrokeStyle(3, 0xffd700);
    toastBg.setDepth(1000);

    // Trophy icon
    const trophyText = this.add.text(centerX - 140, toastY, '🏆', {
      font: '32px Arial',
    }).setOrigin(0.5).setDepth(1001);

    // Achievement title
    const titleText = this.add.text(centerX - 100, toastY - 12, 'ACHIEVEMENT UNLOCKED!', {
      font: 'bold 14px Arial',
      color: '#ffd700',
    }).setOrigin(0, 0.5).setDepth(1001);

    // Achievement name
    const nameText = this.add.text(centerX - 100, toastY + 12, achievement.name, {
      font: 'bold 16px Arial',
      color: '#4ade80',
    }).setOrigin(0, 0.5).setDepth(1001);

    // Coins earned
    const coinsText = this.add.text(centerX + 140, toastY, `+${achievement.coins} 🪙`, {
      font: 'bold 16px Arial',
      color: '#ffd700',
    }).setOrigin(1, 0.5).setDepth(1001);

    // Play chime sound
    this.audioManager.playSFX(AUDIO.SFX.CHIME);

    // Animate in
    const elements = [toastBg, trophyText, titleText, nameText, coinsText];
    elements.forEach((el) => {
      el.setAlpha(0);
      el.setScale(0.5);
    });

    this.tweens.add({
      targets: elements,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Animate out after 3 seconds
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: elements,
        alpha: 0,
        y: toastY - 50,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: () => {
          elements.forEach((el) => el.destroy());
        },
      });
    });
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
