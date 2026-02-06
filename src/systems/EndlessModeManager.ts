/**
 * EndlessModeManager - Singleton for managing Endless Mode state
 *
 * Features:
 * - Unlock tracking (requires completing level 10)
 * - Wave progression
 * - Checkpoint system (every 5 waves)
 * - Difficulty scaling
 * - Procedural wave generation
 */

import { ENDLESS_MODE } from '../config/Constants';
import { BrickConfig } from '../types/BrickTypes';
import { generateBrickPattern, getDifficultyParams } from '../utils/proceduralBricks';

export class EndlessModeManager {
  private static instance: EndlessModeManager | null = null;

  private currentWave: number = 0;
  private highestWave: number = 0;
  private isActive: boolean = false;

  private constructor() {
    this.loadHighestWave();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): EndlessModeManager {
    if (!EndlessModeManager.instance) {
      EndlessModeManager.instance = new EndlessModeManager();
    }
    return EndlessModeManager.instance;
  }

  /**
   * Reset singleton instance (for testing only)
   */
  static resetInstance(): void {
    EndlessModeManager.instance = null;
  }

  /**
   * Check if Endless Mode is unlocked
   * Requires completing all 10 campaign levels
   */
  isUnlocked(): boolean {
    try {
      // Check for explicit unlock flag
      const unlocked = localStorage.getItem(ENDLESS_MODE.STORAGE_KEY);
      if (unlocked === 'true') return true;

      // Check for level progress (level 10 completed)
      const progress = localStorage.getItem(ENDLESS_MODE.LEVEL_PROGRESS_KEY);
      if (progress) {
        const level = parseInt(progress, 10);
        return level >= 10;
      }
    } catch {
      // localStorage unavailable
    }
    return false;
  }

  /**
   * Unlock Endless Mode (called on campaign completion)
   */
  unlockEndlessMode(): void {
    try {
      localStorage.setItem(ENDLESS_MODE.STORAGE_KEY, 'true');
    } catch {
      // localStorage unavailable
    }
  }

  /**
   * Start a new endless mode session
   */
  startSession(): void {
    this.currentWave = 0;
    this.isActive = true;
  }

  /**
   * End the current endless mode session
   */
  endSession(): void {
    if (this.currentWave > this.highestWave) {
      this.highestWave = this.currentWave;
      this.saveHighestWave();
    }
    this.isActive = false;
  }

  /**
   * Check if endless mode session is active
   */
  isSessionActive(): boolean {
    return this.isActive;
  }

  /**
   * Get the current wave number (1-indexed for display)
   */
  getCurrentWave(): number {
    return this.currentWave;
  }

  /**
   * Advance to the next wave
   */
  nextWave(): number {
    this.currentWave++;
    return this.currentWave;
  }

  /**
   * Get the current checkpoint number
   * Checkpoint is floor(wave / CHECKPOINT_INTERVAL)
   */
  getCheckpoint(): number {
    return Math.floor(this.currentWave / ENDLESS_MODE.CHECKPOINT_INTERVAL);
  }

  /**
   * Check if current wave is a checkpoint wave
   */
  isCheckpointWave(): boolean {
    return this.currentWave > 0 && this.currentWave % ENDLESS_MODE.CHECKPOINT_INTERVAL === 0;
  }

  /**
   * Get the highest wave ever reached
   */
  getHighestWave(): number {
    return this.highestWave;
  }

  /**
   * Generate bricks for the current wave
   */
  generateWave(waveNumber?: number): BrickConfig[] {
    const wave = waveNumber ?? this.currentWave;
    return generateBrickPattern(wave);
  }

  /**
   * Get difficulty multiplier for the current wave
   * Affects brick HP and density
   */
  getDifficultyMultiplier(wave?: number): number {
    const w = wave ?? this.currentWave;
    return 1 + (w * ENDLESS_MODE.DIFFICULTY_RAMP_RATE);
  }

  /**
   * Get ball speed multiplier for the current wave
   */
  getSpeedMultiplier(wave?: number): number {
    const w = wave ?? this.currentWave;
    const { speedMultiplier } = getDifficultyParams(w);
    return speedMultiplier;
  }

  /**
   * Calculate currency bonus for endless mode based on waves reached
   */
  calculateCurrencyBonus(wavesReached: number): number {
    return wavesReached * ENDLESS_MODE.CURRENCY_PER_WAVE;
  }

  /**
   * Get wave display name (e.g., "Wave 5")
   */
  getWaveDisplayName(wave?: number): string {
    const w = wave ?? this.currentWave;
    return `Wave ${w}`;
  }

  /**
   * Load highest wave from localStorage
   */
  private loadHighestWave(): void {
    try {
      const stored = localStorage.getItem('genos-block-party-endless-highest-wave');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          this.highestWave = parsed;
        }
      }
    } catch {
      // localStorage unavailable
    }
  }

  /**
   * Save highest wave to localStorage
   */
  private saveHighestWave(): void {
    try {
      localStorage.setItem('genos-block-party-endless-highest-wave', this.highestWave.toString());
    } catch {
      // localStorage unavailable
    }
  }
}
