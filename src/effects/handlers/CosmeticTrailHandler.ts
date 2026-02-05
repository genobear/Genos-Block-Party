/**
 * CosmeticTrailHandler — Ball effect handler for cosmetic trails from the Party Shop
 *
 * This is SEPARATE from power-up effects. Renders at SMOKE depth (behind everything).
 * Does NOT set ball tint — cosmetic trails shouldn't interfere with power-up tints.
 */

import type { Ball } from '../../objects/Ball';
import { BaseBallEffect } from './BaseBallEffect';
import { BallEffectType, EffectDepth } from '../BallEffectTypes';
import type { BallTrailConfig } from '../../types/ShopTypes';

export class CosmeticTrailHandler extends BaseBallEffect {
  readonly type = BallEffectType.COSMETIC_TRAIL;
  private trailConfig: BallTrailConfig;

  constructor(scene: Phaser.Scene, config: BallTrailConfig) {
    super(scene);
    this.trailConfig = config;
  }

  start(ball: Ball, _level?: number): void {
    this.ball = ball;
    this.active = true;

    // Create emitter from trail config using particle-spark texture (soft circle)
    this.createEmitter('particle-spark', EffectDepth.SMOKE, {
      speed: this.trailConfig.speed,
      scale: this.trailConfig.scale,
      alpha: this.trailConfig.alpha,
      lifespan: this.trailConfig.lifespan,
      frequency: this.trailConfig.frequency,
      quantity: this.trailConfig.quantity,
      tint: this.trailConfig.colors,
      blendMode: this.trailConfig.blendMode,
    });

    // Do NOT set ball tint — cosmetic trails leave tint to power-up effects
  }
}
