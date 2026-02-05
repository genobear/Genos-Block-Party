import Phaser from 'phaser';
import {
  BALL_RADIUS,
  PLAY_AREA_Y,
  PLAYABLE_HEIGHT,
  PADDLE_HEIGHT,
} from '../config/Constants';
import { Paddle } from './Paddle';
import { BallEffectManager } from '../effects/BallEffectManager';
import { BallEffectType } from '../effects/BallEffectTypes';
import { BallSpeedManager } from '../systems/BallSpeedManager';
import { calculateLaunchVelocity } from '../utils/ballLaunch';

export class Ball extends Phaser.Physics.Arcade.Sprite {
  private launched: boolean = false;
  private isFloating: boolean = false; // Balloon power-up
  private isElectricBall: boolean = false; // Electric Ball power-up
  private attachedPaddle: Paddle | null = null;

  // Party Popper (bomb) state - one-shot 3x3 explosion
  private bomb: boolean = false;

  // FireBall power-up state (gameplay logic)
  private fireball: boolean = false;
  private fireballLevel: number = 0;
  private preCollisionVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  private pendingVelocityRestore: boolean = false;

  // Collision cooldown to prevent velocity modifications right after collision
  private collisionCooldown: number = 0;

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
   * Get the speed manager instance
   */
  private get speedManager(): BallSpeedManager {
    return BallSpeedManager.getInstance();
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
   * Speed is calculated by BallSpeedManager (base × difficulty × level × effects)
   */
  launch(): void {
    if (this.launched) return;

    this.launched = true;
    this.attachedPaddle = null;

    // Get speed from manager (includes all multipliers)
    const speed = this.speedManager.getEffectiveSpeed();

    // Calculate random launch velocity (angle between -120 and -60 degrees, upward)
    const { velocityX, velocityY } = calculateLaunchVelocity(speed);

    (this.body as Phaser.Physics.Arcade.Body).setVelocity(velocityX, velocityY);
  }

  update(_time: number, _delta: number): void {
    // Follow paddle if not launched
    if (!this.launched && this.attachedPaddle) {
      this.x = this.attachedPaddle.x;
      this.y = this.attachedPaddle.y - PADDLE_HEIGHT / 2 - BALL_RADIUS - 5;
    }

    // FireBall piercing: restore velocity after physics has resolved
    if (this.pendingVelocityRestore) {
      this.pendingVelocityRestore = false;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.velocity.copy(this.preCollisionVelocity);
    }

    // Decrement collision cooldown
    if (this.collisionCooldown > 0) {
      this.collisionCooldown--;
    }

    // Ensure ball maintains minimum speed if launched (skip during collision cooldown)
    if (this.launched && this.collisionCooldown === 0) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const velocity = body.velocity;
      const currentMagnitude = velocity.length();

      // Get effective speed from manager (includes all multipliers)
      const effectiveSpeed = this.speedManager.getEffectiveSpeed();

      // Prevent near-horizontal movement (boring loops) while preserving speed
      const minYVelocity = effectiveSpeed * 0.2;
      if (Math.abs(velocity.y) < minYVelocity && currentMagnitude > 0) {
        // Preserve magnitude while adding vertical component
        const targetY = velocity.y >= 0 ? minYVelocity : -minYVelocity;
        velocity.y = targetY;

        // Recalculate X to maintain total magnitude
        const newMagnitude = velocity.length();
        if (newMagnitude > 0) {
          velocity.scale(currentMagnitude / newMagnitude);
        }
      }
    }
  }

  /**
   * Register a collision to start cooldown period
   * Call this from collision handlers to prevent immediate velocity modifications
   */
  registerCollision(): void {
    this.collisionCooldown = 3; // Skip velocity adjustments for 3 frames after collision
  }

  /**
   * Handle bounce off paddle with angle calculation
   * Speed is calculated by BallSpeedManager (includes all effect multipliers)
   */
  bounceOffPaddle(paddle: Paddle): void {
    const angle = paddle.getCollisionAngle(this.x);
    // Get speed from manager (already includes balloon/electric multipliers)
    const speed = this.speedManager.getEffectiveSpeed();

    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;

    (this.body as Phaser.Physics.Arcade.Body).setVelocity(velocityX, velocityY);
  }

  /**
   * Apply floating effect (Balloon power-up - slower ball)
   * Speed reduction is handled by BallSpeedManager effect multiplier
   */
  setFloating(duration: number): void {
    // Guard against re-application
    if (this.isFloating) return;

    this.isFloating = true;

    // Speed change is handled by BallSpeedManager - velocity will adjust
    // on next paddle bounce or via update() min speed enforcement

    // Reset after duration
    this.scene.time.delayedCall(duration, () => {
      this.isFloating = false;
    });
  }

  /**
   * Apply electric ball effect (Electric Ball power-up - faster ball with AOE damage)
   * Speed boost is handled by BallSpeedManager effect multiplier
   */
  setElectricBall(duration: number): void {
    // Guard against re-application
    if (this.isElectricBall) return;

    this.isElectricBall = true;

    // Speed change is handled by BallSpeedManager - velocity will adjust
    // on next paddle bounce or via update() min speed enforcement

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
   * Arm bomb (Party Popper power-up — next brick hit explodes 3x3 area)
   */
  setBomb(): void {
    this.bomb = true;
    this.effectManager?.applyEffect(BallEffectType.BOMB_GLOW);
  }

  /**
   * Clear bomb state after detonation
   */
  clearBomb(): void {
    this.bomb = false;
    this.effectManager?.removeEffect(BallEffectType.BOMB_GLOW);
  }

  /**
   * Check if bomb is armed
   */
  hasBomb(): boolean {
    return this.bomb;
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
   * Reset ball state
   */
  reset(): void {
    this.launched = false;
    this.isFloating = false;
    this.isElectricBall = false;
    this.attachedPaddle = null;
    this.fireball = false;
    this.fireballLevel = 0;
    this.bomb = false;
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
