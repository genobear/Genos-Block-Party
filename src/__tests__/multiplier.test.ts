import { describe, it, expect, beforeEach } from 'vitest';
import { MultiplierSystem } from '../systems/MultiplierSystem';
import { MULTIPLIER } from '../config/Constants';

describe('MultiplierSystem', () => {
  let system: MultiplierSystem;

  beforeEach(() => {
    system = new MultiplierSystem();
  });

  describe('initialization', () => {
    it('should start at base value', () => {
      expect(system.getValue()).toBe(MULTIPLIER.BASE);
    });
  });

  describe('increment', () => {
    it('should increase multiplier on increment', () => {
      system.increment(0);
      expect(system.getValue()).toBeGreaterThan(MULTIPLIER.BASE);
    });

    it('should apply diminishing returns at higher multipliers', () => {
      // First increment at base (1.0x)
      system.increment(0);
      const firstValue = system.getValue();
      const firstIncrement = firstValue - MULTIPLIER.BASE;

      // Increment several more times to raise multiplier
      for (let i = 0; i < 10; i++) {
        system.increment(0);
      }

      // Get current value then increment once more
      const highValue = system.getValue();
      system.increment(0);
      const highValueIncrement = system.getValue() - highValue;

      // Higher multiplier should result in smaller increment
      expect(highValueIncrement).toBeLessThan(firstIncrement);
    });

    it('should never exceed MAX_MULTIPLIER', () => {
      // Increment many times
      for (let i = 0; i < 100; i++) {
        system.increment(0);
      }
      expect(system.getValue()).toBeLessThanOrEqual(MULTIPLIER.MAX_MULTIPLIER);
    });

    it('should reach MAX_MULTIPLIER exactly when capped', () => {
      // Increment until capped
      for (let i = 0; i < 200; i++) {
        system.increment(0);
      }
      expect(system.getValue()).toBe(MULTIPLIER.MAX_MULTIPLIER);
    });

    it('should update lastHitTime on increment', () => {
      // Increment at time 1000
      system.increment(1000);
      // Update at time 1500 (within grace period) - should not decay
      const valueAfterIncrement = system.getValue();
      system.update(1500, 100);
      expect(system.getValue()).toBe(valueAfterIncrement);
    });
  });

  describe('decay', () => {
    it('should not decay when at base', () => {
      // Update without any increment
      system.update(2000, 100);
      expect(system.getValue()).toBe(MULTIPLIER.BASE);
    });

    it('should not decay within grace period', () => {
      system.increment(0);
      const afterIncrement = system.getValue();

      // Update within DECAY_DELAY_MS (1000ms)
      system.update(500, 100);
      expect(system.getValue()).toBe(afterIncrement);
    });

    it('should not decay at exactly grace period boundary', () => {
      system.increment(0);
      const afterIncrement = system.getValue();

      // Update at exactly DECAY_DELAY_MS
      system.update(MULTIPLIER.DECAY_DELAY_MS, 100);
      expect(system.getValue()).toBe(afterIncrement);
    });

    it('should decay after grace period', () => {
      system.increment(0);
      const afterIncrement = system.getValue();

      // Update after DECAY_DELAY_MS
      system.update(MULTIPLIER.DECAY_DELAY_MS + 100, 100);
      expect(system.getValue()).toBeLessThan(afterIncrement);
    });

    it('should not decay below base', () => {
      system.increment(0);

      // Long time and big delta to ensure heavy decay
      system.update(10000, 10000);
      expect(system.getValue()).toBeGreaterThanOrEqual(MULTIPLIER.BASE);
    });

    it('should decay to exactly base when given extreme values', () => {
      system.increment(0);

      // Extreme decay - should floor at base
      system.update(100000, 100000);
      expect(system.getValue()).toBe(MULTIPLIER.BASE);
    });

    it('should decay faster at higher multiplier levels', () => {
      // Build up to a high multiplier
      for (let i = 0; i < 50; i++) {
        system.increment(0);
      }
      const highMultiplier = system.getValue();

      // Apply one decay tick
      system.update(MULTIPLIER.DECAY_DELAY_MS + 100, 1000);
      const decayAtHigh = highMultiplier - system.getValue();

      // Reset and build to low multiplier
      const lowSystem = new MultiplierSystem();
      lowSystem.increment(0);
      lowSystem.increment(0); // Just 2 increments for low multiplier
      const lowMultiplier = lowSystem.getValue();

      // Apply same decay tick
      lowSystem.update(MULTIPLIER.DECAY_DELAY_MS + 100, 1000);
      const decayAtLow = lowMultiplier - lowSystem.getValue();

      // Higher multiplier should decay more in absolute terms
      expect(decayAtHigh).toBeGreaterThan(decayAtLow);
    });

    it('should scale decay rate based on multiplier level', () => {
      // At max multiplier, decay rate should be DECAY_RATE (100% of configured rate)
      // At halfway (3.0x for base 1.0, max 5.0), should be ~50% of configured rate

      // Build to max
      for (let i = 0; i < 200; i++) {
        system.increment(0);
      }
      expect(system.getValue()).toBe(MULTIPLIER.MAX_MULTIPLIER);

      // One second of decay at max should equal DECAY_RATE
      system.update(MULTIPLIER.DECAY_DELAY_MS + 100, 1000);
      const expectedDecay = MULTIPLIER.DECAY_RATE; // 100% at max
      expect(system.getValue()).toBeCloseTo(MULTIPLIER.MAX_MULTIPLIER - expectedDecay, 5);
    });

    it('should continue decaying on subsequent updates', () => {
      system.increment(0);
      const initial = system.getValue();

      // First decay
      system.update(MULTIPLIER.DECAY_DELAY_MS + 100, 100);
      const afterFirst = system.getValue();

      // Second decay
      system.update(MULTIPLIER.DECAY_DELAY_MS + 200, 100);
      const afterSecond = system.getValue();

      expect(afterFirst).toBeLessThan(initial);
      expect(afterSecond).toBeLessThan(afterFirst);
    });

    it('should reset decay timer on new increment', () => {
      system.increment(0);

      // Wait past grace period
      system.update(MULTIPLIER.DECAY_DELAY_MS + 100, 50);
      // Value has decayed at this point

      // Increment again (resets timer to new time)
      system.increment(MULTIPLIER.DECAY_DELAY_MS + 200);
      const afterNewIncrement = system.getValue();

      // Update within new grace period - should not decay
      system.update(MULTIPLIER.DECAY_DELAY_MS + 700, 100);
      expect(system.getValue()).toBe(afterNewIncrement);
    });
  });

  describe('reset', () => {
    it('should return to base value', () => {
      for (let i = 0; i < 10; i++) {
        system.increment(0);
      }
      expect(system.getValue()).toBeGreaterThan(MULTIPLIER.BASE);

      system.reset();
      expect(system.getValue()).toBe(MULTIPLIER.BASE);
    });

    it('should reset lastHitTime (no immediate decay after reset)', () => {
      system.increment(1000);
      system.reset();

      // Update as if time has passed since reset
      // lastHitTime should be 0, so timeSinceHit = currentTime
      // This would normally decay, but since multiplier is at base, no decay
      system.update(5000, 100);
      expect(system.getValue()).toBe(MULTIPLIER.BASE);
    });

    it('should work from MAX_MULTIPLIER', () => {
      for (let i = 0; i < 200; i++) {
        system.increment(0);
      }
      expect(system.getValue()).toBe(MULTIPLIER.MAX_MULTIPLIER);

      system.reset();
      expect(system.getValue()).toBe(MULTIPLIER.BASE);
    });
  });

  describe('applyToScore', () => {
    it('should return exact points at base multiplier', () => {
      expect(system.applyToScore(100)).toBe(100);
    });

    it('should multiply points correctly', () => {
      system.increment(0);
      const multiplier = system.getValue();
      const expected = Math.floor(100 * multiplier);
      expect(system.applyToScore(100)).toBe(expected);
    });

    it('should floor the result', () => {
      // Increment to get non-integer multiplier
      system.increment(0);
      const result = system.applyToScore(77); // 77 * 1.15 = 88.55

      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBe(Math.floor(77 * system.getValue()));
    });

    it('should handle zero points', () => {
      system.increment(0);
      expect(system.applyToScore(0)).toBe(0);
    });

    it('should handle large point values', () => {
      for (let i = 0; i < 50; i++) {
        system.increment(0);
      }
      const multiplier = system.getValue();
      const largePoints = 10000;
      expect(system.applyToScore(largePoints)).toBe(Math.floor(largePoints * multiplier));
    });

    it('should return max multiplied score at MAX_MULTIPLIER', () => {
      for (let i = 0; i < 200; i++) {
        system.increment(0);
      }
      expect(system.getValue()).toBe(MULTIPLIER.MAX_MULTIPLIER);
      expect(system.applyToScore(100)).toBe(Math.floor(100 * MULTIPLIER.MAX_MULTIPLIER));
    });
  });

  describe('edge cases', () => {
    it('should handle rapid increments', () => {
      // Simulate many rapid hits
      for (let i = 0; i < 1000; i++) {
        system.increment(i);
      }
      expect(system.getValue()).toBe(MULTIPLIER.MAX_MULTIPLIER);
    });

    it('should handle negative time values gracefully', () => {
      // Shouldn't crash with weird time values
      system.increment(-1000);
      expect(system.getValue()).toBeGreaterThan(MULTIPLIER.BASE);
    });

    it('should handle zero delta in update', () => {
      system.increment(0);
      const value = system.getValue();
      system.update(MULTIPLIER.DECAY_DELAY_MS + 100, 0);
      // Zero delta should result in zero decay
      expect(system.getValue()).toBe(value);
    });

    it('should maintain precision over many operations', () => {
      // Build up
      for (let i = 0; i < 50; i++) {
        system.increment(i * 100);
      }

      // Decay partially
      system.update(10000, 500);

      // Build up again
      for (let i = 0; i < 20; i++) {
        system.increment(15000 + i * 50);
      }

      // Value should still be valid
      const value = system.getValue();
      expect(value).toBeGreaterThanOrEqual(MULTIPLIER.BASE);
      expect(value).toBeLessThanOrEqual(MULTIPLIER.MAX_MULTIPLIER);
      expect(Number.isFinite(value)).toBe(true);
    });
  });

  describe('constants validation', () => {
    it('should have valid MULTIPLIER constants', () => {
      expect(MULTIPLIER.BASE).toBe(1.0);
      expect(MULTIPLIER.MAX_MULTIPLIER).toBe(5.0);
      expect(MULTIPLIER.DECAY_DELAY_MS).toBe(1000);
      expect(MULTIPLIER.DECAY_RATE).toBe(0.5);
      expect(MULTIPLIER.MIN_DISPLAY_THRESHOLD).toBe(1.1);
    });

    it('should have BASE less than MAX_MULTIPLIER', () => {
      expect(MULTIPLIER.BASE).toBeLessThan(MULTIPLIER.MAX_MULTIPLIER);
    });

    it('should have positive DECAY_DELAY_MS', () => {
      expect(MULTIPLIER.DECAY_DELAY_MS).toBeGreaterThan(0);
    });

    it('should have positive DECAY_RATE', () => {
      expect(MULTIPLIER.DECAY_RATE).toBeGreaterThan(0);
    });
  });
});
