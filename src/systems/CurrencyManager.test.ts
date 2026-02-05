import { describe, it, expect, beforeEach } from 'vitest';
import { CurrencyManager } from './CurrencyManager';
import { CURRENCY } from '../config/Constants';

describe('CurrencyManager', () => {
  beforeEach(() => {
    localStorage.clear();
    CurrencyManager.resetInstance();
  });

  describe('localStorage integration', () => {
    it('returns 0 when localStorage is empty', () => {
      const manager = CurrencyManager.getInstance();
      expect(manager.getTotalCurrency()).toBe(0);
    });

    it('loads existing value from localStorage on init', () => {
      localStorage.setItem(CURRENCY.STORAGE_KEY, '500');
      const manager = CurrencyManager.getInstance();
      expect(manager.getTotalCurrency()).toBe(500);
    });

    it('handles corrupted localStorage (non-numeric string defaults to 0)', () => {
      localStorage.setItem(CURRENCY.STORAGE_KEY, 'not-a-number');
      const manager = CurrencyManager.getInstance();
      expect(manager.getTotalCurrency()).toBe(0);
    });

    it('handles negative value in localStorage (defaults to 0)', () => {
      localStorage.setItem(CURRENCY.STORAGE_KEY, '-100');
      const manager = CurrencyManager.getInstance();
      expect(manager.getTotalCurrency()).toBe(0);
    });
  });

  describe('saving to localStorage', () => {
    it('saves after addCurrency()', () => {
      const manager = CurrencyManager.getInstance();
      manager.addCurrency(100);
      expect(localStorage.getItem(CURRENCY.STORAGE_KEY)).toBe('100');
    });

    it('saves after awardCurrencyFromScore()', () => {
      const manager = CurrencyManager.getInstance();
      manager.awardCurrencyFromScore(1000);
      // Score of 1000: sqrt(1000) * 0.5 = ~15.8 => 15, + tier bonus 5 = 20
      const stored = localStorage.getItem(CURRENCY.STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(parseInt(stored!, 10)).toBeGreaterThan(0);
    });

    it('saves after successful spendCurrency()', () => {
      const manager = CurrencyManager.getInstance();
      manager.addCurrency(100);
      manager.spendCurrency(30);
      expect(localStorage.getItem(CURRENCY.STORAGE_KEY)).toBe('70');
    });

    it('does not modify storage if spendCurrency() has insufficient funds', () => {
      const manager = CurrencyManager.getInstance();
      manager.addCurrency(50);
      const result = manager.spendCurrency(100);
      expect(result).toBe(false);
      expect(localStorage.getItem(CURRENCY.STORAGE_KEY)).toBe('50');
      expect(manager.getTotalCurrency()).toBe(50);
    });
  });

  describe('canAfford()', () => {
    it('returns true when currency equals the amount', () => {
      const manager = CurrencyManager.getInstance();
      manager.addCurrency(100);
      expect(manager.canAfford(100)).toBe(true);
    });

    it('returns true when currency exceeds the amount', () => {
      const manager = CurrencyManager.getInstance();
      manager.addCurrency(150);
      expect(manager.canAfford(100)).toBe(true);
    });

    it('returns false when currency is less than the amount', () => {
      const manager = CurrencyManager.getInstance();
      manager.addCurrency(50);
      expect(manager.canAfford(100)).toBe(false);
    });

    it('returns false when currency is 0', () => {
      const manager = CurrencyManager.getInstance();
      expect(manager.canAfford(1)).toBe(false);
    });
  });

  describe('cross-session persistence', () => {
    it('persists currency across singleton resets', () => {
      // Session 1: Add currency
      const manager1 = CurrencyManager.getInstance();
      manager1.addCurrency(250);
      expect(manager1.getTotalCurrency()).toBe(250);

      // Simulate new session
      CurrencyManager.resetInstance();

      // Session 2: Load from storage
      const manager2 = CurrencyManager.getInstance();
      expect(manager2.getTotalCurrency()).toBe(250);
    });

    it('accumulates currency across sessions', () => {
      // Session 1
      const manager1 = CurrencyManager.getInstance();
      manager1.addCurrency(100);
      CurrencyManager.resetInstance();

      // Session 2
      const manager2 = CurrencyManager.getInstance();
      manager2.addCurrency(50);
      expect(manager2.getTotalCurrency()).toBe(150);
      CurrencyManager.resetInstance();

      // Session 3
      const manager3 = CurrencyManager.getInstance();
      expect(manager3.getTotalCurrency()).toBe(150);
    });
  });

  describe('resetCurrency()', () => {
    it('sets currency to 0', () => {
      const manager = CurrencyManager.getInstance();
      manager.addCurrency(500);
      expect(manager.getTotalCurrency()).toBe(500);

      manager.resetCurrency();
      expect(manager.getTotalCurrency()).toBe(0);
    });

    it('clears localStorage', () => {
      const manager = CurrencyManager.getInstance();
      manager.addCurrency(500);
      expect(localStorage.getItem(CURRENCY.STORAGE_KEY)).toBe('500');

      manager.resetCurrency();
      expect(localStorage.getItem(CURRENCY.STORAGE_KEY)).toBe('0');
    });

    it('persists the reset across sessions', () => {
      const manager1 = CurrencyManager.getInstance();
      manager1.addCurrency(500);
      manager1.resetCurrency();
      CurrencyManager.resetInstance();

      const manager2 = CurrencyManager.getInstance();
      expect(manager2.getTotalCurrency()).toBe(0);
    });
  });

  describe('calculateCurrencyFromScore() static method', () => {
    it('returns 0 for score of 0', () => {
      expect(CurrencyManager.calculateCurrencyFromScore(0)).toBe(0);
    });

    it('returns 0 for negative score', () => {
      expect(CurrencyManager.calculateCurrencyFromScore(-100)).toBe(0);
    });

    it('returns minimum 1 for any positive score', () => {
      expect(CurrencyManager.calculateCurrencyFromScore(1)).toBe(1);
      expect(CurrencyManager.calculateCurrencyFromScore(3)).toBe(1);
    });

    it('applies tier bonus at 1000 threshold', () => {
      // Just under 1000: sqrt(999) * 0.5 ≈ 15.8 => 15, no bonus
      const under = CurrencyManager.calculateCurrencyFromScore(999);
      // At 1000: sqrt(1000) * 0.5 ≈ 15.8 => 15, + 5 bonus = 20
      const at = CurrencyManager.calculateCurrencyFromScore(1000);
      expect(at).toBe(under + 5);
    });

    it('applies tier bonus at 5000 threshold', () => {
      // At 5000: sqrt(5000) * 0.5 ≈ 35.4 => 35, + 5 + 10 = 50
      const at5000 = CurrencyManager.calculateCurrencyFromScore(5000);
      expect(at5000).toBe(35 + 5 + 10);
    });

    it('applies all tier bonuses at 25000', () => {
      // At 25000: sqrt(25000) * 0.5 = 79.06 => 79, + 5 + 10 + 20 + 30 = 144
      const at25000 = CurrencyManager.calculateCurrencyFromScore(25000);
      expect(at25000).toBe(79 + 5 + 10 + 20 + 30);
    });
  });
});
