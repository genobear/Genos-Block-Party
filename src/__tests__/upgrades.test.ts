import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSpendCurrency = vi.fn();
vi.mock('../systems/CurrencyManager', () => ({
  CurrencyManager: {
    getInstance: () => ({ spendCurrency: mockSpendCurrency }),
  },
}));

import { UpgradeManager } from '../systems/UpgradeManager';

beforeEach(() => {
  localStorage.clear();
  UpgradeManager.resetInstance();
  mockSpendCurrency.mockReset();
  mockSpendCurrency.mockReturnValue(true); // Default: can afford
});

describe('UpgradeManager', () => {
  // ── 1. Singleton ──────────────────────────────────────────────
  describe('Singleton', () => {
    it('getInstance returns the same instance', () => {
      const a = UpgradeManager.getInstance();
      const b = UpgradeManager.getInstance();
      expect(a).toBe(b);
    });

    it('resetInstance creates a new instance', () => {
      const a = UpgradeManager.getInstance();
      UpgradeManager.resetInstance();
      const b = UpgradeManager.getInstance();
      expect(a).not.toBe(b);
    });
  });

  // ── 2. Initial State ─────────────────────────────────────────
  describe('Initial State', () => {
    it('starts at tier 0, bonus 0, not maxed', () => {
      const mgr = UpgradeManager.getInstance();
      expect(mgr.getRemixBoostTier()).toBe(0);
      expect(mgr.getRemixBoostBonus()).toBe(0);
      expect(mgr.isRemixBoostMaxed()).toBe(false);
    });

    it('getNextRemixBoostCost returns 50 (first tier cost)', () => {
      const mgr = UpgradeManager.getInstance();
      expect(mgr.getNextRemixBoostCost()).toBe(50);
    });

    it('getRemixBoostBonus returns 0', () => {
      const mgr = UpgradeManager.getInstance();
      expect(mgr.getRemixBoostBonus()).toBe(0);
    });
  });

  // ── 3. Purchase Flow ─────────────────────────────────────────
  describe('Purchase Flow', () => {
    it('upgradeRemixBoost succeeds when spendCurrency returns true', () => {
      const mgr = UpgradeManager.getInstance();
      const result = mgr.upgradeRemixBoost();
      expect(result).toBe(true);
      expect(mgr.getRemixBoostTier()).toBe(1);
    });

    it('upgradeRemixBoost fails when spendCurrency returns false', () => {
      mockSpendCurrency.mockReturnValue(false);
      const mgr = UpgradeManager.getInstance();
      const result = mgr.upgradeRemixBoost();
      expect(result).toBe(false);
      expect(mgr.getRemixBoostTier()).toBe(0);
    });

    it('spendCurrency called with correct cost (50 for tier 0→1)', () => {
      const mgr = UpgradeManager.getInstance();
      mgr.upgradeRemixBoost();
      expect(mockSpendCurrency).toHaveBeenCalledWith(50);
    });

    it('after tier 1: next cost is 150, bonus is 0.05', () => {
      const mgr = UpgradeManager.getInstance();
      mgr.upgradeRemixBoost(); // 0→1
      expect(mgr.getNextRemixBoostCost()).toBe(150);
      expect(mgr.getRemixBoostBonus()).toBe(0.05);
    });

    it('after tier 2: next cost is 400, bonus is 0.10', () => {
      const mgr = UpgradeManager.getInstance();
      mgr.upgradeRemixBoost(); // 0→1
      mgr.upgradeRemixBoost(); // 1→2
      expect(mgr.getNextRemixBoostCost()).toBe(400);
      expect(mgr.getRemixBoostBonus()).toBe(0.10);
    });
  });

  // ── 4. Tier Progression ───────────────────────────────────────
  describe('Tier Progression', () => {
    const COSTS = [50, 150, 400];
    const BONUSES = [0, 0.05, 0.10, 0.15];

    it('can upgrade from 0 to 1 to 2 to 3 sequentially', () => {
      const mgr = UpgradeManager.getInstance();
      for (let tier = 1; tier <= 3; tier++) {
        expect(mgr.upgradeRemixBoost()).toBe(true);
        expect(mgr.getRemixBoostTier()).toBe(tier);
      }
    });

    it('at each tier, bonus matches REMIX_BOOST_BONUSES', () => {
      const mgr = UpgradeManager.getInstance();
      expect(mgr.getRemixBoostBonus()).toBe(BONUSES[0]);
      for (let tier = 1; tier <= 3; tier++) {
        mgr.upgradeRemixBoost();
        expect(mgr.getRemixBoostBonus()).toBe(BONUSES[tier]);
      }
    });

    it('at each tier, cost matches REMIX_BOOST_COSTS', () => {
      const mgr = UpgradeManager.getInstance();
      for (let i = 0; i < 3; i++) {
        expect(mgr.getNextRemixBoostCost()).toBe(COSTS[i]);
        mgr.upgradeRemixBoost();
      }
      // After tier 3, no more costs
      expect(mgr.getNextRemixBoostCost()).toBeNull();
    });
  });

  // ── 5. Max Tier ───────────────────────────────────────────────
  describe('Max Tier', () => {
    let mgr: UpgradeManager;

    beforeEach(() => {
      mgr = UpgradeManager.getInstance();
      mgr.upgradeRemixBoost(); // 0→1
      mgr.upgradeRemixBoost(); // 1→2
      mgr.upgradeRemixBoost(); // 2→3
      mockSpendCurrency.mockClear();
    });

    it('isRemixBoostMaxed() returns true at tier 3', () => {
      expect(mgr.isRemixBoostMaxed()).toBe(true);
    });

    it('getNextRemixBoostCost() returns null at tier 3', () => {
      expect(mgr.getNextRemixBoostCost()).toBeNull();
    });

    it('upgradeRemixBoost() returns false and does not call spendCurrency at tier 3', () => {
      const result = mgr.upgradeRemixBoost();
      expect(result).toBe(false);
      expect(mockSpendCurrency).not.toHaveBeenCalled();
    });

    it('bonus is 0.15 at tier 3', () => {
      expect(mgr.getRemixBoostBonus()).toBe(0.15);
    });
  });

  // ── 6. Persistence ───────────────────────────────────────────
  describe('Persistence', () => {
    it('tier saved to localStorage after upgrade', () => {
      const mgr = UpgradeManager.getInstance();
      mgr.upgradeRemixBoost();
      const stored = JSON.parse(localStorage.getItem('genos-block-party-upgrades')!);
      expect(stored.remixBoostTier).toBe(1);
    });

    it('tier loaded from localStorage on new instance', () => {
      localStorage.setItem(
        'genos-block-party-upgrades',
        JSON.stringify({ remixBoostTier: 2 })
      );
      UpgradeManager.resetInstance();
      const mgr = UpgradeManager.getInstance();
      expect(mgr.getRemixBoostTier()).toBe(2);
    });

    it('handles corrupted localStorage gracefully (defaults to 0)', () => {
      localStorage.setItem('genos-block-party-upgrades', 'not-valid-json{{{');
      UpgradeManager.resetInstance();
      const mgr = UpgradeManager.getInstance();
      expect(mgr.getRemixBoostTier()).toBe(0);
    });

    it('handles out-of-range tier in localStorage (e.g. tier 5 or -1)', () => {
      localStorage.setItem(
        'genos-block-party-upgrades',
        JSON.stringify({ remixBoostTier: 5 })
      );
      UpgradeManager.resetInstance();
      let mgr = UpgradeManager.getInstance();
      expect(mgr.getRemixBoostTier()).toBe(0);

      localStorage.setItem(
        'genos-block-party-upgrades',
        JSON.stringify({ remixBoostTier: -1 })
      );
      UpgradeManager.resetInstance();
      mgr = UpgradeManager.getInstance();
      expect(mgr.getRemixBoostTier()).toBe(0);
    });
  });

  // ── 7. Reset ──────────────────────────────────────────────────
  describe('Reset', () => {
    it('resetUpgrades sets tier to 0', () => {
      const mgr = UpgradeManager.getInstance();
      mgr.upgradeRemixBoost(); // 0→1
      mgr.upgradeRemixBoost(); // 1→2
      expect(mgr.getRemixBoostTier()).toBe(2);
      mgr.resetUpgrades();
      expect(mgr.getRemixBoostTier()).toBe(0);
    });

    it('resetUpgrades persists reset to localStorage', () => {
      const mgr = UpgradeManager.getInstance();
      mgr.upgradeRemixBoost();
      mgr.resetUpgrades();
      const stored = JSON.parse(localStorage.getItem('genos-block-party-upgrades')!);
      expect(stored.remixBoostTier).toBe(0);
    });
  });

  // ── 8. Currency Integration ───────────────────────────────────
  describe('Currency Integration', () => {
    it('correct cost passed to spendCurrency at each tier', () => {
      const mgr = UpgradeManager.getInstance();
      const expectedCosts = [50, 150, 400];
      for (const cost of expectedCosts) {
        mgr.upgradeRemixBoost();
        expect(mockSpendCurrency).toHaveBeenCalledWith(cost);
      }
    });

    it('upgradeRemixBoost returns false without modifying tier when spendCurrency fails', () => {
      mockSpendCurrency.mockReturnValue(false);
      const mgr = UpgradeManager.getInstance();
      expect(mgr.upgradeRemixBoost()).toBe(false);
      expect(mgr.getRemixBoostTier()).toBe(0);
      expect(mgr.upgradeRemixBoost()).toBe(false);
      expect(mgr.getRemixBoostTier()).toBe(0);
    });
  });
});
