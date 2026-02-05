/**
 * ShopManager — Singleton managing purchases and equipped cosmetic items
 *
 * Handles:
 * - Purchasing items using CurrencyManager
 * - Equipping/unequipping cosmetics
 * - Persistence via localStorage
 */

import { CurrencyManager } from './CurrencyManager';
import {
  ShopCategory,
  type ShopItem,
  type PaddleSkinConfig,
  type BallTrailConfig,
  PADDLE_SKINS,
  BALL_TRAILS,
} from '../types/ShopTypes';

interface ShopSaveData {
  purchases: string[];
  equipped: Record<string, string>;
}

export class ShopManager {
  private static instance: ShopManager | null = null;
  private purchases: Set<string>;
  private equipped: Record<ShopCategory, string>;
  private static STORAGE_KEY = 'genos-block-party-shop';

  private constructor() {
    this.purchases = new Set<string>();
    this.equipped = {
      [ShopCategory.PADDLE_SKIN]: 'default',
      [ShopCategory.BALL_TRAIL]: 'default',
    };
    this.load();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ShopManager {
    if (!ShopManager.instance) {
      ShopManager.instance = new ShopManager();
    }
    return ShopManager.instance;
  }

  /**
   * Check if an item has been purchased (default items always count as purchased)
   */
  isPurchased(itemId: string): boolean {
    if (itemId === 'default') return true;
    return this.purchases.has(itemId);
  }

  /**
   * Check if an item is currently equipped
   */
  isEquipped(itemId: string): boolean {
    return (
      this.equipped[ShopCategory.PADDLE_SKIN] === itemId ||
      this.equipped[ShopCategory.BALL_TRAIL] === itemId
    );
  }

  /**
   * Get the currently equipped item ID for a category
   */
  getEquipped(category: ShopCategory): string {
    return this.equipped[category];
  }

  /**
   * Purchase an item using the CurrencyManager
   * @returns true if purchase was successful
   */
  purchase(item: ShopItem): boolean {
    // Already purchased
    if (this.isPurchased(item.id)) return true;

    // Free items are always purchasable
    if (item.price === 0) {
      this.purchases.add(item.id);
      this.save();
      return true;
    }

    // Try to spend currency
    const currencyManager = CurrencyManager.getInstance();
    if (!currencyManager.spendCurrency(item.price)) {
      return false; // Insufficient funds
    }

    this.purchases.add(item.id);
    this.save();
    return true;
  }

  /**
   * Equip an item (must be purchased first)
   */
  equip(itemId: string, category: ShopCategory): void {
    if (!this.isPurchased(itemId)) return;
    this.equipped[category] = itemId;
    this.save();
  }

  /**
   * Get the full config for the currently equipped paddle skin
   */
  getEquippedPaddleSkin(): PaddleSkinConfig {
    const equippedId = this.equipped[ShopCategory.PADDLE_SKIN];
    return (
      PADDLE_SKINS.find((s) => s.id === equippedId) ?? PADDLE_SKINS[0]
    );
  }

  /**
   * Get the full config for the currently equipped ball trail
   * Returns null if 'default' (no trail)
   */
  getEquippedBallTrail(): BallTrailConfig | null {
    const equippedId = this.equipped[ShopCategory.BALL_TRAIL];
    if (equippedId === 'default') return null;
    return BALL_TRAILS.find((t) => t.id === equippedId) ?? null;
  }

  /**
   * Save state to localStorage
   */
  private save(): void {
    try {
      const data: ShopSaveData = {
        purchases: Array.from(this.purchases),
        equipped: { ...this.equipped },
      };
      localStorage.setItem(ShopManager.STORAGE_KEY, JSON.stringify(data));
    } catch {
      console.warn('ShopManager: Could not save to localStorage');
    }
  }

  /**
   * Load state from localStorage
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(ShopManager.STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored) as ShopSaveData;

      if (Array.isArray(data.purchases)) {
        for (const id of data.purchases) {
          this.purchases.add(id);
        }
      }

      if (data.equipped) {
        if (data.equipped[ShopCategory.PADDLE_SKIN]) {
          this.equipped[ShopCategory.PADDLE_SKIN] =
            data.equipped[ShopCategory.PADDLE_SKIN];
        }
        if (data.equipped[ShopCategory.BALL_TRAIL]) {
          this.equipped[ShopCategory.BALL_TRAIL] =
            data.equipped[ShopCategory.BALL_TRAIL];
        }
      }
    } catch {
      console.warn('ShopManager: Could not load from localStorage');
    }
  }
}
