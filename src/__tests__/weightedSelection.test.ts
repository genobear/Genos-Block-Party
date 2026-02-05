import { describe, it, expect } from 'vitest';
import { weightedSelect, getTotalWeight, WeightedItem } from '../../src/utils/weightedSelection';
import { POWERUP_CONFIGS, PowerUpType, getTotalDropWeight } from '../../src/types/PowerUpTypes';

describe('weightedSelect', () => {
  describe('basic functionality', () => {
    const items: WeightedItem<string>[] = [
      { value: 'A', weight: 10 },
      { value: 'B', weight: 20 },
      { value: 'C', weight: 30 },
    ];
    // Total weight = 60, so:
    // A: 0-10 (0.0 - 0.167)
    // B: 10-30 (0.167 - 0.5)
    // C: 30-60 (0.5 - 1.0)

    it('selects first item when random is 0', () => {
      expect(weightedSelect(items, 0)).toBe('A');
    });

    it('selects first item at upper boundary', () => {
      // Just under 10/60 = 0.1666...
      expect(weightedSelect(items, 0.16)).toBe('A');
    });

    it('selects second item after first boundary', () => {
      expect(weightedSelect(items, 0.17)).toBe('B');
    });

    it('selects second item at middle', () => {
      expect(weightedSelect(items, 0.4)).toBe('B');
    });

    it('selects last item when random is close to 1', () => {
      expect(weightedSelect(items, 0.99)).toBe('C');
    });

    it('selects last item at boundary', () => {
      // At 0.5, threshold = 30. After A(10) → 20, after B(20) → 0, returns B
      // Need 0.51 to cross into C territory
      expect(weightedSelect(items, 0.51)).toBe('C');
    });
  });

  describe('edge cases', () => {
    it('handles single item', () => {
      const items: WeightedItem<string>[] = [{ value: 'only', weight: 100 }];
      expect(weightedSelect(items, 0)).toBe('only');
      expect(weightedSelect(items, 0.5)).toBe('only');
      expect(weightedSelect(items, 0.99)).toBe('only');
    });

    it('handles equal weights', () => {
      const items: WeightedItem<string>[] = [
        { value: 'A', weight: 10 },
        { value: 'B', weight: 10 },
        { value: 'C', weight: 10 },
      ];
      expect(weightedSelect(items, 0)).toBe('A');
      expect(weightedSelect(items, 0.34)).toBe('B');
      expect(weightedSelect(items, 0.67)).toBe('C');
    });

    it('skips zero-weight items', () => {
      const items: WeightedItem<string>[] = [
        { value: 'zero', weight: 0 },
        { value: 'positive', weight: 10 },
      ];
      // Only 'positive' should ever be selected
      expect(weightedSelect(items, 0)).toBe('positive');
      expect(weightedSelect(items, 0.99)).toBe('positive');
    });

    it('handles all zero weights', () => {
      const items: WeightedItem<string>[] = [
        { value: 'A', weight: 0 },
        { value: 'B', weight: 0 },
      ];
      expect(weightedSelect(items, 0.5)).toBeNull();
    });

    it('handles empty array', () => {
      expect(weightedSelect([], 0.5)).toBeNull();
    });

    it('handles negative weights as zero', () => {
      const items: WeightedItem<string>[] = [
        { value: 'negative', weight: -10 },
        { value: 'positive', weight: 10 },
      ];
      expect(weightedSelect(items, 0)).toBe('positive');
    });
  });
});

describe('getTotalWeight', () => {
  it('sums positive weights', () => {
    const items: WeightedItem<string>[] = [
      { value: 'A', weight: 10 },
      { value: 'B', weight: 20 },
    ];
    expect(getTotalWeight(items)).toBe(30);
  });

  it('ignores negative weights', () => {
    const items: WeightedItem<string>[] = [
      { value: 'A', weight: -5 },
      { value: 'B', weight: 10 },
    ];
    expect(getTotalWeight(items)).toBe(10);
  });

  it('returns 0 for empty array', () => {
    expect(getTotalWeight([])).toBe(0);
  });
});

describe('Power-up selection integration', () => {
  it('POWERUP_CONFIGS weights sum to expected total', () => {
    // Currently 107: balloon(20) + cake(15) + drinks(15) + disco(10) + mystery(10) + 
    // powerball(12) + fireball(10) + electricball(12) + partyfavor(3)
    expect(getTotalDropWeight()).toBe(107);
  });

  it('all power-up types have positive weights', () => {
    for (const type of Object.values(PowerUpType)) {
      const config = POWERUP_CONFIGS[type];
      expect(config.dropWeight).toBeGreaterThan(0);
    }
  });

  it('all power-up types are reachable via selection', () => {
    // Create items from config
    const items: WeightedItem<PowerUpType>[] = Object.values(POWERUP_CONFIGS).map(c => ({
      value: c.type,
      weight: c.dropWeight,
    }));

    // Each type should be selectable with the right random value
    let cumulative = 0;
    const total = getTotalDropWeight();

    for (const config of Object.values(POWERUP_CONFIGS)) {
      // Use a value in the middle of this item's range
      const midpoint = (cumulative + config.dropWeight / 2) / total;
      const selected = weightedSelect(items, midpoint);
      expect(selected).toBe(config.type);
      cumulative += config.dropWeight;
    }
  });
});
