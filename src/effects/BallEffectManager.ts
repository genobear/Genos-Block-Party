import Phaser from 'phaser';
import type { Ball } from '../objects/Ball';
import type { IBallEffect } from './handlers/BaseBallEffect';
import { BallEffectType } from './BallEffectTypes';
import { FireballEffectHandler } from './handlers/FireballEffectHandler';
import { DiscoEffectHandler } from './handlers/DiscoEffectHandler';
import { ElectricBallEffectHandler } from './handlers/ElectricBallEffectHandler';
import { DangerSparksEffectHandler } from './handlers/DangerSparksEffectHandler';
import { BalloonTrailEffectHandler } from './handlers/BalloonTrailEffectHandler';
import { BombGlowEffectHandler } from './handlers/BombGlowEffectHandler';

/**
 * Manages multiple simultaneous particle effects on a Ball
 * Supports effect composition - effects can stack without interfering
 *
 * Tint Blending:
 * When multiple effects want to tint the ball, their colors are blended
 * using multiplicative blending (colors combine to create new hues).
 *
 * Usage:
 *   ball.effectManager.applyEffect(BallEffectType.FIREBALL, 2);
 *   ball.effectManager.applyEffect(BallEffectType.DISCO_SPARKLE);
 *   ball.effectManager.removeEffect(BallEffectType.FIREBALL);
 *   ball.effectManager.clearAll();
 */
export class BallEffectManager {
  private scene: Phaser.Scene;
  private ball: Ball;
  private activeEffects: Map<BallEffectType, IBallEffect> = new Map();
  private effectRegistry: Map<BallEffectType, () => IBallEffect>;

  constructor(scene: Phaser.Scene, ball: Ball) {
    this.scene = scene;
    this.ball = ball;

    // Register all available effect handlers
    // To add a new effect: create handler class, add entry here
    this.effectRegistry = new Map<BallEffectType, () => IBallEffect>([
      [BallEffectType.FIREBALL, () => new FireballEffectHandler(this.scene)],
      [BallEffectType.DISCO_SPARKLE, () => new DiscoEffectHandler(this.scene)],
      [BallEffectType.ELECTRIC_TRAIL, () => new ElectricBallEffectHandler(this.scene)],
      [BallEffectType.DANGER_SPARKS, () => new DangerSparksEffectHandler(this.scene)],
      [BallEffectType.BALLOON_TRAIL, () => new BalloonTrailEffectHandler(this.scene)],
      [BallEffectType.BOMB_GLOW, () => new BombGlowEffectHandler(this.scene)],
    ]);
  }

  /**
   * Apply an effect to the ball
   * Effects can stack - applying Fireball won't remove Disco sparkles
   */
  applyEffect(type: BallEffectType, level?: number): void {
    // If effect already active, update it instead of recreating
    const existing = this.activeEffects.get(type);
    if (existing?.isActive()) {
      existing.update(level ?? 1);
      return;
    }

    // Create new effect from registry
    const factory = this.effectRegistry.get(type);
    if (!factory) {
      console.warn(`Unknown ball effect type: ${type}`);
      return;
    }

    const effect = factory();

    // Subscribe to tint changes from this effect
    effect.setTintChangeCallback(() => this.updateBlendedTint());

    effect.start(this.ball, level);
    this.activeEffects.set(type, effect);

    // Re-sort depths after adding new emitters
    this.sortEmitterDepths();

    // Update blended tint in case the new effect has a tint
    this.updateBlendedTint();
  }

  /**
   * Remove a specific effect
   */
  removeEffect(type: BallEffectType): void {
    const effect = this.activeEffects.get(type);
    if (effect) {
      effect.setTintChangeCallback(null);
      effect.stop();
      this.activeEffects.delete(type);
      // Recompute tint after removing effect
      this.updateBlendedTint();
    }
  }

  /**
   * Check if an effect is currently active
   */
  hasEffect(type: BallEffectType): boolean {
    return this.activeEffects.get(type)?.isActive() ?? false;
  }

  /**
   * Update an effect's level (for stacking effects like Fireball)
   */
  updateEffectLevel(type: BallEffectType, level: number): void {
    const effect = this.activeEffects.get(type);
    if (effect?.isActive()) {
      effect.update(level);
    }
  }

  /**
   * Clear all effects (for ball reset/deactivate)
   */
  clearAll(): void {
    this.activeEffects.forEach((effect) => {
      effect.setTintChangeCallback(null);
      effect.stop();
    });
    this.activeEffects.clear();
    // Clear tint when all effects removed
    this.ball.clearTint();
  }

  /**
   * Get all currently active effect types
   */
  getActiveEffects(): BallEffectType[] {
    return Array.from(this.activeEffects.keys()).filter((type) =>
      this.activeEffects.get(type)?.isActive()
    );
  }

  /**
   * Re-sort all emitters by depth to ensure correct layering
   * Called after adding new effects
   */
  private sortEmitterDepths(): void {
    // Collect all emitters from all effects
    const allEmitters: {
      emitter: Phaser.GameObjects.Particles.ParticleEmitter;
      depth: number;
    }[] = [];

    this.activeEffects.forEach((effect) => {
      effect.getEmitters().forEach((emitter) => {
        allEmitters.push({ emitter, depth: emitter.depth });
      });
    });

    // Apply depths (Phaser handles actual sorting via depth manager)
    allEmitters.forEach(({ emitter, depth }) => {
      emitter.setDepth(depth);
    });
  }

  /**
   * Collect all tints from active effects and blend them together
   * Called whenever any effect's tint changes
   */
  private updateBlendedTint(): void {
    const tints: number[] = [];

    this.activeEffects.forEach((effect) => {
      const tint = effect.getTint();
      if (tint !== null) {
        tints.push(tint);
      }
    });

    if (tints.length === 0) {
      // No effects want to tint - clear tint
      this.ball.clearTint();
    } else if (tints.length === 1) {
      // Single tint - apply directly
      this.ball.setTint(tints[0]);
    } else {
      // Multiple tints - blend them
      const blended = this.blendColors(tints);
      this.ball.setTint(blended);
    }
  }

  /**
   * Blend multiple colors using multiply blending
   * "Dyes" brighter colors with more saturated ones - creates tinted shimmer effect
   * Formula: (a * b) / 255 per channel
   */
  private blendColors(colors: number[]): number {
    // Start with white and multiply each color in
    let r = 255;
    let g = 255;
    let b = 255;

    for (const color of colors) {
      const cr = (color >> 16) & 0xff;
      const cg = (color >> 8) & 0xff;
      const cb = color & 0xff;

      // Multiply blend: (a * b) / 255
      r = Math.floor((r * cr) / 255);
      g = Math.floor((g * cg) / 255);
      b = Math.floor((b * cb) / 255);
    }

    return (r << 16) | (g << 8) | b;
  }
}
