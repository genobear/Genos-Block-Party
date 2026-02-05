import Phaser from 'phaser';
import { Ball } from '../objects/Ball';
import { Brick } from '../objects/Brick';
import { Paddle } from '../objects/Paddle';
import { PowerUp } from '../objects/PowerUp';
import { PowerUpSystem } from './PowerUpSystem';
import { ParticleSystem } from './ParticleSystem';
import { PowerUpFeedbackSystem } from './PowerUpFeedbackSystem';
import { AudioManager } from './AudioManager';
import { ElectricArcSystem } from './ElectricArcSystem';
import { BrickType } from '../types/BrickTypes';
import {
  COLORS,
  AUDIO,
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BRICK_COLS,
  BRICK_ROWS_START_Y,
  GAME_WIDTH,
} from '../config/Constants';

/**
 * Collision callback result for brick hits
 */
export interface BrickCollisionResult {
  destroyed: boolean;
  droppedPowerUp: boolean;
}

/**
 * CollisionHandler - Centralized collision logic for all game object interactions
 *
 * Extracted from GameScene to improve maintainability and testability.
 * Each collision type has a clear, single-purpose handler method.
 */
export class CollisionHandler {
  private scene: Phaser.Scene;
  private powerUpSystem: PowerUpSystem;
  private particleSystem: ParticleSystem;
  private powerUpFeedbackSystem: PowerUpFeedbackSystem;
  private audioManager: AudioManager;
  private electricArcSystem: ElectricArcSystem | null = null;
  private bricks: Phaser.Physics.Arcade.StaticGroup | null = null;
  private gridOffsetX: number = 0;

  // Callbacks for game state changes
  private onScoreChange: (points: number) => void;
  private onBrickHit: () => void;
  private onLevelComplete: () => void;
  private getBrickCount: () => number;

  constructor(
    scene: Phaser.Scene,
    powerUpSystem: PowerUpSystem,
    particleSystem: ParticleSystem,
    powerUpFeedbackSystem: PowerUpFeedbackSystem,
    audioManager: AudioManager,
    callbacks: {
      onScoreChange: (points: number) => void;
      onBrickHit: () => void;
      onLevelComplete: () => void;
      getBrickCount: () => number;
    }
  ) {
    this.scene = scene;
    this.powerUpSystem = powerUpSystem;
    this.particleSystem = particleSystem;
    this.powerUpFeedbackSystem = powerUpFeedbackSystem;
    this.audioManager = audioManager;
    this.onScoreChange = callbacks.onScoreChange;
    this.onBrickHit = callbacks.onBrickHit;
    this.onLevelComplete = callbacks.onLevelComplete;
    this.getBrickCount = callbacks.getBrickCount;
  }

  /**
   * Set the ElectricArcSystem (called after bricks are created)
   */
  setElectricArcSystem(system: ElectricArcSystem): void {
    this.electricArcSystem = system;
  }

  /**
   * Set the bricks group (needed for bomb 3x3 lookup)
   */
  setBricksGroup(bricks: Phaser.Physics.Arcade.StaticGroup): void {
    this.bricks = bricks;
    const totalWidth = BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING;
    this.gridOffsetX = (GAME_WIDTH - totalWidth) / 2 + BRICK_WIDTH / 2;
  }

  /**
   * Handle ball-paddle collision with custom bounce physics
   */
  handleBallPaddle(
    obj1: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    obj2: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const ball = (obj1 instanceof Ball) ? obj1 : (obj2 instanceof Ball) ? obj2 : null;
    const paddle = (obj1 instanceof Paddle) ? obj1 : (obj2 instanceof Paddle) ? obj2 : null;

    if (!ball || !paddle) return;

    const ballBody = ball.body as Phaser.Physics.Arcade.Body;

    // Only process if ball is moving downward (toward paddle)
    if (ballBody.velocity.y <= 0) return;

    // DJ Scratch (Magnet): stick ball to paddle instead of bouncing
    if (this.powerUpSystem.isMagnetActive() && !ball.isMagneted()) {
      ball.magnetToPaddle(paddle);
      this.audioManager.playSFX(AUDIO.SFX.SCRATCH);
      this.scene.cameras.main.shake(30, 0.002);
      return;
    }

    // Ensure ball is above paddle to prevent sticking
    ball.y = paddle.y - paddle.displayHeight / 2 - ballBody.halfHeight - 1;

    // Apply custom bounce angle based on hit position
    ball.bounceOffPaddle(paddle);

    // Audio and visual feedback
    this.audioManager.playSFX(AUDIO.SFX.BOUNCE);
    this.scene.cameras.main.shake(30, 0.002);
  }

  /**
   * Process callback for ball-brick collision (determines if physics bounce should occur)
   * Returns false for fireball piercing, true for normal bounce
   */
  shouldProcessBrickCollision(
    obj1: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    obj2: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): boolean {
    const ball = (obj1 instanceof Ball) ? obj1 : (obj2 instanceof Ball) ? obj2 : null;
    const brick = (obj1 instanceof Brick) ? obj1 : (obj2 instanceof Brick) ? obj2 : null;
    if (!ball || !brick) return true;

    // FireBall piercing: only pierce if fireball level >= brick health
    if (ball.isFireballActive()) {
      const canPierce = ball.getFireballLevel() >= brick.getHealth();

      if (canPierce) {
        // Pierce through - manually handle collision, skip physics bounce
        this.handleBallBrick(obj1, obj2);
        return false;
      }
      // Can't pierce - bounce normally
    }

    return true;
  }

  /**
   * Handle ball-brick collision with damage, scoring, particles, and power-up drops
   */
  handleBallBrick(
    obj1: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    obj2: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): BrickCollisionResult {
    const ball = (obj1 instanceof Ball) ? obj1 : (obj2 instanceof Ball) ? obj2 : null;
    const brick = (obj1 instanceof Brick) ? obj1 : (obj2 instanceof Brick) ? obj2 : null;

    if (!ball || !brick) {
      return { destroyed: false, droppedPowerUp: false };
    }

    // Register collision to prevent immediate velocity modifications
    ball.registerCollision();

    // Calculate damage based on fireball level
    const isFireball = ball.isFireballActive();
    const damage = isFireball ? ball.getFireballLevel() : 1;

    // Increment multiplier (before scoring so it applies)
    this.onBrickHit();

    // Add score (multiplier is applied in GameScene.addScore)
    this.onScoreChange(brick.getScoreValue());

    // Trigger Electric Ball AOE if active (triggers on every hit, not just destruction)
    if (ball.isElectricBallActive()) {
      this.processElectricAOE(brick);
    }

    // Trigger Party Popper 3x3 explosion if armed (one-shot, consumed on use)
    if (ball.hasBomb()) {
      this.processBombExplosion(brick);
      ball.clearBomb();
      this.powerUpSystem.onBombDetonated();
    }

    // Roll for drops BEFORE applying damage (each damage point rolls independently)
    const dropsToSpawn = brick.rollDropsForDamage(damage, false);

    // Spawn power-ups from this damage event
    if (dropsToSpawn > 0) {
      const dropPos = brick.getPowerUpDropPosition();
      for (let i = 0; i < dropsToSpawn; i++) {
        // Spread horizontally to prevent stacking
        const offsetX = (i - (dropsToSpawn - 1) / 2) * 15;
        this.powerUpSystem.spawn(dropPos.x + offsetX, dropPos.y);
      }
    }

    // Apply damage to the brick
    const isDestroyed = brick.takeDamage(damage);
    const droppedPowerUp = dropsToSpawn > 0;

    if (isDestroyed) {
      this.processBrickDestroyed(brick, isFireball, ball.getFireballLevel());
    } else {
      this.processBrickHit();
    }

    return { destroyed: isDestroyed, droppedPowerUp };
  }

  /**
   * Process a destroyed brick (audio, particles, level check)
   * Note: Power-up drops are now handled before takeDamage() in handleBallBrick()
   */
  private processBrickDestroyed(brick: Brick, isFireball: boolean, fireballLevel: number): void {
    // Audio
    this.audioManager.playSFX(AUDIO.SFX.HORN);

    // Screen shake scales with fireball level
    const shakeIntensity = isFireball ? 0.004 + (fireballLevel * 0.002) : 0.004;
    this.scene.cameras.main.shake(50, shakeIntensity);

    // Confetti burst at brick position
    const brickColor = this.getBrickColor(brick.getType());
    this.particleSystem.burstConfetti(brick.x, brick.y, brickColor);

    // Immediately deactivate so countActive() works correctly
    brick.setActive(false);
    brick.disableBody(true);

    // Check if level is complete (before animation finishes)
    const levelComplete = this.getBrickCount() === 0;

    // Play destroy animation then handle level completion
    brick.playDestroyAnimation(() => {
      if (levelComplete) {
        this.onLevelComplete();
      }
    });
  }

  /**
   * Process a brick hit (not destroyed)
   */
  private processBrickHit(): void {
    this.audioManager.playSFX(AUDIO.SFX.POP);
    this.scene.cameras.main.shake(30, 0.002);
  }

  /**
   * Process Electric Ball AOE damage to adjacent bricks
   */
  private processElectricAOE(sourceBrick: Brick): void {
    if (!this.electricArcSystem) return;

    // Get adjacent bricks and trigger arc visuals
    const adjacentBricks = this.electricArcSystem.triggerAOE(sourceBrick);

    // Apply damage after arc animation delay
    const damageDelay = ElectricArcSystem.getDamageDelay();

    adjacentBricks.forEach((brick) => {
      this.scene.time.delayedCall(damageDelay, () => {
        if (!brick || !brick.active) return;

        // Increment multiplier for AOE hits too
        this.onBrickHit();

        // Score for AOE hits (50% of normal value)
        this.onScoreChange(Math.floor(brick.getScoreValue() * 0.5));

        // Roll for drop BEFORE damage (with AOE penalty via isAOE=true)
        if (brick.shouldDropPowerUp(true)) {
          const dropPos = brick.getPowerUpDropPosition();
          this.powerUpSystem.spawn(dropPos.x, dropPos.y);
        }

        // Apply 1 damage to adjacent brick
        const isDestroyed = brick.takeDamage(1);

        if (isDestroyed) {
          this.processAOEBrickDestroyed(brick);
        } else {
          // Just play hit sound
          this.audioManager.playSFX(AUDIO.SFX.POP);
        }
      });
    });
  }

  /**
   * Process an AOE-destroyed brick (audio, particles, level check)
   * Note: Power-up drops are now handled before takeDamage() in processElectricAOE()
   */
  private processAOEBrickDestroyed(brick: Brick): void {
    // Audio
    this.audioManager.playSFX(AUDIO.SFX.HORN);

    // Screen shake (less intense than direct hit)
    this.scene.cameras.main.shake(30, 0.003);

    // Confetti burst at brick position
    const brickColor = this.getBrickColor(brick.getType());
    this.particleSystem.burstConfetti(brick.x, brick.y, brickColor);

    // Immediately deactivate
    brick.setActive(false);
    brick.disableBody(true);

    // Check if level is complete
    const levelComplete = this.getBrickCount() === 0;

    // Play destroy animation
    brick.playDestroyAnimation(() => {
      if (levelComplete) {
        this.onLevelComplete();
      }
    });
  }

  /**
   * Handle power-up collection
   */
  handlePowerUpCollect(
    obj1: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    obj2: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const powerUp = (obj1 instanceof PowerUp) ? obj1 : (obj2 instanceof PowerUp) ? obj2 : null;

    // Check if already collected to prevent double-collection during animation
    if (!powerUp || !powerUp.active || powerUp.isCollected()) return;

    // Mark as collected IMMEDIATELY (before animation starts)
    powerUp.markCollected();

    // Audio
    this.audioManager.playSFX(AUDIO.SFX.CHIME);

    // Trigger consolidated feedback (particles, screen effect, popup text)
    const type = powerUp.getType();
    this.powerUpFeedbackSystem.onCollect(type, powerUp.x, powerUp.y);

    // Collect the power-up (applies game effect)
    this.powerUpSystem.collect(powerUp);
  }

  // ========== PARTY POPPER (3x3 BOMB) ==========

  /**
   * Process 3x3 bomb explosion centred on the hit brick.
   */
  private processBombExplosion(sourceBrick: Brick): void {
    const adjacentBricks = this.findBricks3x3(sourceBrick);

    // Heavy screen shake
    this.scene.cameras.main.shake(150, 0.012);

    // Explosion particles at source
    this.createExplosionParticles(sourceBrick.x, sourceBrick.y);

    // Damage each adjacent brick with slight cascade delay
    adjacentBricks.forEach((brick, index) => {
      this.scene.time.delayedCall(index * 30, () => {
        if (!brick || !brick.active) return;

        this.onBrickHit();
        this.onScoreChange(Math.floor(brick.getScoreValue() * 0.75));

        if (brick.shouldDropPowerUp(true)) {
          const dropPos = brick.getPowerUpDropPosition();
          this.powerUpSystem.spawn(dropPos.x, dropPos.y);
        }

        const isDestroyed = brick.takeDamage(1);
        this.particleSystem.burstConfetti(brick.x, brick.y, this.getBrickColor(brick.getType()));

        if (isDestroyed) {
          this.processAOEBrickDestroyed(brick);
        } else {
          this.audioManager.playSFX(AUDIO.SFX.POP);
        }
      });
    });
  }

  /**
   * Find bricks in a 3x3 grid around the source (excluding source itself).
   */
  private findBricks3x3(source: Brick): Brick[] {
    if (!this.bricks) return [];

    const sourceGrid = this.worldToGrid(source.x, source.y);
    const offsets: { dx: number; dy: number }[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        offsets.push({ dx, dy });
      }
    }

    const result: Brick[] = [];
    this.bricks.children.iterate((child: Phaser.GameObjects.GameObject) => {
      const brick = child as Brick;
      if (!brick || !brick.active || brick === source) return true;

      const brickGrid = this.worldToGrid(brick.x, brick.y);
      for (const offset of offsets) {
        if (
          brickGrid.x === sourceGrid.x + offset.dx &&
          brickGrid.y === sourceGrid.y + offset.dy
        ) {
          result.push(brick);
          break;
        }
      }
      return true;
    });

    return result;
  }

  /**
   * Convert world coordinates to grid coordinates.
   */
  private worldToGrid(worldX: number, worldY: number): { x: number; y: number } {
    const gridX = Math.round((worldX - this.gridOffsetX) / (BRICK_WIDTH + BRICK_PADDING));
    const gridY = Math.round((worldY - BRICK_ROWS_START_Y) / (BRICK_HEIGHT + BRICK_PADDING));
    return { x: gridX, y: gridY };
  }

  /**
   * Create explosion particles at position.
   */
  private createExplosionParticles(x: number, y: number): void {
    const particles = this.scene.add.particles(x, y, 'particle-flame', {
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      quantity: 20,
      tint: [0xff4500, 0xff6600, 0xffaa00, 0xffcc00, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });

    particles.explode();
    this.scene.time.delayedCall(600, () => particles.destroy());
  }

  /**
   * Get the color for a brick type (for particle effects)
   */
  private getBrickColor(type: BrickType): number {
    switch (type) {
      case BrickType.PRESENT:
        return COLORS.PRESENT;
      case BrickType.PINATA:
        return COLORS.PINATA;
      case BrickType.BALLOON:
        return COLORS.BALLOON;
      default:
        return 0xffffff;
    }
  }
}
