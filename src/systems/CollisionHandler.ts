import Phaser from 'phaser';
import { Ball } from '../objects/Ball';
import { Brick } from '../objects/Brick';
import { Paddle } from '../objects/Paddle';
import { PowerUp } from '../objects/PowerUp';
import { PowerUpSystem } from './PowerUpSystem';
import { ParticleSystem } from './ParticleSystem';
import { PowerUpFeedbackSystem } from './PowerUpFeedbackSystem';
import { AudioManager } from './AudioManager';
import { BrickType } from '../types/BrickTypes';
import { COLORS, AUDIO } from '../config/Constants';

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

  // Callbacks for game state changes
  private onScoreChange: (points: number) => void;
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
    this.onLevelComplete = callbacks.onLevelComplete;
    this.getBrickCount = callbacks.getBrickCount;
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

    // Calculate damage based on fireball level
    const isFireball = ball.isFireballActive();
    const damage = isFireball ? ball.getFireballLevel() : 1;

    // Add score
    this.onScoreChange(brick.getScoreValue());

    // Apply damage to the brick
    const isDestroyed = brick.takeDamage(damage);
    let droppedPowerUp = false;

    if (isDestroyed) {
      droppedPowerUp = this.processBrickDestroyed(brick, isFireball, ball.getFireballLevel());
    } else {
      this.processBrickHit();
    }

    return { destroyed: isDestroyed, droppedPowerUp };
  }

  /**
   * Process a destroyed brick (audio, particles, power-up drop, level check)
   */
  private processBrickDestroyed(brick: Brick, isFireball: boolean, fireballLevel: number): boolean {
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

    // Check for power-up drop
    let droppedPowerUp = false;
    if (brick.shouldDropPowerUp()) {
      const dropPos = brick.getPowerUpDropPosition();
      this.powerUpSystem.spawn(dropPos.x, dropPos.y);
      droppedPowerUp = true;
    }

    // Check if level is complete (before animation finishes)
    const levelComplete = this.getBrickCount() === 0;

    // Play destroy animation then handle level completion
    brick.playDestroyAnimation(() => {
      if (levelComplete) {
        this.onLevelComplete();
      }
    });

    return droppedPowerUp;
  }

  /**
   * Process a brick hit (not destroyed)
   */
  private processBrickHit(): void {
    this.audioManager.playSFX(AUDIO.SFX.POP);
    this.scene.cameras.main.shake(30, 0.002);
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
