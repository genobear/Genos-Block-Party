import Phaser from 'phaser';
import type { Ball } from '../../objects/Ball';
import { BaseBallEffect } from './BaseBallEffect';
import { BallEffectType, EffectDepth } from '../BallEffectTypes';

/**
 * Bomb Glow effect handler for Party Popper power-up
 *
 * Visual indicator: pulsing orange-red glow around the ball,
 * with small spark particles trailing behind.
 * One-shot — removed when the bomb detonates.
 */
export class BombGlowEffectHandler extends BaseBallEffect {
  readonly type = BallEffectType.BOMB_GLOW;

  start(ball: Ball): void {
    this.ball = ball;
    this.active = true;

    // Apply orange-red tint via manager's blending system
    this.setEffectTint(0xff4500);

    // Pulsing glow particles around the ball
    this.createEmitter('particle-flame', EffectDepth.GLOW, {
      speed: { min: 5, max: 20 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 300,
      frequency: 60,
      quantity: 1,
      tint: [0xff4500, 0xff6600, 0xff2200],
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
    });

    // Trailing spark particles behind the ball
    this.createEmitter('particle-spark', EffectDepth.TRAIL, {
      speed: { min: 10, max: 25 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 250,
      frequency: 80,
      quantity: 1,
      tint: [0xff4500, 0xffaa00],
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
    });

    // Apply gentle pulse to indicate armed state
    this.applyPulseTween(1, 1.15, 400);
  }
}
