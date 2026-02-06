import { describe, it, expect } from 'vitest';
import {
  FireballState,
  incrementLevel,
  isActive,
  getDamage,
  getVisualTier,
  canPierce,
  reset,
} from './fireball';

describe('Fireball Utility Functions', () => {
  describe('reset', () => {
    it('returns initial state with level 0', () => {
      const state = reset();
      expect(state.level).toBe(0);
    });
  });

  describe('incrementLevel', () => {
    it('increases level by 1 from initial state', () => {
      const initial = reset();
      const updated = incrementLevel(initial);
      expect(updated.level).toBe(1);
    });

    it('increases level by 1 from any starting level', () => {
      expect(incrementLevel({ level: 0 }).level).toBe(1);
      expect(incrementLevel({ level: 1 }).level).toBe(2);
      expect(incrementLevel({ level: 5 }).level).toBe(6);
      expect(incrementLevel({ level: 10 }).level).toBe(11);
    });

    it('returns a new state object (immutable)', () => {
      const original: FireballState = { level: 3 };
      const updated = incrementLevel(original);
      expect(updated).not.toBe(original);
      expect(original.level).toBe(3); // Original unchanged
    });

    it('handles multiple consecutive increments', () => {
      let state = reset();
      state = incrementLevel(state);
      state = incrementLevel(state);
      state = incrementLevel(state);
      expect(state.level).toBe(3);
    });
  });

  describe('isActive', () => {
    it('returns false at level 0', () => {
      expect(isActive({ level: 0 })).toBe(false);
    });

    it('returns true at level 1', () => {
      expect(isActive({ level: 1 })).toBe(true);
    });

    it('returns true at higher levels', () => {
      expect(isActive({ level: 2 })).toBe(true);
      expect(isActive({ level: 5 })).toBe(true);
      expect(isActive({ level: 100 })).toBe(true);
    });
  });

  describe('getDamage', () => {
    it('returns 0 at level 0', () => {
      expect(getDamage({ level: 0 })).toBe(0);
    });

    it('returns damage equal to current level', () => {
      expect(getDamage({ level: 1 })).toBe(1);
      expect(getDamage({ level: 2 })).toBe(2);
      expect(getDamage({ level: 3 })).toBe(3);
      expect(getDamage({ level: 5 })).toBe(5);
      expect(getDamage({ level: 10 })).toBe(10);
    });
  });

  describe('getVisualTier', () => {
    it('returns tier 0 at level 0', () => {
      expect(getVisualTier({ level: 0 })).toBe(0);
    });

    it('returns tier 1 for levels 1-2', () => {
      expect(getVisualTier({ level: 1 })).toBe(1);
      expect(getVisualTier({ level: 2 })).toBe(1);
    });

    it('returns tier 2 for levels 3-4', () => {
      expect(getVisualTier({ level: 3 })).toBe(2);
      expect(getVisualTier({ level: 4 })).toBe(2);
    });

    it('returns tier 3 for level 5+', () => {
      expect(getVisualTier({ level: 5 })).toBe(3);
      expect(getVisualTier({ level: 6 })).toBe(3);
      expect(getVisualTier({ level: 10 })).toBe(3);
      expect(getVisualTier({ level: 100 })).toBe(3);
    });

    it('handles edge case of negative levels', () => {
      expect(getVisualTier({ level: -1 })).toBe(0);
      expect(getVisualTier({ level: -100 })).toBe(0);
    });
  });

  describe('canPierce', () => {
    it('returns false when level < brickHP', () => {
      expect(canPierce({ level: 1 }, 2)).toBe(false);
      expect(canPierce({ level: 1 }, 3)).toBe(false);
      expect(canPierce({ level: 2 }, 3)).toBe(false);
    });

    it('returns true when level equals brickHP', () => {
      expect(canPierce({ level: 1 }, 1)).toBe(true);
      expect(canPierce({ level: 2 }, 2)).toBe(true);
      expect(canPierce({ level: 3 }, 3)).toBe(true);
    });

    it('returns true when level > brickHP', () => {
      expect(canPierce({ level: 2 }, 1)).toBe(true);
      expect(canPierce({ level: 3 }, 1)).toBe(true);
      expect(canPierce({ level: 3 }, 2)).toBe(true);
      expect(canPierce({ level: 5 }, 3)).toBe(true);
    });

    it('returns false at level 0 regardless of brickHP', () => {
      expect(canPierce({ level: 0 }, 1)).toBe(false);
      expect(canPierce({ level: 0 }, 0)).toBe(true); // Edge case: level 0 >= HP 0
    });

    it('handles high level values', () => {
      expect(canPierce({ level: 10 }, 3)).toBe(true);
      expect(canPierce({ level: 100 }, 3)).toBe(true);
    });
  });

  describe('integration: typical gameplay flow', () => {
    it('simulates collecting multiple fireballs', () => {
      // Start with no fireball
      let state = reset();
      expect(isActive(state)).toBe(false);
      expect(getDamage(state)).toBe(0);
      expect(getVisualTier(state)).toBe(0);

      // Collect first fireball
      state = incrementLevel(state);
      expect(isActive(state)).toBe(true);
      expect(getDamage(state)).toBe(1);
      expect(getVisualTier(state)).toBe(1);
      expect(canPierce(state, 1)).toBe(true);
      expect(canPierce(state, 2)).toBe(false);

      // Collect second fireball (timer would reset)
      state = incrementLevel(state);
      expect(getDamage(state)).toBe(2);
      expect(getVisualTier(state)).toBe(1); // Still tier 1

      // Collect third fireball
      state = incrementLevel(state);
      expect(getDamage(state)).toBe(3);
      expect(getVisualTier(state)).toBe(2); // Now tier 2
      expect(canPierce(state, 3)).toBe(true);

      // Collect more fireballs
      state = incrementLevel(state); // level 4
      state = incrementLevel(state); // level 5
      expect(getDamage(state)).toBe(5);
      expect(getVisualTier(state)).toBe(3); // Maximum tier

      // Effect expires - reset
      state = reset();
      expect(isActive(state)).toBe(false);
      expect(getDamage(state)).toBe(0);
      expect(getVisualTier(state)).toBe(0);
    });
  });
});
