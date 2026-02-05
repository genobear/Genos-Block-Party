import { describe, it, expect } from 'vitest';
import { PowerUpType, POWERUP_CONFIGS } from '../types/PowerUpTypes';

describe('Power-Up Configs', () => {
  const allTypes = Object.values(PowerUpType);

  it('should have a config entry for every PowerUpType', () => {
    allTypes.forEach((type) => {
      expect(POWERUP_CONFIGS[type]).toBeDefined();
    });
  });

  allTypes.forEach((type) => {
    describe(`${type} config`, () => {
      it('should have type matching its key', () => {
        expect(POWERUP_CONFIGS[type].type).toBe(type);
      });

      it('should have a numeric color', () => {
        expect(typeof POWERUP_CONFIGS[type].color).toBe('number');
      });

      it('should have a non-negative duration', () => {
        expect(POWERUP_CONFIGS[type].duration).toBeGreaterThanOrEqual(0);
      });

      it('should have a positive dropWeight', () => {
        expect(POWERUP_CONFIGS[type].dropWeight).toBeGreaterThan(0);
      });

      it('should have a non-empty emoji', () => {
        expect(POWERUP_CONFIGS[type].emoji).toBeTruthy();
        expect(typeof POWERUP_CONFIGS[type].emoji).toBe('string');
        expect(POWERUP_CONFIGS[type].emoji.length).toBeGreaterThan(0);
      });
    });
  });
});
