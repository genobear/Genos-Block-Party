import { describe, it, expect, beforeEach } from 'vitest';
import { CurrencyManager } from '../systems/CurrencyManager';

describe('CurrencyManager.calculateCurrencyFromScore', () => {
  it('should return 0 for score 0', () => {
    expect(CurrencyManager.calculateCurrencyFromScore(0)).toBe(0);
  });

  it('should return 5 for score 100', () => {
    // floor(sqrt(100) * 0.5) = floor(10 * 0.5) = 5
    expect(CurrencyManager.calculateCurrencyFromScore(100)).toBe(5);
  });

  it('should return 20 for score 1000', () => {
    // floor(sqrt(1000) * 0.5) + 5 = floor(31.62 * 0.5) + 5 = 15 + 5 = 20
    expect(CurrencyManager.calculateCurrencyFromScore(1000)).toBe(20);
  });

  it('should return 50 for score 5000', () => {
    // floor(sqrt(5000) * 0.5) + 5 + 10 = floor(70.71 * 0.5) + 15 = 35 + 15 = 50
    expect(CurrencyManager.calculateCurrencyFromScore(5000)).toBe(50);
  });

  it('should return 85 for score 10000', () => {
    // floor(sqrt(10000) * 0.5) + 5 + 10 + 20 = floor(100 * 0.5) + 35 = 50 + 35 = 85
    expect(CurrencyManager.calculateCurrencyFromScore(10000)).toBe(85);
  });

  it('should return 144 for score 25000', () => {
    // floor(sqrt(25000) * 0.5) + 5 + 10 + 20 + 30 = floor(158.11 * 0.5) + 65 = 79 + 65 = 144
    expect(CurrencyManager.calculateCurrencyFromScore(25000)).toBe(144);
  });

  it('should return at least 1 for any positive score', () => {
    expect(CurrencyManager.calculateCurrencyFromScore(1)).toBeGreaterThanOrEqual(1);
  });

  it('should return 0 for negative scores', () => {
    expect(CurrencyManager.calculateCurrencyFromScore(-100)).toBe(0);
  });
});

describe('CurrencyManager localStorage integration', () => {
  beforeEach(() => {
    localStorage.clear();
    CurrencyManager.resetInstance();
  });

  it('should return 0 when localStorage is empty', () => {
    const manager = CurrencyManager.getInstance();
    expect(manager.getTotalCurrency()).toBe(0);
  });

  it('should load existing currency from localStorage', () => {
    localStorage.setItem('genos-block-party-currency', '500');
    const manager = CurrencyManager.getInstance();
    expect(manager.getTotalCurrency()).toBe(500);
  });

  it('should handle corrupted localStorage (non-numeric)', () => {
    localStorage.setItem('genos-block-party-currency', 'not-a-number');
    const manager = CurrencyManager.getInstance();
    expect(manager.getTotalCurrency()).toBe(0);
  });

  it('should handle negative values in localStorage', () => {
    localStorage.setItem('genos-block-party-currency', '-100');
    const manager = CurrencyManager.getInstance();
    expect(manager.getTotalCurrency()).toBe(0);
  });

  it('should save to localStorage after addCurrency', () => {
    const manager = CurrencyManager.getInstance();
    manager.addCurrency(100);
    expect(localStorage.getItem('genos-block-party-currency')).toBe('100');
  });

  it('should save to localStorage after awardCurrencyFromScore', () => {
    const manager = CurrencyManager.getInstance();
    manager.awardCurrencyFromScore(100); // Should award 5 currency
    expect(localStorage.getItem('genos-block-party-currency')).toBe('5');
  });

  it('should save to localStorage after spendCurrency', () => {
    const manager = CurrencyManager.getInstance();
    manager.addCurrency(100);
    manager.spendCurrency(30);
    expect(localStorage.getItem('genos-block-party-currency')).toBe('70');
  });

  it('should not save or modify if spendCurrency fails (insufficient funds)', () => {
    const manager = CurrencyManager.getInstance();
    manager.addCurrency(50);
    const result = manager.spendCurrency(100);
    expect(result).toBe(false);
    expect(manager.getTotalCurrency()).toBe(50);
    expect(localStorage.getItem('genos-block-party-currency')).toBe('50');
  });

  it('should persist across singleton resets (simulating sessions)', () => {
    // First "session"
    const manager1 = CurrencyManager.getInstance();
    manager1.addCurrency(200);

    // Simulate new session
    CurrencyManager.resetInstance();

    // Second "session"
    const manager2 = CurrencyManager.getInstance();
    expect(manager2.getTotalCurrency()).toBe(200);
  });

  it('canAfford should correctly check against current balance', () => {
    const manager = CurrencyManager.getInstance();
    manager.addCurrency(100);
    expect(manager.canAfford(50)).toBe(true);
    expect(manager.canAfford(100)).toBe(true);
    expect(manager.canAfford(101)).toBe(false);
  });

  it('resetCurrency should clear localStorage', () => {
    const manager = CurrencyManager.getInstance();
    manager.addCurrency(500);
    manager.resetCurrency();
    expect(manager.getTotalCurrency()).toBe(0);
    expect(localStorage.getItem('genos-block-party-currency')).toBe('0');
  });
});
