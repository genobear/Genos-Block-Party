import Phaser from 'phaser';
import { LifetimeStatsManager } from './LifetimeStatsManager';
import { CurrencyManager } from './CurrencyManager';
import { ACHIEVEMENTS } from '../config/Constants';

/**
 * Achievement type classification
 */
export type AchievementType = 'cumulative' | 'session' | 'skill';

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  coins: number;
  type: AchievementType;
  /** For cumulative achievements: the stat key to check */
  stat?: string;
  /** Threshold value to reach */
  threshold?: number;
}

/**
 * Session state for tracking session-based achievements
 */
interface SessionState {
  highestLevelThisSession: number;
  livesLostPerLevel: Map<number, boolean>; // true if ANY lives were lost on that level
  highestFireballStack: number;
  highestMultiplier: number;
  sessionScore: number;
  highestEndlessWave: number;
  isEndlessMode: boolean;
}

/**
 * All achievement definitions
 */
export const ACHIEVEMENT_LIST: Achievement[] = [
  // Level completion achievements
  {
    id: 'party_starter',
    name: 'Party Starter',
    description: 'Complete Level 1',
    coins: 10,
    type: 'session',
    threshold: 1,
  },
  {
    id: 'halfway_there',
    name: 'Halfway There',
    description: 'Complete Level 5',
    coins: 25,
    type: 'session',
    threshold: 5,
  },
  {
    id: 'party_master',
    name: 'Party Master',
    description: 'Complete all 10 levels',
    coins: 100,
    type: 'session',
    threshold: 10,
  },
  // Flawless level achievements
  {
    id: 'flawless_one',
    name: 'Flawless Start',
    description: 'Clear Level 1 without losing a life',
    coins: 20,
    type: 'session',
    threshold: 1,
  },
  {
    id: 'flawless_five',
    name: 'Flawless Five',
    description: 'Clear Level 5 without losing a life',
    coins: 50,
    type: 'session',
    threshold: 5,
  },
  {
    id: 'flawless_ten',
    name: 'Perfect Party',
    description: 'Clear Level 10 without losing a life',
    coins: 100,
    type: 'session',
    threshold: 10,
  },
  // Skill-based achievements
  {
    id: 'fire_lord',
    name: 'Fire Lord',
    description: 'Stack Fireball to level 5',
    coins: 75,
    type: 'skill',
    threshold: 5,
  },
  {
    id: 'combo_king',
    name: 'Combo King',
    description: 'Reach 5x multiplier',
    coins: 50,
    type: 'skill',
    threshold: 5,
  },
  // Cumulative achievements
  {
    id: 'power_collector',
    name: 'Power Collector',
    description: 'Collect 100 power-ups (lifetime)',
    coins: 25,
    type: 'cumulative',
    stat: 'totalPowerUpsCollected',
    threshold: 100,
  },
  {
    id: 'brick_breaker',
    name: 'Brick Breaker',
    description: 'Destroy 500 bricks (lifetime)',
    coins: 25,
    type: 'cumulative',
    stat: 'totalBricksDestroyed',
    threshold: 500,
  },
  // Score achievement
  {
    id: 'score_hunter',
    name: 'Score Hunter',
    description: 'Reach 10,000 score in one game',
    coins: 30,
    type: 'session',
    threshold: 10000,
  },
  // Endless mode achievements
  {
    id: 'endless_five',
    name: 'Endless Explorer',
    description: 'Reach wave 5 in Endless Mode',
    coins: 30,
    type: 'session',
    threshold: 5,
  },
  {
    id: 'endless_ten',
    name: 'Endless Warrior',
    description: 'Reach wave 10 in Endless Mode',
    coins: 50,
    type: 'session',
    threshold: 10,
  },
  // Games played achievement
  {
    id: 'party_animal',
    name: 'Party Animal',
    description: 'Play 10 games',
    coins: 15,
    type: 'cumulative',
    stat: 'gamesPlayed',
    threshold: 10,
  },
];

/**
 * AchievementManager - Singleton that checks and manages achievement unlocks
 *
 * Features:
 * - Checks achievements against lifetime stats and session state
 * - Tracks achieved achievements in localStorage
 * - Awards coins via CurrencyManager when achievements are unlocked
 * - Emits events when achievements are unlocked
 * - Session state tracking for session-based achievements
 */
export class AchievementManager extends Phaser.Events.EventEmitter {
  private static instance: AchievementManager | null = null;
  private unlockedAchievements: Set<string>;
  private sessionState: SessionState;

  private constructor() {
    super();
    this.unlockedAchievements = new Set();
    this.sessionState = this.createEmptySessionState();
    this.load();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AchievementManager {
    if (!AchievementManager.instance) {
      AchievementManager.instance = new AchievementManager();
    }
    return AchievementManager.instance;
  }

  /**
   * Reset singleton instance (for testing only)
   */
  static resetInstance(): void {
    AchievementManager.instance = null;
  }

  /**
   * Create empty session state
   */
  private createEmptySessionState(): SessionState {
    return {
      highestLevelThisSession: 0,
      livesLostPerLevel: new Map(),
      highestFireballStack: 0,
      highestMultiplier: 1,
      sessionScore: 0,
      highestEndlessWave: 0,
      isEndlessMode: false,
    };
  }

  /**
   * Start a new game session - reset session tracking
   */
  startSession(isEndlessMode: boolean = false): void {
    this.sessionState = this.createEmptySessionState();
    this.sessionState.isEndlessMode = isEndlessMode;
  }

  /**
   * End the current session with final score and level
   */
  endSession(score: number, level: number): void {
    this.sessionState.sessionScore = score;
    this.sessionState.highestLevelThisSession = Math.max(
      this.sessionState.highestLevelThisSession,
      level
    );
  }

  /**
   * Record level completion
   * @param level 1-indexed level number
   * @param livesLostThisLevel Whether any lives were lost on this specific level
   */
  recordLevelComplete(level: number, livesLostThisLevel: boolean): void {
    this.sessionState.highestLevelThisSession = Math.max(
      this.sessionState.highestLevelThisSession,
      level
    );
    this.sessionState.livesLostPerLevel.set(level, livesLostThisLevel);
  }

  /**
   * Record fireball stack level
   */
  recordFireballStack(level: number): void {
    this.sessionState.highestFireballStack = Math.max(
      this.sessionState.highestFireballStack,
      level
    );
  }

  /**
   * Record multiplier value
   */
  recordMultiplier(value: number): void {
    this.sessionState.highestMultiplier = Math.max(
      this.sessionState.highestMultiplier,
      value
    );
  }

  /**
   * Record endless wave completion
   */
  recordEndlessWave(wave: number): void {
    this.sessionState.highestEndlessWave = Math.max(
      this.sessionState.highestEndlessWave,
      wave
    );
  }

  /**
   * Check all achievements and return newly unlocked ones
   * Also awards coins for each newly unlocked achievement
   */
  checkAchievements(): Achievement[] {
    const stats = LifetimeStatsManager.getInstance().getStats();
    const currencyManager = CurrencyManager.getInstance();
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of ACHIEVEMENT_LIST) {
      // Skip already unlocked
      if (this.unlockedAchievements.has(achievement.id)) continue;

      let isUnlocked = false;

      switch (achievement.type) {
        case 'cumulative':
          isUnlocked = this.checkCumulativeAchievement(achievement, stats);
          break;
        case 'session':
          isUnlocked = this.checkSessionAchievement(achievement);
          break;
        case 'skill':
          isUnlocked = this.checkSkillAchievement(achievement);
          break;
      }

      if (isUnlocked) {
        this.unlockedAchievements.add(achievement.id);
        newlyUnlocked.push(achievement);

        // Award coins
        currencyManager.addCurrency(achievement.coins);

        // Emit event
        this.emit('achievementUnlocked', achievement);
      }
    }

    if (newlyUnlocked.length > 0) {
      this.save();
    }

    return newlyUnlocked;
  }

  /**
   * Check cumulative achievement against lifetime stats
   */
  private checkCumulativeAchievement(
    achievement: Achievement,
    stats: ReturnType<typeof LifetimeStatsManager.prototype.getStats>
  ): boolean {
    if (!achievement.stat || !achievement.threshold) return false;

    const value = stats[achievement.stat as keyof typeof stats];
    if (typeof value === 'number') {
      return value >= achievement.threshold;
    }
    return false;
  }

  /**
   * Check session-based achievement
   */
  private checkSessionAchievement(achievement: Achievement): boolean {
    if (!achievement.threshold) return false;

    switch (achievement.id) {
      // Level completion achievements
      case 'party_starter':
      case 'halfway_there':
      case 'party_master':
        return this.sessionState.highestLevelThisSession >= achievement.threshold;

      // Flawless achievements - check if level was completed without lives lost
      case 'flawless_one':
      case 'flawless_five':
      case 'flawless_ten':
        return this.checkFlawlessLevel(achievement.threshold);

      // Score achievement
      case 'score_hunter':
        return this.sessionState.sessionScore >= achievement.threshold;

      // Endless mode achievements
      case 'endless_five':
      case 'endless_ten':
        return (
          this.sessionState.isEndlessMode &&
          this.sessionState.highestEndlessWave >= achievement.threshold
        );

      default:
        return false;
    }
  }

  /**
   * Check if a specific level was completed flawlessly (no lives lost on that level)
   */
  private checkFlawlessLevel(level: number): boolean {
    // Must have completed the level
    if (this.sessionState.highestLevelThisSession < level) return false;

    // Check if lives were lost on that specific level
    const livesLost = this.sessionState.livesLostPerLevel.get(level);
    return livesLost === false;
  }

  /**
   * Check skill-based achievement
   */
  private checkSkillAchievement(achievement: Achievement): boolean {
    if (!achievement.threshold) return false;

    switch (achievement.id) {
      case 'fire_lord':
        return this.sessionState.highestFireballStack >= achievement.threshold;
      case 'combo_king':
        return this.sessionState.highestMultiplier >= achievement.threshold;
      default:
        return false;
    }
  }

  /**
   * Check if a specific achievement is unlocked
   */
  isUnlocked(achievementId: string): boolean {
    return this.unlockedAchievements.has(achievementId);
  }

  /**
   * Get progress for a specific achievement (for display purposes)
   */
  getProgress(achievementId: string): { current: number; target: number; percent: number } {
    const achievement = ACHIEVEMENT_LIST.find((a) => a.id === achievementId);
    if (!achievement || !achievement.threshold) {
      return { current: 0, target: 0, percent: 0 };
    }

    let current = 0;

    if (achievement.type === 'cumulative' && achievement.stat) {
      const stats = LifetimeStatsManager.getInstance().getStats();
      const value = stats[achievement.stat as keyof typeof stats];
      if (typeof value === 'number') {
        current = value;
      }
    } else if (achievement.type === 'session' || achievement.type === 'skill') {
      // For session/skill achievements, show session-based progress if in session
      // Otherwise show 0 (they need to be achieved in a single session)
      switch (achievement.id) {
        case 'party_starter':
        case 'halfway_there':
        case 'party_master':
          current = this.sessionState.highestLevelThisSession;
          break;
        case 'score_hunter':
          current = this.sessionState.sessionScore;
          break;
        case 'endless_five':
        case 'endless_ten':
          current = this.sessionState.highestEndlessWave;
          break;
        case 'fire_lord':
          current = this.sessionState.highestFireballStack;
          break;
        case 'combo_king':
          current = this.sessionState.highestMultiplier;
          break;
        // Flawless achievements don't have progress - they're binary
        default:
          current = 0;
      }
    }

    const percent = Math.min(100, (current / achievement.threshold) * 100);
    return { current, target: achievement.threshold, percent };
  }

  /**
   * Get all achievements
   */
  getAllAchievements(): Achievement[] {
    return [...ACHIEVEMENT_LIST];
  }

  /**
   * Get count of unlocked achievements
   */
  getUnlockedCount(): number {
    return this.unlockedAchievements.size;
  }

  /**
   * Get total achievements count
   */
  getTotalCount(): number {
    return ACHIEVEMENT_LIST.length;
  }

  /**
   * Load unlocked achievements from localStorage
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(ACHIEVEMENTS.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          for (const id of parsed) {
            this.unlockedAchievements.add(id);
          }
        }
      }
    } catch {
      console.warn('AchievementManager: Could not load from localStorage');
    }
  }

  /**
   * Save unlocked achievements to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(
        ACHIEVEMENTS.STORAGE_KEY,
        JSON.stringify(Array.from(this.unlockedAchievements))
      );
    } catch {
      console.warn('AchievementManager: Could not save to localStorage');
    }
  }

  /**
   * Reset all achievements (for testing/debug)
   */
  resetAchievements(): void {
    this.unlockedAchievements.clear();
    this.sessionState = this.createEmptySessionState();
    this.save();
  }
}
