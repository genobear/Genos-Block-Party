import Phaser from 'phaser';
import type { Ball } from '../../objects/Ball';
import { BaseBallEffect } from './BaseBallEffect';
import { BallEffectType, EffectDepth } from '../BallEffectTypes';

/**
 * Balloon trail effect handler — subtle light blue bubble trail
 * Active during the Balloon (slow-ball) power-up
 */
export class BalloonTrailEffectHandler extends BaseBallEffect {
  readonly type = BallEffectType.BALLOON_TRAIL;

  start(ball: Ball): void {
    this.ball = ball;
    this.active = true;

    // Gentle bubble/glow trail behind the ball
    this.createEmitter('particle-glow', EffectDepth.TRAIL, {
      speed: { min: 5, max: 20 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 450,
      frequency: 70,
      quantity: 1,
      tint: [0x87CEEB, 0xADD8E6, 0xE0F7FF, 0xFFFFFF],
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 250, max: 290 }, // Upward float direction
    });

    // Subtle light blue tint on the ball
    this.setEffectTint(0xAADDFF);
  }

  stop(): void {
    super.stop();
  }
}
