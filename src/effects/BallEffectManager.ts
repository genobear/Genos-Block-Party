import Phaser from 'phaser';
import type { Ball } from '../objects/Ball';
import type { IBallEffect } from './handlers/BaseBallEffect';
import { BallEffectType } from './BallEffectTypes';
import { FireballEffectHandler } from './handlers/FireballEffectHandler';
import { DiscoEffectHandler } from './handlers/DiscoEffectHandler';

/**
 * Manages multiple simultaneous particle effects on a Ball
 * Supports effect composition - effects can stack without interfering
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
      // Future effects:
      // [BallEffectType.DANGER_SPARKS, () => new DangerSparksHandler(this.scene)],
      // [BallEffectType.BALLOON_TRAIL, () => new BalloonTrailHandler(this.scene)],
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
    effect.start(this.ball, level);
    this.activeEffects.set(type, effect);

    // Re-sort depths after adding new emitters
    this.sortEmitterDepths();
  }

  /**
   * Remove a specific effect
   */
  removeEffect(type: BallEffectType): void {
    const effect = this.activeEffects.get(type);
    if (effect) {
      effect.stop();
      this.activeEffects.delete(type);
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
    this.activeEffects.forEach((effect) => effect.stop());
    this.activeEffects.clear();
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
}
