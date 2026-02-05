import { CURRENCY } from '../config/Constants';

/**
 * CurrencyManager - Singleton for managing player currency
 *
 * Features:
 * - Persistent storage via localStorage
 * - Score-to-currency conversion with tiered square root algorithm
 * - Transaction methods for future shop features
 */
export class CurrencyManager {
  private static instance: CurrencyManager | null = null;
  private totalCurrency: number = 0;

  private constructor() {
    this.loadCurrency();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): CurrencyManager {
    if (!CurrencyManager.instance) {
      CurrencyManager.instance = new CurrencyManager();
    }
    return CurrencyManager.instance;
  }

  /**
   * Reset singleton instance (for testing only)
   */
  static resetInstance(): void {
    CurrencyManager.instance = null;
  }

  /**
   * Get the player's total currency
   */
  getTotalCurrency(): number {
    return this.totalCurrency;
  }

  /**
   * Award currency based on game score
   * @returns The amount of currency awarded
   */
  awardCurrencyFromScore(score: number): number {
    const amount = CurrencyManager.calculateCurrencyFromScore(score);
    this.addCurrency(amount);
    return amount;
  }

  /**
   * Add currency directly (for bonuses, purchases, etc.)
   */
  addCurrency(amount: number): void {
    if (amount <= 0) return;
    this.totalCurrency += amount;
    this.saveCurrency();
  }

  /**
   * Spend currency (for future shop features)
   * @returns true if successful, false if insufficient funds
   */
  spendCurrency(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.totalCurrency -= amount;
    this.saveCurrency();
    return true;
  }

  /**
   * Check if player can afford a purchase
   */
  canAfford(amount: number): boolean {
    return this.totalCurrency >= amount;
  }

  /**
   * Calculate currency reward from a game score
   * Uses tiered square root formula for diminishing returns with milestone bonuses
   */
  static calculateCurrencyFromScore(score: number): number {
    if (score <= 0) return 0;

    // Base: sqrt(score) * multiplier
    const base = Math.floor(Math.sqrt(score) * CURRENCY.SQRT_MULTIPLIER);

    // Tier bonuses for reaching score milestones
    let bonus = 0;
    for (let i = 0; i < CURRENCY.TIER_THRESHOLDS.length; i++) {
      if (score >= CURRENCY.TIER_THRESHOLDS[i]) {
        bonus += CURRENCY.TIER_BONUSES[i];
      }
    }

    // Minimum 1 currency for any positive score
    return Math.max(1, base + bonus);
  }

  /**
   * Load currency from localStorage
   */
  private loadCurrency(): void {
    try {
      const stored = localStorage.getItem(CURRENCY.STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          this.totalCurrency = parsed;
        }
      }
    } catch {
      // Silently fail if localStorage is unavailable
      console.warn('CurrencyManager: Could not load from localStorage');
    }
  }

  /**
   * Save currency to localStorage
   */
  private saveCurrency(): void {
    try {
      localStorage.setItem(CURRENCY.STORAGE_KEY, this.totalCurrency.toString());
    } catch {
      // Silently fail if localStorage is unavailable
      console.warn('CurrencyManager: Could not save to localStorage');
    }
  }

  /**
   * Reset currency (for testing/debug)
   */
  resetCurrency(): void {
    this.totalCurrency = 0;
    this.saveCurrency();
  }
}
