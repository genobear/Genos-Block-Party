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
import { ShopManager } from '../systems/ShopManager';
import { BallSpeedManager } from '../systems/BallSpeedManager';
import { calculateLaunchVelocity } from '../utils/ballLaunch';

export class Ball extends Phaser.Physics.Arcade.Sprite {
  private launched: boolean = false;
  private isFloating: boolean = false; // Balloon power-up
  private isElectricBall: boolean = false; // Electric Ball power-up
  private attachedPaddle: Paddle | null = null;

  // Effect duration timers (for resetting on re-application)
  private floatingTimer: Phaser.Time.TimerEvent | null = null;
  private electricBallTimer: Phaser.Time.TimerEvent | null = null;

  // Party Popper (bomb) state - one-shot 3x3 explosion
  private bomb: boolean = false;

  // DJ Scratch (Magnet) state
  private magneted: boolean = false;
  private magnetPaddle: Paddle | null = null;

  // FireBall power-up state (gameplay logic)
  private fireball: boolean = false;
  private fireballLevel: number = 0;
  private preCollisionVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  private pendingVelocityRestore: boolean = false;

  // Conga Line power-up state
  private isCongaLine: boolean = false;
  private congaGhosts: Phaser.GameObjects.Sprite[] = [];
  private positionHistory: Array<{ x: number; y: number; time: number }> = [];
  private congaLineTimer: Phaser.Time.TimerEvent | null = null;
  private static readonly CONGA_GHOST_COUNT = 3;
  private static readonly CONGA_INTERVAL_MS = 300; // 300ms between each ghost
  private static readonly CONGA_HISTORY_MS = 1000; // Keep 1 second of history

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

    // Update conga line ghost positions
    if (this.isCongaLine && this.launched) {
      const now = this.scene.time.now;

      // Record current position
      this.positionHistory.push({ x: this.x, y: this.y, time: now });

      // Trim history to keep only last CONGA_HISTORY_MS worth
      const cutoff = now - Ball.CONGA_HISTORY_MS;
      while (this.positionHistory.length > 0 && this.positionHistory[0].time < cutoff) {
        this.positionHistory.shift();
      }

      // Update ghost positions from history (300ms, 600ms, 900ms behind)
      for (let i = 0; i < this.congaGhosts.length; i++) {
        const ghost = this.congaGhosts[i];
        const targetTime = now - (i + 1) * Ball.CONGA_INTERVAL_MS;

        // Find the position from history closest to targetTime
        const pos = this.getPositionAtTime(targetTime);
        if (pos) {
          ghost.setPosition(pos.x, pos.y);
          ghost.setVisible(true);
        } else {
          // Not enough history yet, hide this ghost
          ghost.setVisible(false);
        }
      }
    }
  }

  /**
   * Get interpolated position from history at a given time
   */
  private getPositionAtTime(targetTime: number): { x: number; y: number } | null {
    if (this.positionHistory.length === 0) return null;

    // If target time is before our history, return null
    if (targetTime < this.positionHistory[0].time) return null;

    // If target time is after our latest entry, return latest
    const latest = this.positionHistory[this.positionHistory.length - 1];
    if (targetTime >= latest.time) {
      return { x: latest.x, y: latest.y };
    }

    // Find the two entries bracketing targetTime and interpolate
    for (let i = 0; i < this.positionHistory.length - 1; i++) {
      const curr = this.positionHistory[i];
      const next = this.positionHistory[i + 1];
      if (targetTime >= curr.time && targetTime <= next.time) {
        const t = (targetTime - curr.time) / (next.time - curr.time);
        return {
          x: curr.x + (next.x - curr.x) * t,
          y: curr.y + (next.y - curr.y) * t,
        };
      }
    }

    return null;
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
   * Re-applying resets the duration timer
   */
  setFloating(duration: number): void {
    // Cancel existing timer if re-applying (reset duration)
    if (this.floatingTimer) {
      this.floatingTimer.destroy();
      this.floatingTimer = null;
    }

    // Apply effect if not already active
    if (!this.isFloating) {
      this.isFloating = true;
      // Apply balloon trail visual effect
      this.effectManager?.applyEffect(BallEffectType.BALLOON_TRAIL);
    }

    // Speed change is handled by BallSpeedManager - velocity will adjust
    // on next paddle bounce or via update() min speed enforcement

    // Reset after duration (new timer replaces old one)
    this.floatingTimer = this.scene.time.delayedCall(duration, () => {
      this.clearFloating();
    });
  }

  /**
   * Clear floating effect
   */
  clearFloating(): void {
    if (!this.isFloating) return;

    this.isFloating = false;
    this.floatingTimer = null;
    this.effectManager?.removeEffect(BallEffectType.BALLOON_TRAIL);
  }

  /**
   * Apply electric ball effect (Electric Ball power-up - faster ball with AOE damage)
   * Speed boost is handled by BallSpeedManager effect multiplier
   * Re-applying resets the duration timer
   */
  setElectricBall(duration: number): void {
    // Cancel existing timer if re-applying (reset duration)
    if (this.electricBallTimer) {
      this.electricBallTimer.destroy();
      this.electricBallTimer = null;
    }

    // Apply effect if not already active
    if (!this.isElectricBall) {
      this.isElectricBall = true;
      // Apply electric speed trail visual effect
      this.effectManager?.applyEffect(BallEffectType.ELECTRIC_TRAIL);
    }

    // Speed change is handled by BallSpeedManager - velocity will adjust
    // on next paddle bounce or via update() min speed enforcement

    // Reset after duration (new timer replaces old one)
    this.electricBallTimer = this.scene.time.delayedCall(duration, () => {
      this.clearElectricBall();
    });
  }

  /**
   * Clear electric ball effect
   */
  clearElectricBall(): void {
    if (!this.isElectricBall) return;

    this.isElectricBall = false;
    this.electricBallTimer = null;
    this.effectManager?.removeEffect(BallEffectType.ELECTRIC_TRAIL);
  }

  /**
   * Check if electric ball mode is active
   */
  isElectricBallActive(): boolean {
    return this.isElectricBall;
  }

  /**
   * Apply conga line effect (trailing ghost balls that deal damage)
   * Re-applying resets the duration timer
   */
  setCongaLine(duration: number): void {
    // Cancel existing timer if re-applying (reset duration)
    if (this.congaLineTimer) {
      this.congaLineTimer.destroy();
      this.congaLineTimer = null;
    }

    // Create ghosts if not already active
    if (!this.isCongaLine) {
      this.isCongaLine = true;
      this.positionHistory = [];

      // Create ghost sprites (semi-transparent copies of ball)
      for (let i = 0; i < Ball.CONGA_GHOST_COUNT; i++) {
        const ghost = this.scene.add.sprite(this.x, this.y, 'ball');
        ghost.setAlpha(0.5 - i * 0.1); // 0.5, 0.4, 0.3 for decreasing opacity
        ghost.setTint(0xe040fb); // Magenta tint to match power-up color
        ghost.setDepth(this.depth - 1 - i); // Behind the main ball
        ghost.setVisible(false); // Initially hidden until we have position history
        this.congaGhosts.push(ghost);
      }
    }

    // Reset timer with new duration
    this.congaLineTimer = this.scene.time.delayedCall(duration, () => {
      this.clearCongaLine();
    });
  }

  /**
   * Clear conga line effect
   */
  clearCongaLine(): void {
    if (!this.isCongaLine) return;

    this.isCongaLine = false;
    this.congaLineTimer = null;
    this.positionHistory = [];

    // Fade out and destroy ghosts
    this.congaGhosts.forEach((ghost) => {
      this.scene.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          ghost.destroy();
        },
      });
    });
    this.congaGhosts = [];
  }

  /**
   * Get conga line ghost sprites (for collision detection by GameScene)
   */
  getCongaGhosts(): Phaser.GameObjects.Sprite[] {
    return this.congaGhosts;
  }

  /**
   * Check if conga line is active
   */
  isCongaLineActive(): boolean {
    return this.isCongaLine;
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
  releaseMagnet(speed: number): void {
    if (!this.magneted) return;
    this.magneted = false;
    this.magnetPaddle = null;

    // Launch at random upward angle (same as normal launch)
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
    this.bomb = false;
    this.pendingVelocityRestore = false;

    // Clear effect timers
    if (this.floatingTimer) {
      this.floatingTimer.destroy();
      this.floatingTimer = null;
    }
    if (this.electricBallTimer) {
      this.electricBallTimer.destroy();
      this.electricBallTimer = null;
    }

    // Clear conga line (destroy ghosts immediately without animation)
    if (this.congaLineTimer) {
      this.congaLineTimer.destroy();
      this.congaLineTimer = null;
    }
    this.isCongaLine = false;
    this.positionHistory = [];
    this.congaGhosts.forEach((ghost) => ghost.destroy());
    this.congaGhosts = [];

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
    // Explicitly clear conga line ghosts before reset (in case reset is called elsewhere)
    this.clearCongaLine();
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

    // Apply cosmetic trail if one is equipped
    const trail = ShopManager.getInstance().getEquippedBallTrail();
    if (trail) {
      this.applyEffect(BallEffectType.COSMETIC_TRAIL);
    }
  }
}
