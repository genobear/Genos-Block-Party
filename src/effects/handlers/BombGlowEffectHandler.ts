import Phaser from 'phaser';
import type { Ball } from '../../objects/Ball';
import { BaseBallEffect } from './BaseBallEffect';
import { BallEffectType, EffectDepth } from '../BallEffectTypes';

/**
 * Bomb Glow effect - pulsing orange glow indicating armed Party Popper
 * Creates a threatening "about to explode" visual:
 *
 * 1. Core Glow - Pulsing orange aura around ball
 * 2. Ember Sparks - Small hot particles drifting off
 *
 * Ball pulses with orange-red tint for "armed bomb" feel
 */
export class BombGlowEffectHandler extends BaseBallEffect {
  readonly type = BallEffectType.BOMB_GLOW;

  // Bomb tint cycling colors - orange to red pulse
  private readonly BALL_TINTS = [
    0xff4500, // OrangeRed
    0xff6600, // Dark orange
    0xff4500, // OrangeRed
    0xff2200, // Red-orange
  ];

  private colorIndex: number = 0;

  start(ball: Ball): void {
    this.ball = ball;
    this.active = true;
    this.colorIndex = 0;

    // Apply bomb tint cycling
    this.applyBombShimmer();

    // Layer 1: Pulsing glow aura
    this.createGlowAura();

    // Layer 2: Ember sparks
    this.createEmberSparks();

    // Slow, ominous pulse - feels like a ticking bomb
    this.applyPulseTween(0.9, 1.15, 400);
  }

  private applyBombShimmer(): void {
    if (!this.ball) return;

    // Moderate shimmer for armed-bomb feel
    this.colorCycleEvent = this.scene.time.addEvent({
      delay: 150,
      callback: () => {
        if (this.ball && this.active) {
          this.setEffectTint(this.BALL_TINTS[this.colorIndex]);
          this.colorIndex = (this.colorIndex + 1) % this.BALL_TINTS.length;
        }
      },
      loop: true,
    });
  }

  private createGlowAura(): void {
    // Soft pulsing orange glow behind the ball
    this.createEmitter('particle-flame', EffectDepth.SMOKE, {
      speed: { min: 10, max: 30 },
      scale: { start: 1.8, end: 0.3 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 300,
      frequency: 40,
      quantity: 2,
      tint: [0xff4500, 0xff6600, 0xff2200],
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
    });
  }

  private createEmberSparks(): void {
    // Small hot ember particles drifting away
    this.createEmitter('particle-spark', EffectDepth.SPARKLE, {
      speed: { min: 30, max: 80 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 200, max: 400 },
      frequency: 80,
      quantity: 1,
      tint: [0xff4500, 0xffaa00, 0xffcc00],
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
    });
  }

  stop(): void {
    super.stop();
  }
}
