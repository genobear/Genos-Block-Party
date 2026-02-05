import { describe, it, expect } from 'vitest';
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
