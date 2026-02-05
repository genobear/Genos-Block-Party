import Phaser from 'phaser';
import {
  BALL_RADIUS,
  BALL_SPEED_BASE,
  PLAY_AREA_Y,
  PLAYABLE_HEIGHT,
  PADDLE_HEIGHT,
} from '../config/Constants';
import { Paddle } from './Paddle';
import { BallEffectManager } from '../effects/BallEffectManager';
import { BallEffectType } from '../effects/BallEffectTypes';

export class Ball extends Phaser.Physics.Arcade.Sprite {
  private currentSpeed: number = BALL_SPEED_BASE;
  private launched: boolean = false;
  private isFloating: boolean = false; // Balloon power-up
  private isElectricBall: boolean = false; // Electric Ball power-up
  private attachedPaddle: Paddle | null = null;
  private magneted: boolean = false; // DJ Scratch magnet power-up
  private magnetPaddle: Paddle | null = null;

  // FireBall power-up state (gameplay logic)
  private fireball: boolean = false;
  private fireballLevel: number = 0;
  private preCollisionVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  private pendingVelocityRestore: boolean = false;

  // Visual effects manager (handles all particle effects)
  private effectManager: BallEffectManager | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'ball');

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure physics body (single source of truth)
    this.initializePhysics();
  }

  /**
   * Initialize effect manager (called from GameScene after ball creation)
   */
  initEffectManager(scene: Phaser.Scene): void {
    this.effectManager = new BallEffectManager(scene, this);
  }

  /**
   * Centralized physics initialization - call this whenever physics needs to be reset
   */
  private initializePhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(BALL_RADIUS);
    body.setBounce(1, 1);
    body.setCollideWorldBounds(true);
    body.setAllowGravity(false);
    body.onWorldBounds = true;
    body.enable = true;
  }

  /**
   * Attach ball to paddle before launch
   */
  attachToPaddle(paddle: Paddle): void {
    this.attachedPaddle = paddle;
    this.launched = false;
  }

  /**
   * Launch the ball from the paddle
   */
  launch(speedMultiplier: number = 1): void {
    if (this.launched) return;

    this.launched = true;
    this.attachedPaddle = null;

    // Calculate launch speed
    const speed = this.currentSpeed * speedMultiplier;

    // Random launch angle between -60 and -120 degrees (upward)
    const angle = Phaser.Math.DegToRad(Phaser.Math.Between(-120, -60));

    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;

    (this.body as Phaser.Physics.Arcade.Body).setVelocity(velocityX, velocityY);
  }

  update(_time: number, _delta: number): void {
    // Follow paddle if not launched
    if (!this.launched && this.attachedPaddle) {
      this.x = this.attachedPaddle.x;
      this.y = this.attachedPaddle.y - PADDLE_HEIGHT / 2 - BALL_RADIUS - 5;
    }

    // Follow paddle if magneted (DJ Scratch)
    if (this.magneted && this.magnetPaddle) {
      this.x = this.magnetPaddle.x;
      this.y = this.magnetPaddle.y - PADDLE_HEIGHT / 2 - BALL_RADIUS - 5;
    }

    // FireBall piercing: restore velocity after physics has resolved
    if (this.pendingVelocityRestore) {
      this.pendingVelocityRestore = false;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.velocity.copy(this.preCollisionVelocity);
    }

    // Ensure ball maintains minimum speed if launched
    if (this.launched) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const velocity = body.velocity;
      const currentMagnitude = velocity.length();

      // Prevent ball from going too slow (adjust for active effects)
      const minSpeed = this.isFloating
        ? this.currentSpeed * 0.5
        : this.isElectricBall
          ? this.currentSpeed * 1.2
          : this.currentSpeed * 0.8;
      if (currentMagnitude < minSpeed && currentMagnitude > 0) {
        velocity.normalize().scale(minSpeed);
      }

      // Prevent near-horizontal movement (boring loops)
      const minYVelocity = this.currentSpeed * 0.2;
      if (Math.abs(velocity.y) < minYVelocity) {
        velocity.y = velocity.y >= 0 ? minYVelocity : -minYVelocity;
      }
    }
  }

  /**
   * Handle bounce off paddle with angle calculation
   */
  bounceOffPaddle(paddle: Paddle): void {
    const angle = paddle.getCollisionAngle(this.x);
    const speed = this.isFloating
      ? this.currentSpeed * 0.6
      : this.isElectricBall
        ? this.currentSpeed * 1.5
        : this.currentSpeed;

    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;

    (this.body as Phaser.Physics.Arcade.Body).setVelocity(velocityX, velocityY);
  }

  /**
   * Apply floating effect (Balloon power-up - slower ball)
   */
  setFloating(duration: number): void {
    // Guard against re-application to prevent velocity stacking
    if (this.isFloating) return;

    this.isFloating = true;

    // Slow down current velocity
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.scale(0.6);

    // Reset after duration
    this.scene.time.delayedCall(duration, () => {
      this.isFloating = false;
    });
  }

  /**
   * Apply electric ball effect (Electric Ball power-up - faster ball with AOE damage)
   */
  setElectricBall(duration: number): void {
    // Guard against re-application to prevent velocity stacking
    if (this.isElectricBall) return;

    this.isElectricBall = true;

    // Speed up current velocity by 50%
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.scale(1.5);

    // Apply electric speed trail visual effect
    this.effectManager?.applyEffect(BallEffectType.ELECTRIC_TRAIL);

    // Reset after duration
    this.scene.time.delayedCall(duration, () => {
      this.clearElectricBall();
    });
  }

  /**
   * Clear electric ball effect
   */
  clearElectricBall(): void {
    if (!this.isElectricBall) return;

    this.isElectricBall = false;
    this.effectManager?.removeEffect(BallEffectType.ELECTRIC_TRAIL);
  }

  /**
   * Check if electric ball mode is active
   */
  isElectricBallActive(): boolean {
    return this.isElectricBall;
  }

  /**
   * Set ball speed (for level progression)
   */
  setSpeed(speed: number): void {
    this.currentSpeed = speed;
  }

  /**
   * Check if ball is out of bounds (fell below playable area)
   * Uses PLAYABLE_HEIGHT, not GAME_HEIGHT, so touch zone is excluded
   */
  isOutOfBounds(): boolean {
    return this.y > PLAY_AREA_Y + PLAYABLE_HEIGHT + BALL_RADIUS;
  }

  /**
   * Check if ball has been launched (in play)
   */
  isLaunched(): boolean {
    return this.launched;
  }

  /**
   * Mark ball as launched (used when spawning with velocity)
   */
  markAsLaunched(): void {
    this.launched = true;
  }

  /**
   * Magnetize ball to paddle (DJ Scratch power-up)
   * Ball stops moving and follows paddle until released
   */
  magnetToPaddle(paddle: Paddle): void {
    this.magneted = true;
    this.magnetPaddle = paddle;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    // Snap to paddle position
    this.x = paddle.x;
    this.y = paddle.y - PADDLE_HEIGHT / 2 - BALL_RADIUS - 5;
  }

  /**
   * Release magneted ball (launches upward)
   */
  releaseMagnet(speedMultiplier: number = 1): void {
    if (!this.magneted) return;
    this.magneted = false;
    this.magnetPaddle = null;

    // Launch at random upward angle (same as normal launch)
    const speed = this.currentSpeed * speedMultiplier;
    const angle = Phaser.Math.DegToRad(Phaser.Math.Between(-120, -60));
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(velocityX, velocityY);
  }

  /**
   * Check if ball is magneted to paddle
   */
  isMagneted(): boolean {
    return this.magneted;
  }

  /**
   * Reset ball state
   */
  reset(): void {
    this.launched = false;
    this.isFloating = false;
    this.isElectricBall = false;
    this.attachedPaddle = null;
    this.magneted = false;
    this.magnetPaddle = null;
    this.fireball = false;
    this.fireballLevel = 0;
    this.pendingVelocityRestore = false;

    // Clear all visual effects
    this.effectManager?.clearAll();

    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  /**
   * Enable fireball mode with given power level
   */
  setFireball(level: number): void {
    this.fireball = true;
    this.fireballLevel = level;
    this.effectManager?.applyEffect(BallEffectType.FIREBALL, level);
  }

  /**
   * Disable fireball mode
   */
  clearFireball(): void {
    this.fireball = false;
    this.fireballLevel = 0;
    this.effectManager?.removeEffect(BallEffectType.FIREBALL);
  }

  /**
   * Apply any ball effect (extensible API for new effects)
   */
  applyEffect(type: BallEffectType, level?: number): void {
    this.effectManager?.applyEffect(type, level);
  }

  /**
   * Remove any ball effect
   */
  removeEffect(type: BallEffectType): void {
    this.effectManager?.removeEffect(type);
  }

  /**
   * Check if a specific effect is active
   */
  hasEffect(type: BallEffectType): boolean {
    return this.effectManager?.hasEffect(type) ?? false;
  }

  /**
   * Check if ball is in fireball mode
   */
  isFireballActive(): boolean {
    return this.fireball;
  }

  /**
   * Get current fireball damage level
   */
  getFireballLevel(): number {
    return this.fireballLevel;
  }

  /**
   * Store current velocity before collision (for piercing)
   */
  storeVelocity(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.preCollisionVelocity.copy(body.velocity);
  }

  /**
   * Schedule velocity restoration for next update (after physics resolves)
   */
  restoreVelocity(): void {
    this.pendingVelocityRestore = true;
  }

  /**
   * Deactivate ball (return to pool)
   */
  deactivate(): void {
    this.reset();
    this.setActive(false);
    this.setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
  }

  /**
   * Activate ball from pool
   */
  activate(x: number, y: number): void {
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setScale(1);
    this.setAlpha(1);
    this.setRotation(0);

    // Use centralized physics initialization
    this.initializePhysics();

    this.reset();
  }
}
