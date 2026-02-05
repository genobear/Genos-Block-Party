import Phaser from 'phaser';
import type { Ball } from '../../objects/Ball';
import { BaseBallEffect } from './BaseBallEffect';
import { BallEffectType, EffectDepth } from '../BallEffectTypes';

/**
 * Danger spark effect handler — red/orange sparks on last life
 * Migrated from ParticleSystem.dangerSparks() into the effect handler system
 */
export class DangerSparksEffectHandler extends BaseBallEffect {
  readonly type = BallEffectType.DANGER_SPARKS;

  start(ball: Ball): void {
    this.ball = ball;
    this.active = true;

    // Red/orange spark emitter above the ball
    this.createEmitter('particle-spark', EffectDepth.SPARKLE, {
      speed: { min: 20, max: 50 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 300,
      frequency: 50,
      quantity: 1,
      tint: [0xff6b6b, 0xff0000, 0xffaa00],
      blendMode: Phaser.BlendModes.ADD,
    });

    // Subtle red tint on the ball
    this.setEffectTint(0xff4444);
  }

  stop(): void {
    super.stop();
  }
}
