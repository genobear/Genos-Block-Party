import { describe, it, expect } from 'vitest';
import { calculateLaunchVelocity } from '../utils/ballLaunch';

describe('calculateLaunchVelocity', () => {
  describe('angle validation', () => {
    it('angle should be within -120 to -60 degrees (default range)', () => {
      // Run multiple times due to randomness
      for (let i = 0; i < 100; i++) {
        const result = calculateLaunchVelocity(300);
        expect(result.angleDeg).toBeGreaterThanOrEqual(-120);
        expect(result.angleDeg).toBeLessThanOrEqual(-60);
      }
    });

    it('angle should respect custom range', () => {
      for (let i = 0; i < 50; i++) {
        const result = calculateLaunchVelocity(300, -90, -70);
        expect(result.angleDeg).toBeGreaterThanOrEqual(-90);
        expect(result.angleDeg).toBeLessThanOrEqual(-70);
      }
    });
  });

  describe('velocity direction', () => {
    it('velocityY should always be negative (upward)', () => {
      for (let i = 0; i < 100; i++) {
        const result = calculateLaunchVelocity(300);
        expect(result.velocityY).toBeLessThan(0);
      }
    });

    it('should never launch horizontally (velocityY !== 0)', () => {
      for (let i = 0; i < 100; i++) {
        const result = calculateLaunchVelocity(300);
        expect(Math.abs(result.velocityY)).toBeGreaterThan(0);
      }
    });
  });

  describe('velocity magnitude', () => {
    it('velocity magnitude should match input speed', () => {
      const speed = 350;
      for (let i = 0; i < 50; i++) {
        const result = calculateLaunchVelocity(speed);
        const magnitude = Math.sqrt(result.velocityX ** 2 + result.velocityY ** 2);
        expect(magnitude).toBeCloseTo(speed, 5);
      }
    });

    it('should handle zero speed', () => {
      const result = calculateLaunchVelocity(0);
      expect(result.velocityX).toBeCloseTo(0, 10);
      expect(result.velocityY).toBeCloseTo(0, 10);
    });
  });

  describe('edge cases', () => {
    it('should handle very high speeds', () => {
      const result = calculateLaunchVelocity(10000);
      const magnitude = Math.sqrt(result.velocityX ** 2 + result.velocityY ** 2);
      expect(magnitude).toBeCloseTo(10000, 5);
    });

    it('should handle negative speed (magnitude preserved)', () => {
      const result = calculateLaunchVelocity(-300);
      const magnitude = Math.sqrt(result.velocityX ** 2 + result.velocityY ** 2);
      expect(magnitude).toBeCloseTo(300, 5);
    });
  });
});
