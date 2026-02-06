import Phaser from 'phaser';
import type { Ball } from '../../objects/Ball';
import { BaseBallEffect } from './BaseBallEffect';
import { BallEffectType, EffectDepth } from '../BallEffectTypes';

/**
 * Spotlight Beam effect handler for Spotlight power-up
 *
 * Visual: Golden glow around the ball with trailing light particles.
 * The light cone is drawn dynamically by Ball.ts based on velocity direction.
 */
export class SpotlightBeamEffectHandler extends BaseBallEffect {
  readonly type = BallEffectType.SPOTLIGHT_BEAM;

  start(ball: Ball): void {
    this.ball = ball;
    this.active = true;

    // Apply golden tint via manager's blending system
    this.setEffectTint(0xffd700);

    // Radiant glow particles around the ball
    this.createEmitter('particle-flame', EffectDepth.GLOW, {
      speed: { min: 10, max: 30 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 400,
      frequency: 50,
      quantity: 1,
      tint: [0xffd700, 0xffec8b, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
    });

    // Trailing light particles behind the ball (like a comet tail)
    this.createEmitter('particle-spark', EffectDepth.TRAIL, {
      speed: { min: 20, max: 50 },
      scale: { start: 0.5, end: 0.1 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 350,
      frequency: 40,
      quantity: 2,
      tint: [0xffd700, 0xffe135, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      // Emit behind the ball (opposite to velocity) - angle set at spawn
      angle: { min: 0, max: 360 },
    });

    // Soft sparkle layer
    this.createEmitter('particle-spark', EffectDepth.SPARKLE, {
      speed: { min: 5, max: 15 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 200,
      frequency: 80,
      quantity: 1,
      tint: [0xfffacd, 0xffd700],
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
    });

    // Apply gentle pulse to indicate active state
    this.applyPulseTween(1, 1.08, 600);
  }
}
