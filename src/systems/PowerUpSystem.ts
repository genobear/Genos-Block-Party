import Phaser from 'phaser';
import { PowerUp } from '../objects/PowerUp';
import { PowerUpPool } from '../pools/PowerUpPool';
import { BallPool } from '../pools/BallPool';
import { Paddle } from '../objects/Paddle';
import { Ball } from '../objects/Ball';
import { Brick } from '../objects/Brick';
import { PowerUpType, selectRandomPowerUpType, selectRandomEffectType, POWERUP_CONFIGS } from '../types/PowerUpTypes';
import { BallEffectType } from '../effects/BallEffectTypes';
import { SafetyNet } from '../objects/SafetyNet';
import { BallSpeedManager } from './BallSpeedManager';
import { SPEED_EFFECTS } from '../config/Constants';

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

/**
 * Configuration for how effects propagate to new balls spawned during multi-ball
 * This allows easy configuration of effect behavior when adding new power-ups
 */
interface EffectPropagationConfig {
  /** Should this effect be applied to new balls spawned while effect is active? */
  propagateToNewBalls: boolean;
  /** Should this effect be applied to all existing balls when collected? */
  applyToAllBalls: boolean;
  /** Function to apply the effect to a single ball */
  applyToBall: (ball: Ball) => void;
  /** Function to check if effect is currently active */
  isActive: () => boolean;
}

export class PowerUpSystem {
  private scene: Phaser.Scene;
  private powerUpPool: PowerUpPool;
  private ballPool: BallPool;
  private paddle: Paddle;
  private activeEffects: ActiveEffect[] = [];
  private speedManager: BallSpeedManager;

  // FireBall stacking state
  private fireballLevel: number = 0;
  private fireballTimer: Phaser.Time.TimerEvent | null = null;

  // Electric Ball global timer state
  private electricBallEndTime: number = 0;
  private electricBallTimer: Phaser.Time.TimerEvent | null = null;

  // Balloon global timer state
  private balloonEndTime: number = 0;
  private balloonTimer: Phaser.Time.TimerEvent | null = null;

  // Bounce House safety net state
  private safetyNet: SafetyNet | null = null;

  // Event emitter for UI updates
  public events: Phaser.Events.EventEmitter;

  /**
   * Effect propagation registry - defines how each ball effect interacts with multi-ball
   * Initialized after constructor to access instance methods
   */
  private propagationConfigs!: Map<PowerUpType, EffectPropagationConfig>;

  /**
   * Effect registry - maps power-up types to their handler functions
   * Adding a new power-up only requires adding an entry here
   */
  private effectHandlers: Map<PowerUpType, EffectHandler>;

  constructor(
    scene: Phaser.Scene,
    paddle: Paddle,
    ballPool: BallPool
  ) {
    this.scene = scene;
    this.paddle = paddle;
    this.ballPool = ballPool;
    this.powerUpPool = new PowerUpPool(scene);
    this.events = new Phaser.Events.EventEmitter();
    this.speedManager = BallSpeedManager.getInstance();

    // Initialize effect registry
    this.effectHandlers = new Map([
      [PowerUpType.BALLOON, () => this.applyBalloon()],
      [PowerUpType.CAKE, () => this.applyCake()],
      [PowerUpType.DRINKS, () => this.applyDrinks()],
      [PowerUpType.DISCO, () => this.applyDisco()],
      [PowerUpType.MYSTERY, () => this.applyMystery()],
      [PowerUpType.POWERBALL, () => this.applyPowerBall()],
      [PowerUpType.FIREBALL, () => this.applyFireball()],
      [PowerUpType.ELECTRICBALL, () => this.applyElectricBall()],
      [PowerUpType.PARTY_POPPER, () => this.applyPartyPopper()],
      [PowerUpType.BOUNCE_HOUSE, () => this.applyBounceHouse()],
      [PowerUpType.PARTY_FAVOR, () => this.applyPartyFavor()],
    ]);

    // Initialize effect propagation config
    // Defines how each ball effect interacts with multi-ball spawning
    this.propagationConfigs = new Map([
      [PowerUpType.FIREBALL, {
        propagateToNewBalls: true,
        applyToAllBalls: true,
        applyToBall: (ball: Ball) => ball.setFireball(this.fireballLevel),
        isActive: () => this.fireballLevel > 0,
      }],
      [PowerUpType.ELECTRICBALL, {
        propagateToNewBalls: true,
        applyToAllBalls: true,
        applyToBall: (ball: Ball) => this.applyElectricBallToBall(ball),
        isActive: () => this.electricBallEndTime > this.scene.time.now,
      }],
      [PowerUpType.BALLOON, {
        propagateToNewBalls: false, // Intentional: new balls spawn at normal speed
        applyToAllBalls: true,
        applyToBall: (ball: Ball) => this.applyBalloonToBall(ball),
        isActive: () => this.balloonEndTime > this.scene.time.now,
      }],
    ]);
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
   * Uses global timer so all balls expire at the same time
   * Note: Does NOT propagate to new balls spawned during effect
   */
  private applyBalloon(): void {
    const duration = POWERUP_CONFIGS[PowerUpType.BALLOON].duration;
    this.balloonEndTime = this.scene.time.now + duration;

    // Cancel existing timer if refreshing effect
    if (this.balloonTimer) {
      this.balloonTimer.destroy();
    }

    // Apply speed effect through manager
    this.speedManager.applyEffect('balloon', SPEED_EFFECTS.BALLOON);

    // Apply to all active balls (for visual state tracking)
    this.ballPool.getActiveBalls().forEach((ball) => {
      this.applyBalloonToBall(ball);
    });

    // Global expiration timer
    this.balloonTimer = this.scene.time.delayedCall(duration, () => {
      this.expireBalloon();
    });

    this.trackEffect(PowerUpType.BALLOON, duration);
  }

  /**
   * Apply Balloon effect to a single ball with remaining duration
   * Used by propagation config (though balloon doesn't propagate to new balls)
   */
  private applyBalloonToBall(ball: Ball): void {
    const remaining = Math.max(0, this.balloonEndTime - this.scene.time.now);
    if (remaining > 0) {
      ball.setFloating(remaining);
      ball.applyEffect(BallEffectType.BALLOON_TRAIL);
    }
  }

  /**
   * Expire Balloon effect from all balls
   */
  private expireBalloon(): void {
    this.balloonEndTime = 0;
    this.balloonTimer = null;

    // Remove speed effect from manager
    this.speedManager.removeEffect('balloon');

    // Ball.setFloating already handles its own timer reset via scene.time.delayedCall
    // so we don't need to explicitly clear floating state here

    // Remove balloon trail from all active balls
    this.ballPool.getActiveBalls().forEach((ball) => {
      ball.removeEffect(BallEffectType.BALLOON_TRAIL);
    });

    this.events.emit('effectExpired', PowerUpType.BALLOON);
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
   * Apply Disco effect (spawn 2 extra balls with sparkle effects)
   * Uses propagation config to apply all active propagatable effects to new balls
   */
  private applyDisco(): void {
    // Find any launched ball to use as spawn position
    const activeBalls = this.ballPool.getActiveBalls();
    const launchedBall = activeBalls.find((ball) => ball.isLaunched());

    // Determine spawn position
    let spawnX: number, spawnY: number;
    if (launchedBall) {
      spawnX = launchedBall.x;
      spawnY = launchedBall.y;
    } else {
      // Edge case: no launched balls, spawn at paddle position
      spawnX = this.paddle.x;
      spawnY = this.paddle.y - 50;
    }

    // Spawn new balls (speed is handled by BallSpeedManager)
    const newBalls = this.ballPool.spawnBalls(2, spawnX, spawnY);

    // Apply disco sparkle to ALL balls when multi-ball is active
    const allBalls = this.ballPool.getActiveBalls();
    if (allBalls.length > 1) {
      allBalls.forEach((ball) => {
        ball.applyEffect(BallEffectType.DISCO_SPARKLE);
      });
    }

    // Apply propagatable effects to new balls only
    newBalls.forEach((ball) => {
      this.propagationConfigs.forEach((config) => {
        if (config.propagateToNewBalls && config.isActive()) {
          config.applyToBall(ball);
        }
      });
    });

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
   * Apply Electric Ball effect (speed up ball with AOE damage)
   * Uses global timer so all balls expire at the same time
   */
  private applyElectricBall(): void {
    const duration = POWERUP_CONFIGS[PowerUpType.ELECTRICBALL].duration;
    this.electricBallEndTime = this.scene.time.now + duration;

    // Cancel existing timer if refreshing effect
    if (this.electricBallTimer) {
      this.electricBallTimer.destroy();
    }

    // Apply speed effect through manager
    this.speedManager.applyEffect('electric', SPEED_EFFECTS.ELECTRIC);

    // Apply to all active balls (for visual state tracking)
    this.ballPool.getActiveBalls().forEach((ball) => {
      this.applyElectricBallToBall(ball);
    });

    // Global expiration timer
    this.electricBallTimer = this.scene.time.delayedCall(duration, () => {
      this.expireElectricBall();
    });

    this.trackEffect(PowerUpType.ELECTRICBALL, duration);
  }

  /**
   * Apply Electric Ball effect to a single ball with remaining duration
   * Used by propagation config when new balls spawn mid-effect
   */
  private applyElectricBallToBall(ball: Ball): void {
    const remaining = Math.max(0, this.electricBallEndTime - this.scene.time.now);
    if (remaining > 0) {
      ball.setElectricBall(remaining);
    }
  }

  /**
   * Expire Electric Ball effect from all balls
   */
  private expireElectricBall(): void {
    this.electricBallEndTime = 0;
    this.electricBallTimer = null;

    // Remove speed effect from manager
    this.speedManager.removeEffect('electric');

    // Clear from all balls
    this.ballPool.getActiveBalls().forEach((ball) => {
      ball.clearElectricBall();
    });

    this.events.emit('effectExpired', PowerUpType.ELECTRICBALL);
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

    // Apply to all active balls
    this.ballPool.getActiveBalls().forEach((ball) => {
      ball.setFireball(this.fireballLevel);
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

    // Clear from all balls
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
   * Apply Bounce House effect — spawn a one-use safety net floor
   */
  private applyBounceHouse(): void {
    // Clear existing safety net if any (refresh, don't stack)
    this.clearSafetyNet(false);

    // Create new safety net
    this.safetyNet = new SafetyNet(this.scene);

    // Emit event for GameScene to set up physics collider
    this.events.emit('safetyNetCreated', this.safetyNet);

    // Track as active effect with no auto-expiration (endTime = Infinity)
    this.activeEffects = this.activeEffects.filter((e) => e.type !== PowerUpType.BOUNCE_HOUSE);
    this.activeEffects.push({ type: PowerUpType.BOUNCE_HOUSE, endTime: Infinity });
    this.events.emit('effectApplied', PowerUpType.BOUNCE_HOUSE, 0);
  }

  /**
   * Consume the safety net (called from GameScene when ball hits it)
   */
  consumeSafetyNet(): void {
    this.clearSafetyNet(true);
  }

  /**
   * Clear the safety net
   * @param animate Whether to play the destroy animation
   */
  private clearSafetyNet(animate: boolean = true): void {
    if (!this.safetyNet) return;

    const net = this.safetyNet;
    this.safetyNet = null;

    if (animate) {
      net.playDestroyAnimation();
    } else {
      net.destroy();
    }

    // Remove from active effects
    this.activeEffects = this.activeEffects.filter((e) => e.type !== PowerUpType.BOUNCE_HOUSE);
    this.events.emit('safetyNetDestroyed');
    this.events.emit('effectExpired', PowerUpType.BOUNCE_HOUSE);
  }

  /**
   * Apply Party Favor effect (extra life)
   * Instant effect - emits event for GameScene to handle lives
   */
  private applyPartyFavor(): void {
    // Emit event for GameScene to grant extra life
    this.events.emit('grantExtraLife');

    // No duration tracking - instant effect
    this.events.emit('effectApplied', PowerUpType.PARTY_FAVOR);
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

    // Clear all speed effects from manager
    this.speedManager.clearAllEffects();

    // Clear FireBall state
    if (this.fireballTimer) {
      this.fireballTimer.destroy();
      this.fireballTimer = null;
    }
    this.fireballLevel = 0;

    // Clear Electric Ball state
    if (this.electricBallTimer) {
      this.electricBallTimer.destroy();
      this.electricBallTimer = null;
    }
    this.electricBallEndTime = 0;

    // Clear Balloon state
    if (this.balloonTimer) {
      this.balloonTimer.destroy();
      this.balloonTimer = null;
    }
    this.balloonEndTime = 0;

    // Clear Bounce House safety net
    this.clearSafetyNet(false);

    // Clear effects from all balls
    this.ballPool.getActiveBalls().forEach((ball) => {
      ball.clearFireball();
      ball.clearElectricBall();
      ball.clearBomb();
    });
  }

  // ========== PARTY POPPER (3x3 BOMB) ==========

  private applyPartyPopper(): void {
    this.ballPool.getActiveBalls().forEach((ball) => {
      ball.setBomb();
    });
    this.events.emit('effectApplied', PowerUpType.PARTY_POPPER);
  }

  onBombDetonated(): void {
    this.events.emit('effectExpired', PowerUpType.PARTY_POPPER);
  }
}
