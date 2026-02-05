import { describe, it, expect } from 'vitest';
import { BrickType, BRICK_DROP_CHANCES } from '../types/BrickTypes';

describe('Brick Drop Chances', () => {
  const allTypes = Object.values(BrickType);

  it('should have a drop chance for every BrickType', () => {
    allTypes.forEach((type) => {
      expect(BRICK_DROP_CHANCES[type]).toBeDefined();
    });
  });

  allTypes.forEach((type) => {
    it(`${type} drop chance should be between 0 and 1 (exclusive)`, () => {
      expect(BRICK_DROP_CHANCES[type]).toBeGreaterThan(0);
      expect(BRICK_DROP_CHANCES[type]).toBeLessThan(1);
    });
  });

  it('should have Present < Pinata < Balloon drop chance ordering', () => {
    expect(BRICK_DROP_CHANCES[BrickType.PRESENT]).toBeLessThan(
      BRICK_DROP_CHANCES[BrickType.PINATA]
    );
    expect(BRICK_DROP_CHANCES[BrickType.PINATA]).toBeLessThan(
      BRICK_DROP_CHANCES[BrickType.BALLOON]
    );
  });
});
