import { STATS } from '../config/Constants';

/**
 * LifetimeStats - Tracks all-time player statistics
 */
export interface LifetimeStats {
  totalBricksDestroyed: number;
  totalPowerUpsCollected: number;
  powerUpsByType: Record<string, number>;
  gamesPlayed: number;
  totalPlayTimeMs: number;
  highestMultiplier: number;
  totalScoreEarned: number;
  highestLevel: number;
  perfectGames: number;
}

/**
 * LifetimeStatsManager - Singleton for managing persistent lifetime statistics
 *
 * Features:
 * - Persistent storage via localStorage
 * - Tracks bricks destroyed, power-ups collected, games played, etc.
 * - Records perfect games (no lives lost)
 */
export class LifetimeStatsManager {
  private static instance: LifetimeStatsManager | null = null;
  private stats: LifetimeStats;

  // Track current game state for perfect game detection
  private currentGameLivesLost: number = 0;

  private constructor() {
    this.stats = { ...STATS.INITIAL };
    this.load();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): LifetimeStatsManager {
    if (!LifetimeStatsManager.instance) {
      LifetimeStatsManager.instance = new LifetimeStatsManager();
    }
    return LifetimeStatsManager.instance;
  }

  /**
   * Reset singleton instance (for testing only)
   */
  static resetInstance(): void {
    LifetimeStatsManager.instance = null;
  }

  /**
   * Get all lifetime stats
   */
  getStats(): LifetimeStats {
    return { ...this.stats };
  }

  /**
   * Record brick(s) destroyed
   */
  recordBrickDestroyed(count: number = 1): void {
    this.stats.totalBricksDestroyed += count;
    this.save();
  }

  /**
   * Record power-up collected
   */
  recordPowerUpCollected(type: string): void {
    this.stats.totalPowerUpsCollected++;
    this.stats.powerUpsByType[type] = (this.stats.powerUpsByType[type] || 0) + 1;
    this.save();
  }

  /**
   * Record game start
   */
  recordGameStart(): void {
    this.stats.gamesPlayed++;
    this.currentGameLivesLost = 0;
    this.save();
  }

  /**
   * Record game end with final score, level reached, and lives lost
   */
  recordGameEnd(score: number, level: number, livesLost: number): void {
    this.stats.totalScoreEarned += score;
    this.currentGameLivesLost = livesLost;

    // Track highest level (1-indexed for display)
    if (level > this.stats.highestLevel) {
      this.stats.highestLevel = level;
    }

    // Check for perfect game (completed all levels without losing a life)
    // Level 10 = final level, livesLost = 0 means perfect
    if (level >= 10 && livesLost === 0) {
      this.stats.perfectGames++;
    }

    this.save();
  }

  /**
   * Record a life lost (for tracking during gameplay)
   */
  recordLifeLost(): void {
    this.currentGameLivesLost++;
  }

  /**
   * Update highest multiplier if current is higher
   */
  updateHighestMultiplier(multiplier: number): void {
    if (multiplier > this.stats.highestMultiplier) {
      this.stats.highestMultiplier = multiplier;
      this.save();
    }
  }

  /**
   * Update play time (call from game update loop)
   */
  updatePlayTime(deltaMs: number): void {
    this.stats.totalPlayTimeMs += deltaMs;
    // Save periodically (every 10 seconds of play time)
    if (Math.floor(this.stats.totalPlayTimeMs / 10000) !==
        Math.floor((this.stats.totalPlayTimeMs - deltaMs) / 10000)) {
      this.save();
    }
  }

  /**
   * Get current game lives lost (for game end calculation)
   */
  getCurrentGameLivesLost(): number {
    return this.currentGameLivesLost;
  }

  /**
   * Load stats from localStorage
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(STATS.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<LifetimeStats>;
        // Merge with defaults to handle new fields
        this.stats = {
          ...STATS.INITIAL,
          ...parsed,
          // Ensure powerUpsByType is an object
          powerUpsByType: {
            ...STATS.INITIAL.powerUpsByType,
            ...(parsed.powerUpsByType || {}),
          },
        };
      }
    } catch {
      console.warn('LifetimeStatsManager: Could not load from localStorage');
    }
  }

  /**
   * Save stats to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(STATS.STORAGE_KEY, JSON.stringify(this.stats));
    } catch {
      console.warn('LifetimeStatsManager: Could not save to localStorage');
    }
  }

  /**
   * Reset all stats (for testing/debug)
   */
  resetStats(): void {
    this.stats = { ...STATS.INITIAL };
    this.save();
  }
}
