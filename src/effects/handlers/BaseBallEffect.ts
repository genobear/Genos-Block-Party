import Phaser from 'phaser';
import type { Ball } from '../../objects/Ball';
import { BallEffectType, EffectDepth } from '../BallEffectTypes';

/** Callback type for when an effect's tint changes */
export type TintChangeCallback = (effect: IBallEffect) => void;

/**
 * Interface for ball particle effects
 * Each effect type implements this to handle its own emitters
 */
export interface IBallEffect {
  readonly type: BallEffectType;

  /** Start the effect on the ball */
  start(ball: Ball, level?: number): void;

  /** Stop and clean up the effect with fadeout */
  stop(): void;

  /** Update effect parameters (e.g., level changes for fireball) */
  update(level: number): void;

  /** Check if effect is currently active */
  isActive(): boolean;

  /** Get all emitters for depth management */
  getEmitters(): Phaser.GameObjects.Particles.ParticleEmitter[];

  /** Get the current tint color this effect wants (null if no tint) */
  getTint(): number | null;

  /** Set callback for when tint changes */
  setTintChangeCallback(callback: TintChangeCallback | null): void;
}

/**
 * Base implementation with common functionality for ball effects
 * Subclasses override start() and optionally update()
 */
export abstract class BaseBallEffect implements IBallEffect {
  abstract readonly type: BallEffectType;

  protected scene: Phaser.Scene;
  protected ball: Ball | null = null;
  protected emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  protected pulseTween: Phaser.Tweens.Tween | null = null;
  protected colorCycleEvent: Phaser.Time.TimerEvent | null = null;
  protected active: boolean = false;

  /** Current tint color this effect wants (null = no tint preference) */
  protected currentTint: number | null = null;

  /** Callback to notify manager when tint changes */
  private tintChangeCallback: TintChangeCallback | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Set the effect's desired tint color
   * This notifies the manager to recompute the blended tint
   */
  protected setEffectTint(color: number | null): void {
    this.currentTint = color;
    if (this.tintChangeCallback) {
      this.tintChangeCallback(this);
    }
  }

  /**
   * Get the current tint color this effect wants
   */
  getTint(): number | null {
    return this.currentTint;
  }

  /**
   * Set callback for when tint changes (used by BallEffectManager)
   */
  setTintChangeCallback(callback: TintChangeCallback | null): void {
    this.tintChangeCallback = callback;
  }

  abstract start(ball: Ball, level?: number): void;

  stop(): void {
    // Stop all emitters with fadeout delay
    this.emitters.forEach((emitter) => {
      emitter.stop();
      this.scene.time.delayedCall(600, () => {
        if (emitter && emitter.active) {
          emitter.destroy();
        }
      });
    });
    this.emitters = [];

    // Stop pulse tween
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
      if (this.ball) {
        this.ball.setScale(1);
      }
    }

    // Stop color cycle timer
    if (this.colorCycleEvent) {
      this.colorCycleEvent.destroy();
      this.colorCycleEvent = null;
    }

    // Clear tint and notify manager
    this.setEffectTint(null);

    this.active = false;
    this.ball = null;
  }

  update(_level: number): void {
    // Override in subclasses if needed
  }

  isActive(): boolean {
    return this.active;
  }

  getEmitters(): Phaser.GameObjects.Particles.ParticleEmitter[] {
    return this.emitters;
  }

  /**
   * Helper to create an emitter with proper depth and follow
   */
  protected createEmitter(
    texture: string,
    depth: EffectDepth,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    // Build config with follow target only if ball exists
    const emitterConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig =
      {
        ...config,
      };
    if (this.ball) {
      emitterConfig.follow = this.ball;
    }

    const emitter = this.scene.add.particles(0, 0, texture, emitterConfig);
    emitter.setDepth(depth);
    this.emitters.push(emitter);
    return emitter;
  }

  /**
   * Helper to apply pulse tween to ball
   */
  protected applyPulseTween(
    minScale: number,
    maxScale: number,
    duration: number
  ): void {
    if (!this.ball) return;

    if (this.pulseTween) {
      this.pulseTween.stop();
    }

    this.pulseTween = this.scene.tweens.add({
      targets: this.ball,
      scale: { from: minScale, to: maxScale },
      duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Helper to destroy emitters immediately (no fadeout)
   * Used when switching levels to avoid visual glitches
   */
  protected destroyEmittersImmediate(): void {
    this.emitters.forEach((e) => {
      if (e && e.active) {
        e.destroy();
      }
    });
    this.emitters = [];
  }
}
