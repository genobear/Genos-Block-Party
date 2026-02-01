import Phaser from 'phaser';
import type { Ball } from '../../objects/Ball';
import { BaseBallEffect } from './BaseBallEffect';
import { BallEffectType, EffectDepth } from '../BallEffectTypes';

/**
 * Electric Ball effect - "Electric Velocity" aesthetic
 * Creates a supersonic comet trail with multi-layer particle system:
 *
 * 1. Core Streak - Long speed lines trailing behind
 * 2. Electric Crackle - Spark bursts for energy discharge
 * 3. Motion Blur Glow - Soft halo suggesting extreme velocity
 * 4. Speed Glints - Bright flashes for extra impact
 *
 * Ball cycles through electric cyan tints for "charged up" feel
 */
export class ElectricBallEffectHandler extends BaseBallEffect {
  readonly type = BallEffectType.ELECTRIC_TRAIL;

  // Primary trail colors - electric cyan to hot white
  private readonly STREAK_COLORS = [
    0x00ffff, // Electric cyan (core)
    0x00e5ff, // Bright cyan
    0x40ffff, // Light cyan
    0x80ffff, // Pale cyan
    0xffffff, // Hot white (brightest)
  ];

  // Spark accent colors - complementary electric tones
  private readonly SPARK_COLORS = [
    0x00ffff, // Cyan
    0xff00ff, // Magenta (energy pop)
    0xffff00, // Yellow (electricity)
    0xffffff, // White flash
  ];

  // Ball tint cycling for "charged" feel
  private readonly BALL_TINTS = [
    0x00ffff, // Cyan
    0x40ffff, // Light cyan
    0x00e5ff, // Bright cyan
    0x80ffff, // Pale cyan
  ];

  private colorIndex: number = 0;

  start(ball: Ball): void {
    this.ball = ball;
    this.active = true;
    this.colorIndex = 0;

    // Apply electric shimmer tint cycling
    this.applyElectricShimmer();

    // Layer 1: Core streak trail (main visual impact)
    this.createStreakTrail();

    // Layer 2: Electric crackle sparks
    this.createElectricCrackle();

    // Layer 3: Motion blur glow (behind everything)
    this.createMotionBlurGlow();

    // Layer 4: Speed glints (bright flashes)
    this.createSpeedGlints();

    // Subtle, fast pulse - feels like vibrating energy
    this.applyPulseTween(0.95, 1.08, 80);
  }

  private applyElectricShimmer(): void {
    if (!this.ball) return;

    // Fast shimmer for charged-up feel
    this.colorCycleEvent = this.scene.time.addEvent({
      delay: 60,
      callback: () => {
        if (this.ball && this.active) {
          // Use manager's tint blending system
          this.setEffectTint(this.BALL_TINTS[this.colorIndex]);
          this.colorIndex = (this.colorIndex + 1) % this.BALL_TINTS.length;
        }
      },
      loop: true,
    });
  }

  private createStreakTrail(): void {
    // Long speed lines trailing behind - the main visual impact
    this.createEmitter('particle-speedline', EffectDepth.TRAIL, {
      speed: { min: 80, max: 150 },
      scale: { start: 1.2, end: 0.3 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 100, max: 180 },
      frequency: 15, // High frequency for continuous trail
      quantity: 4,
      tint: this.STREAK_COLORS,
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
      rotate: { onEmit: () => Phaser.Math.Between(0, 360) },
    });
  }

  private createElectricCrackle(): void {
    // Small electric sparks bursting outward
    this.createEmitter('particle-electric', EffectDepth.SPARKLE, {
      speed: { min: 100, max: 200 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 80, max: 150 },
      frequency: 40,
      quantity: 2,
      tint: this.SPARK_COLORS,
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
      rotate: { min: -360, max: 360 },
    });
  }

  private createMotionBlurGlow(): void {
    // Soft glow halo suggesting extreme speed (behind everything)
    this.createEmitter('particle-flame', EffectDepth.SMOKE, {
      speed: { min: 20, max: 50 },
      scale: { start: 1.5, end: 0.2 },
      alpha: { start: 0.4, end: 0 },
      lifespan: 200,
      frequency: 25,
      quantity: 2,
      tint: [0x00ffff, 0x0088ff], // Cyan with blue undertone
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
    });
  }

  private createSpeedGlints(): void {
    // Occasional bright flashes for extra punch
    this.createEmitter('particle-glint', EffectDepth.GLOW, {
      speed: { min: 60, max: 120 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 120,
      frequency: 100, // Less frequent for impact
      quantity: 1,
      tint: [0xffffff, 0x00ffff],
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
      rotate: { onEmit: () => Phaser.Math.Between(0, 45) },
    });
  }

  stop(): void {
    // Base class handles tint cleanup via setEffectTint(null)
    super.stop();
  }
}
