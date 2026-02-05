import { describe, it, expect } from 'vitest';
import { LEVELS } from '../config/LevelData';
import { BrickType } from '../types/BrickTypes';

const validBrickTypes = Object.values(BrickType);

describe('Level Data', () => {
  it('should have exactly 10 levels', () => {
    expect(LEVELS).toHaveLength(10);
  });

  it('should have sequential IDs from 1 to 10', () => {
    LEVELS.forEach((level, index) => {
      expect(level.id).toBe(index + 1);
    });
  });

  LEVELS.forEach((level) => {
    describe(`Level ${level.id}: ${level.name}`, () => {
      it('should have all required fields', () => {
        expect(level.id).toBeDefined();
        expect(level.name).toBeDefined();
        expect(level.subtitle).toBeDefined();
        expect(level.ballSpeedMultiplier).toBeDefined();
        expect(level.backgroundColor).toBeDefined();
        expect(level.bricks).toBeDefined();
        expect(level.powerUpDropChance).toBeDefined();
      });

      it('should have a positive ballSpeedMultiplier', () => {
        expect(level.ballSpeedMultiplier).toBeGreaterThan(0);
      });

      it('should have powerUpDropChance between 0 and 1', () => {
        expect(level.powerUpDropChance).toBeGreaterThanOrEqual(0);
        expect(level.powerUpDropChance).toBeLessThanOrEqual(1);
      });

      it('should have bricks with valid types', () => {
        level.bricks.forEach((brick) => {
          expect(validBrickTypes).toContain(brick.type);
        });
      });

      it('should have bricks with health between 1 and 3', () => {
        level.bricks.forEach((brick) => {
          expect(brick.health).toBeGreaterThanOrEqual(1);
          expect(brick.health).toBeLessThanOrEqual(3);
        });
      });

      it('should have bricks with x positions between 0 and 9', () => {
        level.bricks.forEach((brick) => {
          expect(brick.x).toBeGreaterThanOrEqual(0);
          expect(brick.x).toBeLessThanOrEqual(9);
        });
      });

      it('should have bricks with y positions >= 0', () => {
        level.bricks.forEach((brick) => {
          expect(brick.y).toBeGreaterThanOrEqual(0);
        });
      });

      it('should have no duplicate brick positions', () => {
        const positions = level.bricks.map((b) => `${b.x},${b.y}`);
        const uniquePositions = new Set(positions);
        expect(uniquePositions.size).toBe(positions.length);
      });
    });
  });
});
