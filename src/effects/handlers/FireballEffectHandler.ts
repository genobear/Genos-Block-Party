import Phaser from 'phaser';
import type { Ball } from '../../objects/Ball';
import { BaseBallEffect } from './BaseBallEffect';
import { BallEffectType, EffectDepth } from '../BallEffectTypes';

interface LevelConfig {
  colors: number[];
  quantity: number;
  frequency: number;
  lifespan: number;
  scale: { start: number; end: number };
  tint: number;
  pulse?: { min: number; max: number; duration: number };
  smoke?: boolean;
}

/**
 * Fireball effect handler with level-based intensity scaling
 * Migrated from Ball.ts hardcoded implementation
 *
 * Level 1: Orange flame trail
 * Level 2: Orange-yellow flames + pulse
 * Level 3: Full spectrum flames + smoke trail + stronger pulse
 */
export class FireballEffectHandler extends BaseBallEffect {
  readonly type = BallEffectType.FIREBALL;

  private currentLevel: number = 0;
  private smokeEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null =
    null;

  private readonly LEVEL_CONFIGS: Record<1 | 2 | 3, LevelConfig> = {
    1: {
      colors: [0xff4500, 0xff6600],
      quantity: 1,
      frequency: 40,
      lifespan: 200,
      scale: { start: 0.6, end: 0 },
      tint: 0xff6600,
    },
    2: {
      colors: [0xff4500, 0xff8800, 0xffcc00, 0xffffff],
      quantity: 2,
      frequency: 30,
      lifespan: 350,
      scale: { start: 0.9, end: 0 },
      tint: 0xffaa00,
      pulse: { min: 1, max: 1.15, duration: 150 },
    },
    3: {
      colors: [0xffffff, 0xffff00, 0xff8800, 0xff4500, 0xff2200],
      quantity: 3,
      frequency: 20,
      lifespan: 500,
      scale: { start: 1.2, end: 0 },
      tint: 0xffdd00,
      pulse: { min: 1, max: 1.25, duration: 150 },
      smoke: true,
    },
  };

  start(ball: Ball, level: number = 1): void {
    this.ball = ball;
    this.active = true;
    this.currentLevel = Math.min(level, 3) as 1 | 2 | 3;

    this.applyLevel(this.currentLevel as 1 | 2 | 3);
  }

  update(level: number): void {
    const effectiveLevel = Math.min(level, 3) as 1 | 2 | 3;
    if (effectiveLevel !== this.currentLevel) {
      // Recreate emitters with new level config
      // (Runtime emitter property updates are unreliable in Phaser)
      this.clearEmitters();
      this.currentLevel = effectiveLevel;
      this.applyLevel(effectiveLevel);
    }
  }

  stop(): void {
    // Stop smoke separately (tracked outside base emitters array)
    if (this.smokeEmitter) {
      this.smokeEmitter.stop();
      this.scene.time.delayedCall(600, () => {
        if (this.smokeEmitter && this.smokeEmitter.active) {
          this.smokeEmitter.destroy();
        }
      });
      this.smokeEmitter = null;
    }

    super.stop();
    this.currentLevel = 0;
  }

  private applyLevel(level: 1 | 2 | 3): void {
    const config = this.LEVEL_CONFIGS[level];

    // Apply ball tint via manager's blending system
    this.setEffectTint(config.tint);

    // Create flame emitter (behind ball)
    this.createEmitter('particle-flame', EffectDepth.TRAIL, {
      speed: { min: 10, max: 30 },
      scale: config.scale,
      alpha: { start: 0.9, end: 0 },
      lifespan: config.lifespan,
      frequency: config.frequency,
      quantity: config.quantity,
      tint: config.colors,
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
    });

    // Create overlay emitter (above disco sparkles but below glow)
    // Smaller, brighter flames that remain visible when combined with disco effect
    this.createEmitter('particle-flame', EffectDepth.FIRE_OVERLAY, {
      speed: { min: 15, max: 40 },
      scale: { start: config.scale.start * 0.6, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: config.lifespan * 0.6,
      frequency: config.frequency * 1.5,
      quantity: Math.max(1, Math.floor(config.quantity * 0.6)),
      tint: config.colors,
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
    });

    // Level 3: Add smoke trail behind flames
    if (config.smoke) {
      this.smokeEmitter = this.createEmitter(
        'particle-spark',
        EffectDepth.SMOKE,
        {
          followOffset: { x: 0, y: 2 },
          speed: { min: 5, max: 15 },
          scale: { start: 0.8, end: 0 },
          alpha: { start: 0.4, end: 0 },
          lifespan: 400,
          frequency: 50,
          quantity: 1,
          tint: [0x442200, 0x331100, 0x220000],
          blendMode: Phaser.BlendModes.NORMAL,
        }
      );
    }

    // Apply pulse if defined
    if (config.pulse) {
      this.applyPulseTween(
        config.pulse.min,
        config.pulse.max,
        config.pulse.duration
      );
    }
  }

  private clearEmitters(): void {
    // Immediately destroy when switching levels to avoid visual glitches
    this.destroyEmittersImmediate();

    if (this.smokeEmitter) {
      if (this.smokeEmitter.active) {
        this.smokeEmitter.destroy();
      }
      this.smokeEmitter = null;
    }

    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
  }
}
