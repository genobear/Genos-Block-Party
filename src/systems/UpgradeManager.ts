import { CurrencyManager } from './CurrencyManager';

/**
 * UpgradeManager - Singleton for managing permanent upgrades
 *
 * Features:
 * - Persistent storage via localStorage
 * - Tiered upgrades with increasing costs
 * - Remix Boost: increases power-up drop chances additively
 */
export class UpgradeManager {
  private static instance: UpgradeManager | null = null;
  private static STORAGE_KEY = 'genos-block-party-upgrades';

  // Remix Boost tiers: [0, 1, 2, 3]
  private remixBoostTier: number = 0;

  // Tier costs (cost to upgrade TO the next tier)
  private static REMIX_BOOST_COSTS = [50, 150, 400];
  // Tier bonuses (additive to base drop chance)
  private static REMIX_BOOST_BONUSES = [0, 0.05, 0.10, 0.15];

  private constructor() {
    this.load();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): UpgradeManager {
    if (!UpgradeManager.instance) {
      UpgradeManager.instance = new UpgradeManager();
    }
    return UpgradeManager.instance;
  }

  /**
   * Reset singleton instance (for testing only)
   */
  static resetInstance(): void {
    UpgradeManager.instance = null;
  }

  /**
   * Get current Remix Boost tier (0-3)
   */
  getRemixBoostTier(): number {
    return this.remixBoostTier;
  }

  /**
   * Get the current Remix Boost bonus (additive to base drop chance)
   */
  getRemixBoostBonus(): number {
    return UpgradeManager.REMIX_BOOST_BONUSES[this.remixBoostTier];
  }

  /**
   * Get the cost to upgrade to the next tier
   * @returns cost in coins, or null if already maxed
   */
  getNextRemixBoostCost(): number | null {
    if (this.remixBoostTier >= 3) return null;
    return UpgradeManager.REMIX_BOOST_COSTS[this.remixBoostTier];
  }

  /**
   * Check if Remix Boost is at max tier
   */
  isRemixBoostMaxed(): boolean {
    return this.remixBoostTier >= 3;
  }

  /**
   * Attempt to upgrade Remix Boost to the next tier
   * @returns true if upgrade succeeded, false if not enough currency or already maxed
   */
  upgradeRemixBoost(): boolean {
    const cost = this.getNextRemixBoostCost();
    if (cost === null) return false;

    const currency = CurrencyManager.getInstance();
    if (!currency.spendCurrency(cost)) return false;

    this.remixBoostTier++;
    this.save();
    return true;
  }

  /**
   * Save upgrades to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(
        UpgradeManager.STORAGE_KEY,
        JSON.stringify({ remixBoostTier: this.remixBoostTier })
      );
    } catch {
      console.warn('UpgradeManager: Could not save to localStorage');
    }
  }

  /**
   * Load upgrades from localStorage
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(UpgradeManager.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.remixBoostTier === 'number' && parsed.remixBoostTier >= 0 && parsed.remixBoostTier <= 3) {
          this.remixBoostTier = parsed.remixBoostTier;
        }
      }
    } catch {
      console.warn('UpgradeManager: Could not load from localStorage');
    }
  }

  /**
   * Reset all upgrades (for testing/debug)
   */
  resetUpgrades(): void {
    this.remixBoostTier = 0;
    this.save();
  }
}
