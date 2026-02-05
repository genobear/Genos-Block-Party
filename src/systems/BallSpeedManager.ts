import Phaser from 'phaser';
import { BALL_SPEED_BASE } from '../config/Constants';

interface SpeedSettings {
  difficultyMultiplier: number;
}

/**
 * Named effect multipliers - each effect type can have at most one active multiplier
 */
export type SpeedEffect = 'balloon' | 'electric';

/**
 * BallSpeedManager - Single source of truth for ball speed calculation
 *
 * Effective speed = BASE × difficulty × level × (all active effects)
 *
 * Layers:
 * 1. Difficulty (user setting, persisted to localStorage)
 * 2. Level (from LevelData, session-only)
 * 3. Effects (power-ups, temporary)
 */
export class BallSpeedManager {
  private static instance: BallSpeedManager | null = null;

  private static readonly STORAGE_KEY = 'genos-block-party-speed';
  private static readonly DEFAULT_DIFFICULTY = 1.0;

  // Layer 1: Global difficulty (user setting, persisted)
  private difficultyMultiplier: number;

  // Layer 2: Level multiplier (from LevelData, not persisted)
  private levelMultiplier: number = 1.0;

  // Layer 3: Effect multipliers (power-ups, temporary)
  private effectMultipliers: Map<SpeedEffect, number> = new Map();

  private constructor() {
    this.difficultyMultiplier = this.loadSettings().difficultyMultiplier;
  }

  static getInstance(): BallSpeedManager {
    if (!BallSpeedManager.instance) {
      BallSpeedManager.instance = new BallSpeedManager();
    }
    return BallSpeedManager.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    BallSpeedManager.instance = null;
  }

  // === DIFFICULTY (Layer 1) ===

  getDifficultyMultiplier(): number {
    return this.difficultyMultiplier;
  }

  setDifficultyMultiplier(value: number): void {
    this.difficultyMultiplier = Phaser.Math.Clamp(value, 0.5, 2.0);
    this.saveSettings();
  }

  // === LEVEL (Layer 2) ===

  setLevelMultiplier(value: number): void {
    this.levelMultiplier = value;
  }

  getLevelMultiplier(): number {
    return this.levelMultiplier;
  }

  // === EFFECTS (Layer 3) ===

  applyEffect(effect: SpeedEffect, multiplier: number): void {
    this.effectMultipliers.set(effect, multiplier);
  }

  removeEffect(effect: SpeedEffect): void {
    this.effectMultipliers.delete(effect);
  }

  hasEffect(effect: SpeedEffect): boolean {
    return this.effectMultipliers.has(effect);
  }

  clearAllEffects(): void {
    this.effectMultipliers.clear();
  }

  // === CALCULATED SPEED ===

  /**
   * Get the effective speed with all multipliers applied
   * Use this for velocity calculations during gameplay
   */
  getEffectiveSpeed(): number {
    let speed = BALL_SPEED_BASE * this.difficultyMultiplier * this.levelMultiplier;

    // Apply all active effect multipliers (multiplicative)
    for (const multiplier of this.effectMultipliers.values()) {
      speed *= multiplier;
    }

    return speed;
  }

  /**
   * Get base speed without effects (for spawning new balls)
   * Effects are applied separately after spawn
   */
  getBaseSpeed(): number {
    return BALL_SPEED_BASE * this.difficultyMultiplier * this.levelMultiplier;
  }

  // === PERSISTENCE ===

  private loadSettings(): SpeedSettings {
    try {
      const saved = localStorage.getItem(BallSpeedManager.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          difficultyMultiplier:
            parsed.difficultyMultiplier ?? BallSpeedManager.DEFAULT_DIFFICULTY,
        };
      }
    } catch (e) {
      console.warn('Failed to load speed settings:', e);
    }
    return { difficultyMultiplier: BallSpeedManager.DEFAULT_DIFFICULTY };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(
        BallSpeedManager.STORAGE_KEY,
        JSON.stringify({
          difficultyMultiplier: this.difficultyMultiplier,
        })
      );
    } catch (e) {
      console.warn('Failed to save speed settings:', e);
    }
  }
}
