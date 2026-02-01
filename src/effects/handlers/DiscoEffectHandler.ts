import type { Ball } from '../../objects/Ball';
import { BaseBallEffect } from './BaseBallEffect';
import { BallEffectType, EffectDepth } from '../BallEffectTypes';

/**
 * Mirror Ball effect - flashy light reflections like a disco mirror ball
 * Applied to balls spawned from the Disco power-up (multi-ball)
 *
 * Features:
 * - Silver/white metallic tint with shimmer
 * - Light beams shooting outward (spotlight reflections)
 * - Mirror facet particles around the ball
 * - Subtle glint/refraction particles
 * - Rotation-like pulse animation
 */
export class DiscoEffectHandler extends BaseBallEffect {
  readonly type = BallEffectType.DISCO_SPARKLE;

  // Silver/white metallic colors for shimmer effect
  private readonly MIRROR_COLORS = [
    0xffffff, // Pure white
    0xe8e8e8, // Light silver
    0xc0c0c0, // Silver
    0xd4d4d4, // Bright silver
    0xf0f0ff, // Cool white (slight blue)
    0xfff0f0, // Warm white (slight pink)
    0xf0fff0, // Cool white (slight green)
    0xfffff0, // Warm white (slight yellow)
  ];

  // Bright accent colors for light beams
  private readonly BEAM_COLORS = [
    0xffffff, // White
    0xff88ff, // Pink
    0x88ffff, // Cyan
    0xffff88, // Yellow
    0x88ff88, // Green
    0xff8888, // Red tint
    0x8888ff, // Blue tint
  ];

  private colorIndex: number = 0;

  start(ball: Ball): void {
    this.ball = ball;
    this.active = true;
    this.colorIndex = 0;

    // Apply metallic shimmer tint cycling
    this.applyMetallicShimmer();

    // Create light beam emitter (rays shooting outward)
    this.createLightBeams();

    // Create mirror facet particles (small diamonds around ball)
    this.createMirrorFacets();

    // Create glint/refraction particles (sparkly highlights)
    this.createGlintParticles();

    // Dramatic pulse to simulate light rotation
    this.applyPulseTween(0.95, 1.15, 150);
  }

  private applyMetallicShimmer(): void {
    if (!this.ball) return;

    // Faster shimmer for disco ball feel
    this.colorCycleEvent = this.scene.time.addEvent({
      delay: 80,
      callback: () => {
        if (this.ball && this.active) {
          // Use manager's tint blending system
          this.setEffectTint(this.MIRROR_COLORS[this.colorIndex]);
          this.colorIndex = (this.colorIndex + 1) % this.MIRROR_COLORS.length;
        }
      },
      loop: true,
    });
  }

  private createLightBeams(): void {
    // Light rays shooting outward in rotating pattern
    this.createEmitter('particle-light-ray', EffectDepth.GLOW, {
      speed: { min: 120, max: 200 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 300, max: 500 },
      frequency: 80,
      quantity: 1,
      tint: this.BEAM_COLORS,
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
      rotate: { onEmit: () => Phaser.Math.Between(0, 360) },
    });
  }

  private createMirrorFacets(): void {
    // Small diamond particles floating around the ball
    this.createEmitter('particle-mirror-facet', EffectDepth.SPARKLE, {
      speed: { min: 40, max: 100 },
      scale: { start: 0.7, end: 0.2 },
      alpha: { start: 1, end: 0.3 },
      lifespan: { min: 400, max: 700 },
      frequency: 100,
      quantity: 2,
      tint: [0xffffff, 0xe0e0e0, 0xf0f0ff, 0xfff0f0],
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
      rotate: { min: -180, max: 180 },
      gravityY: -20, // Slight upward float
    });
  }

  private createGlintParticles(): void {
    // 4-point star glints for light refraction effect
    this.createEmitter('particle-glint', EffectDepth.GLOW, {
      speed: { min: 60, max: 140 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 200, max: 400 },
      frequency: 120,
      quantity: 1,
      tint: [0xffffff, 0xffffcc, 0xccffff, 0xffccff],
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
      rotate: { onEmit: () => Phaser.Math.Between(0, 45) },
    });

    // Bonus: Extra sparkles for more flash
    this.createEmitter('particle-sparkle', EffectDepth.SPARKLE, {
      speed: { min: 50, max: 90 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 300,
      frequency: 150,
      quantity: 1,
      tint: this.BEAM_COLORS,
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
    });
  }

  stop(): void {
    // Base class handles tint cleanup via setEffectTint(null)
    super.stop();
  }
}
