import Phaser from 'phaser';
import { PowerUp } from '../objects/PowerUp';
import { PowerUpPool } from '../pools/PowerUpPool';
import { BallPool } from '../pools/BallPool';
import { Paddle } from '../objects/Paddle';
import { Ball } from '../objects/Ball';
import { Brick } from '../objects/Brick';
import { PowerUpType, selectRandomPowerUpType, selectRandomEffectType, POWERUP_CONFIGS } from '../types/PowerUpTypes';

/**
 * Active effect tracking
 */
interface ActiveEffect {
  type: PowerUpType;
  endTime: number;
}

/**
 * Effect handler function type
 */
type EffectHandler = () => void;

export class PowerUpSystem {
  private scene: Phaser.Scene;
  private powerUpPool: PowerUpPool;
  private ballPool: BallPool;
  private paddle: Paddle;
  private primaryBall: Ball;
  private activeEffects: ActiveEffect[] = [];
  private speedMultiplier: number = 1;

  // FireBall stacking state
  private fireballLevel: number = 0;
  private fireballTimer: Phaser.Time.TimerEvent | null = null;

  // Event emitter for UI updates
  public events: Phaser.Events.EventEmitter;

  /**
   * Effect registry - maps power-up types to their handler functions
   * Adding a new power-up only requires adding an entry here
   */
  private effectHandlers: Map<PowerUpType, EffectHandler>;

  constructor(
    scene: Phaser.Scene,
    paddle: Paddle,
    primaryBall: Ball,
    ballPool: BallPool
  ) {
    this.scene = scene;
    this.paddle = paddle;
    this.primaryBall = primaryBall;
    this.ballPool = ballPool;
    this.powerUpPool = new PowerUpPool(scene);
    this.events = new Phaser.Events.EventEmitter();

    // Initialize effect registry
    this.effectHandlers = new Map([
      [PowerUpType.BALLOON, () => this.applyBalloon()],
      [PowerUpType.CAKE, () => this.applyCake()],
      [PowerUpType.DRINKS, () => this.applyDrinks()],
      [PowerUpType.DISCO, () => this.applyDisco()],
      [PowerUpType.MYSTERY, () => this.applyMystery()],
      [PowerUpType.POWERBALL, () => this.applyPowerBall()],
      [PowerUpType.FIREBALL, () => this.applyFireball()],
    ]);
  }

  /**
   * Set ball speed multiplier (for level progression)
   */
  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  /**
   * Spawn a power-up at position (Brick decides whether to call this)
   */
  spawn(x: number, y: number): void {
    const type = selectRandomPowerUpType();
    this.powerUpPool.spawn(x, y, type);
  }

  /**
   * Force spawn a specific power-up (for testing)
   */
  forceSpawn(x: number, y: number, type: PowerUpType): PowerUp | null {
    return this.powerUpPool.spawn(x, y, type);
  }

  /**
   * Get the power-up group for collision detection
   */
  getPowerUpGroup(): Phaser.Physics.Arcade.Group {
    return this.powerUpPool.getGroup();
  }

  /**
   * Handle power-up collection - uses effect registry for clean dispatch
   */
  collect(powerUp: PowerUp): void {
    const type = powerUp.getType();

    // Apply effect using registry lookup
    const handler = this.effectHandlers.get(type);
    if (handler) {
      handler();
    }

    // Play collection animation
    powerUp.playCollectAnimation();

    // Emit event for UI
    this.events.emit('collected', type);
  }

  /**
   * Apply Balloon effect (slow ball)
   */
  private applyBalloon(): void {
    const duration = POWERUP_CONFIGS[PowerUpType.BALLOON].duration;

    // Apply to primary ball
    this.primaryBall.setFloating(duration);

    // Apply to any extra balls
    this.ballPool.getActiveBalls().forEach((ball) => {
      if (ball !== this.primaryBall) {
        ball.setFloating(duration);
      }
    });

    this.trackEffect(PowerUpType.BALLOON, duration);
  }

  /**
   * Apply Cake effect (wide paddle)
   */
  private applyCake(): void {
    const duration = POWERUP_CONFIGS[PowerUpType.CAKE].duration;
    this.paddle.setWide(duration);
    this.trackEffect(PowerUpType.CAKE, duration);
  }

  /**
   * Apply Drinks effect (wobbly paddle - debuff)
   */
  private applyDrinks(): void {
    const duration = POWERUP_CONFIGS[PowerUpType.DRINKS].duration;
    this.paddle.setWobbly(duration);
    this.trackEffect(PowerUpType.DRINKS, duration);
  }

  /**
   * Apply Disco effect (spawn 2 extra balls)
   */
  private applyDisco(): void {
    // Only spawn if primary ball is launched (in play)
    if (this.primaryBall.isLaunched()) {
      const newBalls = this.ballPool.spawnExtraBalls(2, this.primaryBall, this.speedMultiplier);

      // If fireball is active, apply to newly spawned balls
      if (this.fireballLevel > 0) {
        newBalls.forEach((ball) => {
          ball.setFireball(this.fireballLevel);
        });
      }
    }
    // No duration tracking - instant effect
    this.events.emit('effectApplied', PowerUpType.DISCO);
  }

  /**
   * Apply Mystery effect - uses registry for random effect selection
   */
  private applyMystery(): void {
    const randomEffect = selectRandomEffectType();

    // Apply using registry lookup (cleaner than duplicate switch)
    const handler = this.effectHandlers.get(randomEffect);
    if (handler) {
      handler();
    }

    this.events.emit('mysteryRevealed', randomEffect);
  }

  /**
   * Apply Power Ball effect (double power-up drop chance)
   */
  private applyPowerBall(): void {
    const duration = POWERUP_CONFIGS[PowerUpType.POWERBALL].duration;

    // Enable Power Ball effect
    Brick.powerBallActive = true;

    // Schedule reset
    this.scene.time.delayedCall(duration, () => {
      Brick.powerBallActive = false;
    });

    this.trackEffect(PowerUpType.POWERBALL, duration);
  }

  /**
   * Apply FireBall effect (stacking piercing damage)
   */
  private applyFireball(): void {
    const duration = POWERUP_CONFIGS[PowerUpType.FIREBALL].duration;

    // Increment stack level
    this.fireballLevel++;

    // Cancel existing timer and reset duration
    if (this.fireballTimer) {
      this.fireballTimer.destroy();
    }

    // Apply to primary ball
    this.primaryBall.setFireball(this.fireballLevel);

    // Apply to any extra balls
    this.ballPool.getActiveBalls().forEach((ball) => {
      if (ball !== this.primaryBall) {
        ball.setFireball(this.fireballLevel);
      }
    });

    // Schedule expiration
    this.fireballTimer = this.scene.time.delayedCall(duration, () => {
      this.expireFireball();
    });

    // Track effect with stack count
    this.trackStackableEffect(PowerUpType.FIREBALL, duration, this.fireballLevel);
  }

  /**
   * Expire FireBall effect (clears all stacks)
   */
  private expireFireball(): void {
    this.fireballLevel = 0;
    this.fireballTimer = null;

    // Clear from primary ball
    this.primaryBall.clearFireball();

    // Clear from all extra balls
    this.ballPool.getActiveBalls().forEach((ball) => {
      ball.clearFireball();
    });

    this.events.emit('effectExpired', PowerUpType.FIREBALL);
  }

  /**
   * Check if FireBall is active
   */
  isFireballActive(): boolean {
    return this.fireballLevel > 0;
  }

  /**
   * Get current FireBall level
   */
  getFireballLevel(): number {
    return this.fireballLevel;
  }

  /**
   * Track active effect for UI display
   */
  private trackEffect(type: PowerUpType, duration: number): void {
    const endTime = this.scene.time.now + duration;

    // Remove existing effect of same type
    this.activeEffects = this.activeEffects.filter((e) => e.type !== type);

    // Add new effect
    this.activeEffects.push({ type, endTime });

    this.events.emit('effectApplied', type, duration);
  }

  /**
   * Track stackable effect for UI display (includes stack count)
   */
  private trackStackableEffect(type: PowerUpType, duration: number, stackCount: number): void {
    const endTime = this.scene.time.now + duration;

    // Remove existing effect of same type
    this.activeEffects = this.activeEffects.filter((e) => e.type !== type);

    // Add new effect
    this.activeEffects.push({ type, endTime });

    // Emit with stack count for UI
    this.events.emit('effectApplied', type, duration, stackCount);
  }

  /**
   * Update - cleanup expired effects and off-screen power-ups
   */
  update(): void {
    // Update power-up pool
    this.powerUpPool.update();

    // Remove expired effects
    const now = this.scene.time.now;
    const expired = this.activeEffects.filter((e) => e.endTime <= now);

    expired.forEach((effect) => {
      this.events.emit('effectExpired', effect.type);
    });

    this.activeEffects = this.activeEffects.filter((e) => e.endTime > now);
  }

  /**
   * Get currently active effects
   */
  getActiveEffects(): ActiveEffect[] {
    return [...this.activeEffects];
  }

  /**
   * Clear all effects and power-ups (for level reset)
   */
  clear(): void {
    this.powerUpPool.clear();
    this.activeEffects = [];
    this.paddle.resetEffects();
    Brick.powerBallActive = false;

    // Clear FireBall state
    if (this.fireballTimer) {
      this.fireballTimer.destroy();
      this.fireballTimer = null;
    }
    this.fireballLevel = 0;
    this.primaryBall.clearFireball();
    this.ballPool.getActiveBalls().forEach((ball) => {
      ball.clearFireball();
    });
  }
}
