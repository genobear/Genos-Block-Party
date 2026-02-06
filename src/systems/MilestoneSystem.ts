import Phaser from 'phaser';
import { LifetimeStatsManager, LifetimeStats } from './LifetimeStatsManager';
import { ShopManager } from './ShopManager';

/**
 * Milestone reward types
 */
export interface MilestoneReward {
  type: 'paddleSkin' | 'ballTrail' | 'title';
  id: string;
}

/**
 * Milestone definition
 */
export interface Milestone {
  id: string;
  name: string;
  description: string;
  stat: keyof LifetimeStats | string; // Can be 'powerUp_fireball', etc.
  threshold: number;
  reward: MilestoneReward;
}

/**
 * Milestone progress info
 */
export interface MilestoneProgress {
  current: number;
  target: number;
  percent: number;
}

/**
 * All milestone definitions
 */
export const MILESTONES: Milestone[] = [
  {
    id: 'brick_basher',
    name: 'Brick Basher',
    description: 'Destroy 500 bricks',
    stat: 'totalBricksDestroyed',
    threshold: 500,
    reward: { type: 'paddleSkin', id: 'bash' },
  },
  {
    id: 'block_buster',
    name: 'Block Buster',
    description: 'Destroy 2,500 bricks',
    stat: 'totalBricksDestroyed',
    threshold: 2500,
    reward: { type: 'ballTrail', id: 'crusher' },
  },
  {
    id: 'demolition_expert',
    name: 'Demolition Expert',
    description: 'Destroy 10,000 bricks',
    stat: 'totalBricksDestroyed',
    threshold: 10000,
    reward: { type: 'paddleSkin', id: 'destroyer' },
  },
  {
    id: 'power_hungry',
    name: 'Power Hungry',
    description: 'Collect 100 power-ups',
    stat: 'totalPowerUpsCollected',
    threshold: 100,
    reward: { type: 'ballTrail', id: 'power' },
  },
  {
    id: 'combo_master',
    name: 'Combo Master',
    description: 'Reach 5.0× multiplier',
    stat: 'highestMultiplier',
    threshold: 5.0,
    reward: { type: 'paddleSkin', id: 'master' },
  },
  {
    id: 'party_veteran',
    name: 'Party Veteran',
    description: 'Play 25 games',
    stat: 'gamesPlayed',
    threshold: 25,
    reward: { type: 'ballTrail', id: 'veteran' },
  },
  {
    id: 'endurance',
    name: 'Endurance',
    description: 'Accumulate 1 hour of play time',
    stat: 'totalPlayTimeMs',
    threshold: 3600000, // 1 hour in ms
    reward: { type: 'paddleSkin', id: 'time' },
  },
  {
    id: 'perfect_run',
    name: 'Perfect Run',
    description: 'Complete a game without losing a life',
    stat: 'perfectGames',
    threshold: 1,
    reward: { type: 'ballTrail', id: 'flawless' },
  },
];

/**
 * Mapping from milestone IDs to cosmetic item IDs for shop integration
 */
export const MILESTONE_TO_ITEM: Record<string, string> = {
  'brick_basher': 'bash',
  'block_buster': 'crusher',
  'demolition_expert': 'destroyer',
  'power_hungry': 'power',
  'combo_master': 'master',
  'party_veteran': 'veteran',
  'endurance': 'time',
  'perfect_run': 'flawless',
};

/**
 * Reverse mapping from item IDs to milestone IDs
 */
export const ITEM_TO_MILESTONE: Record<string, string> = Object.entries(MILESTONE_TO_ITEM)
  .reduce((acc, [milestoneId, itemId]) => {
    acc[itemId] = milestoneId;
    return acc;
  }, {} as Record<string, string>);

/**
 * MilestoneSystem - Singleton that checks and manages milestone achievements
 *
 * Features:
 * - Checks milestones against lifetime stats
 * - Tracks achieved milestones in localStorage
 * - Emits events when milestones are achieved
 * - Unlocks cosmetic rewards in ShopManager
 */
export class MilestoneSystem extends Phaser.Events.EventEmitter {
  private static instance: MilestoneSystem | null = null;
  private achievedMilestones: Set<string>;
  private static STORAGE_KEY = 'genos-block-party-milestones';

  private constructor() {
    super();
    this.achievedMilestones = new Set();
    this.load();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): MilestoneSystem {
    if (!MilestoneSystem.instance) {
      MilestoneSystem.instance = new MilestoneSystem();
    }
    return MilestoneSystem.instance;
  }

  /**
   * Reset singleton instance (for testing only)
   */
  static resetInstance(): void {
    MilestoneSystem.instance = null;
  }

  /**
   * Check all milestones and return newly achieved ones
   * Also unlocks rewards in ShopManager
   */
  checkMilestones(): Milestone[] {
    const stats = LifetimeStatsManager.getInstance().getStats();
    const newlyAchieved: Milestone[] = [];

    for (const milestone of MILESTONES) {
      // Skip already achieved
      if (this.achievedMilestones.has(milestone.id)) continue;

      const currentValue = this.getStatValue(stats, milestone.stat);
      if (currentValue >= milestone.threshold) {
        // Mark as achieved
        this.achievedMilestones.add(milestone.id);
        newlyAchieved.push(milestone);

        // Unlock the reward in ShopManager
        this.unlockReward(milestone.reward);

        // Emit event
        this.emit('milestoneAchieved', milestone);
      }
    }

    if (newlyAchieved.length > 0) {
      this.save();
    }

    return newlyAchieved;
  }

  /**
   * Check if a specific milestone is achieved
   */
  isAchieved(milestoneId: string): boolean {
    return this.achievedMilestones.has(milestoneId);
  }

  /**
   * Get progress for a specific milestone
   */
  getProgress(milestoneId: string): MilestoneProgress {
    const milestone = MILESTONES.find(m => m.id === milestoneId);
    if (!milestone) {
      return { current: 0, target: 0, percent: 0 };
    }

    const stats = LifetimeStatsManager.getInstance().getStats();
    const current = this.getStatValue(stats, milestone.stat);
    const percent = Math.min(100, (current / milestone.threshold) * 100);

    return {
      current,
      target: milestone.threshold,
      percent,
    };
  }

  /**
   * Get all milestones
   */
  getAllMilestones(): Milestone[] {
    return [...MILESTONES];
  }

  /**
   * Get value from stats based on stat key
   */
  private getStatValue(stats: LifetimeStats, stat: string): number {
    // Handle power-up specific stats
    if (stat.startsWith('powerUp_')) {
      const powerUpType = stat.replace('powerUp_', '');
      return stats.powerUpsByType[powerUpType] || 0;
    }

    // Handle regular stats
    const value = stats[stat as keyof LifetimeStats];
    if (typeof value === 'number') {
      return value;
    }

    return 0;
  }

  /**
   * Unlock a reward in ShopManager
   */
  private unlockReward(reward: MilestoneReward): void {
    const shopManager = ShopManager.getInstance();
    
    // For milestone rewards, we mark them as "purchased" so they can be equipped
    // The ShopManager's purchases set handles this
    if (reward.type === 'paddleSkin' || reward.type === 'ballTrail') {
      // Access the purchases set through a method that marks the item as owned
      shopManager.unlockMilestoneReward(reward.id);
    }
  }

  /**
   * Load achieved milestones from localStorage
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(MilestoneSystem.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          for (const id of parsed) {
            this.achievedMilestones.add(id);
          }
        }
      }
    } catch {
      console.warn('MilestoneSystem: Could not load from localStorage');
    }
  }

  /**
   * Save achieved milestones to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(
        MilestoneSystem.STORAGE_KEY,
        JSON.stringify(Array.from(this.achievedMilestones))
      );
    } catch {
      console.warn('MilestoneSystem: Could not save to localStorage');
    }
  }

  /**
   * Reset all milestones (for testing/debug)
   */
  resetMilestones(): void {
    this.achievedMilestones.clear();
    this.save();
  }

  /**
   * Get the milestone name for a given item ID (for shop display)
   */
  static getMilestoneNameForItem(itemId: string): string | null {
    const milestoneId = ITEM_TO_MILESTONE[itemId];
    if (!milestoneId) return null;
    
    const milestone = MILESTONES.find(m => m.id === milestoneId);
    return milestone?.name || null;
  }
}
