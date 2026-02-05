import { describe, it, expect } from 'vitest';
import { calculateDropChance, rollDrop, rollDropsForDamage } from '../utils/dropRoll';
import { BRICK_DROP_CHANCES, BrickType } from '../types/BrickTypes';

describe('calculateDropChance', () => {
  describe('base drop chances per brick type', () => {
    it('returns PRESENT base chance (15%)', () => {
      const chance = calculateDropChance({ baseChance: BRICK_DROP_CHANCES[BrickType.PRESENT] });
      expect(chance).toBe(0.15);
    });

    it('returns PINATA base chance (25%)', () => {
      const chance = calculateDropChance({ baseChance: BRICK_DROP_CHANCES[BrickType.PINATA] });
      expect(chance).toBe(0.25);
    });

    it('returns BALLOON base chance (30%)', () => {
      const chance = calculateDropChance({ baseChance: BRICK_DROP_CHANCES[BrickType.BALLOON] });
      expect(chance).toBe(0.30);
    });
  });

  describe('Power Ball bonus (double chance, cap at 100%)', () => {
    it('doubles 25% chance to 50%', () => {
      const chance = calculateDropChance({ baseChance: 0.25, powerBallActive: true });
      expect(chance).toBe(0.50);
    });

    it('doubles 30% chance to 60%', () => {
      const chance = calculateDropChance({ baseChance: 0.30, powerBallActive: true });
      expect(chance).toBe(0.60);
    });

    it('caps at 100% when doubling 60%', () => {
      const chance = calculateDropChance({ baseChance: 0.60, powerBallActive: true });
      expect(chance).toBe(1.0);
    });

    it('caps at 100% when doubling 80%', () => {
      const chance = calculateDropChance({ baseChance: 0.80, powerBallActive: true });
      expect(chance).toBe(1.0);
    });

    it('does not apply when powerBallActive is false', () => {
      const chance = calculateDropChance({ baseChance: 0.25, powerBallActive: false });
      expect(chance).toBe(0.25);
    });
  });

  describe('AOE penalty (50% reduction)', () => {
    it('reduces 30% chance to 15%', () => {
      const chance = calculateDropChance({ baseChance: 0.30, isAOE: true });
      expect(chance).toBe(0.15);
    });

    it('reduces 25% chance to 12.5%', () => {
      const chance = calculateDropChance({ baseChance: 0.25, isAOE: true });
      expect(chance).toBe(0.125);
    });

    it('does not apply when isAOE is false', () => {
      const chance = calculateDropChance({ baseChance: 0.30, isAOE: false });
      expect(chance).toBe(0.30);
    });
  });

  describe('combined: Power Ball + AOE', () => {
    it('applies Power Ball first, then AOE penalty (0.25 * 2 * 0.5 = 0.25)', () => {
      const chance = calculateDropChance({ baseChance: 0.25, powerBallActive: true, isAOE: true });
      expect(chance).toBe(0.25);
    });

    it('caps at 100% then applies AOE penalty (0.60 * 2 = 1.0, * 0.5 = 0.5)', () => {
      const chance = calculateDropChance({ baseChance: 0.60, powerBallActive: true, isAOE: true });
      expect(chance).toBe(0.50);
    });

    it('applies to BALLOON (0.30 * 2 * 0.5 = 0.30)', () => {
      const chance = calculateDropChance({
        baseChance: BRICK_DROP_CHANCES[BrickType.BALLOON],
        powerBallActive: true,
        isAOE: true,
      });
      expect(chance).toBe(0.30);
    });
  });

  describe('debug override takes precedence', () => {
    it('ignores base chance when debugOverride is set', () => {
      const chance = calculateDropChance({ baseChance: 0.15, debugOverride: 0.50 });
      expect(chance).toBe(0.50);
    });

    it('ignores powerBallActive when debugOverride is set', () => {
      const chance = calculateDropChance({ baseChance: 0.25, powerBallActive: true, debugOverride: 0.10 });
      expect(chance).toBe(0.10);
    });

    it('ignores isAOE when debugOverride is set', () => {
      const chance = calculateDropChance({ baseChance: 0.30, isAOE: true, debugOverride: 1.0 });
      expect(chance).toBe(1.0);
    });

    it('ignores all modifiers when debugOverride is set', () => {
      const chance = calculateDropChance({
        baseChance: 0.25,
        powerBallActive: true,
        isAOE: true,
        debugOverride: 0.75,
      });
      expect(chance).toBe(0.75);
    });

    it('uses normal calculation when debugOverride is null', () => {
      const chance = calculateDropChance({ baseChance: 0.25, debugOverride: null });
      expect(chance).toBe(0.25);
    });

    it('allows debugOverride of 0', () => {
      const chance = calculateDropChance({ baseChance: 0.50, debugOverride: 0 });
      expect(chance).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('returns 0 when baseChance is 0', () => {
      const chance = calculateDropChance({ baseChance: 0 });
      expect(chance).toBe(0);
    });

    it('returns 0 when baseChance is 0 even with Power Ball', () => {
      const chance = calculateDropChance({ baseChance: 0, powerBallActive: true });
      expect(chance).toBe(0);
    });

    it('returns 1 when baseChance is 1', () => {
      const chance = calculateDropChance({ baseChance: 1 });
      expect(chance).toBe(1);
    });

    it('returns 0.5 when baseChance is 1 with AOE', () => {
      const chance = calculateDropChance({ baseChance: 1, isAOE: true });
      expect(chance).toBe(0.5);
    });
  });
});

describe('rollDrop', () => {
  it('never drops with 0% chance', () => {
    // Try various RNG values - none should trigger a drop
    expect(rollDrop(0, () => 0)).toBe(false);
    expect(rollDrop(0, () => 0.5)).toBe(false);
    expect(rollDrop(0, () => 0.99)).toBe(false);
  });

  it('always drops with 100% chance', () => {
    // Try various RNG values - all should trigger a drop
    expect(rollDrop(1, () => 0)).toBe(true);
    expect(rollDrop(1, () => 0.5)).toBe(true);
    expect(rollDrop(1, () => 0.99)).toBe(true);
  });

  it('drops when RNG is below chance (50% chance, RNG = 0.3)', () => {
    expect(rollDrop(0.5, () => 0.3)).toBe(true);
  });

  it('does not drop when RNG is above chance (50% chance, RNG = 0.7)', () => {
    expect(rollDrop(0.5, () => 0.7)).toBe(false);
  });

  it('does not drop when RNG equals chance (boundary condition)', () => {
    // rng() < chance, so rng() === chance should return false
    expect(rollDrop(0.5, () => 0.5)).toBe(false);
  });

  it('drops when RNG is just below chance', () => {
    expect(rollDrop(0.5, () => 0.49999)).toBe(true);
  });
});

describe('rollDropsForDamage', () => {
  it('returns 0 drops for 0 damage', () => {
    const drops = rollDropsForDamage(1.0, 0);
    expect(drops).toBe(0);
  });

  it('returns 1 drop for 1 damage with 100% chance', () => {
    const drops = rollDropsForDamage(1.0, 1);
    expect(drops).toBe(1);
  });

  it('returns 3 drops for 3 damage with 100% chance', () => {
    const drops = rollDropsForDamage(1.0, 3);
    expect(drops).toBe(3);
  });

  it('returns 0 drops for 3 damage with 0% chance', () => {
    const drops = rollDropsForDamage(0, 3);
    expect(drops).toBe(0);
  });

  it('handles multiple independent rolls with controlled RNG sequence', () => {
    // Simulate 3 damage with 50% chance
    // RNG sequence: 0.3 (drop), 0.7 (no drop), 0.4 (drop)
    const rngValues = [0.3, 0.7, 0.4];
    let callIndex = 0;
    const mockRng = () => rngValues[callIndex++];

    const drops = rollDropsForDamage(0.5, 3, mockRng);
    expect(drops).toBe(2); // First and third rolls succeed
  });

  it('handles all successful rolls with controlled RNG', () => {
    // All RNG values below 50% chance
    const rngValues = [0.1, 0.2, 0.3];
    let callIndex = 0;
    const mockRng = () => rngValues[callIndex++];

    const drops = rollDropsForDamage(0.5, 3, mockRng);
    expect(drops).toBe(3);
  });

  it('handles all failed rolls with controlled RNG', () => {
    // All RNG values above 50% chance
    const rngValues = [0.6, 0.7, 0.8];
    let callIndex = 0;
    const mockRng = () => rngValues[callIndex++];

    const drops = rollDropsForDamage(0.5, 3, mockRng);
    expect(drops).toBe(0);
  });

  it('handles high damage counts correctly', () => {
    // 10 damage with 100% chance should give 10 drops
    const drops = rollDropsForDamage(1.0, 10);
    expect(drops).toBe(10);
  });
});
