import Phaser from 'phaser';
import type { Ball } from '../../objects/Ball';
import { BallEffectType, EffectDepth } from '../BallEffectTypes';

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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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
