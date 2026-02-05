import { describe, it, expect, vi } from 'vitest';

// Import constants for grid calculations
import {
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BRICK_COLS,
  BRICK_ROWS_START_Y,
  GAME_WIDTH,
} from '../config/Constants';

// Calculate grid offset (same as ElectricArcSystem constructor)
const totalWidth = BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING;
const OFFSET_X = (GAME_WIDTH - totalWidth) / 2 + BRICK_WIDTH / 2;

/**
 * Create a mock brick at a specific grid position
 */
const createMockBrick = (gridX: number, gridY: number, active = true, scoreValue = 100) => ({
  x: OFFSET_X + gridX * (BRICK_WIDTH + BRICK_PADDING),
  y: BRICK_ROWS_START_Y + gridY * (BRICK_HEIGHT + BRICK_PADDING),
  active,
  getScoreValue: () => scoreValue,
  takeDamage: vi.fn().mockReturnValue(false),
});

/**
 * Create a mock StaticGroup with children.iterate
 */
const createMockBrickGroup = (bricks: ReturnType<typeof createMockBrick>[]) => ({
  children: {
    iterate: (callback: (brick: ReturnType<typeof createMockBrick>) => boolean) => {
      bricks.forEach(callback);
    },
  },
});

/**
 * Simplified findAdjacentBricks logic (mirrors ElectricArcSystem.findAdjacentBricks)
 * This allows us to test the algorithm without Phaser dependencies
 */
function findAdjacentBricks(
  source: ReturnType<typeof createMockBrick>,
  brickGroup: ReturnType<typeof createMockBrickGroup>
): ReturnType<typeof createMockBrick>[] {
  // Convert source world coords to grid
  const sourceGridX = Math.round((source.x - OFFSET_X) / (BRICK_WIDTH + BRICK_PADDING));
  const sourceGridY = Math.round((source.y - BRICK_ROWS_START_Y) / (BRICK_HEIGHT + BRICK_PADDING));

  const offsets = [
    { dx: 0, dy: -1 }, // North
    { dx: 0, dy: 1 },  // South
    { dx: -1, dy: 0 }, // West
    { dx: 1, dy: 0 },  // East
  ];

  const adjacent: ReturnType<typeof createMockBrick>[] = [];

  brickGroup.children.iterate((brick) => {
    if (!brick || !brick.active || brick === source) return true;

    // Convert brick world coords to grid
    const brickGridX = Math.round((brick.x - OFFSET_X) / (BRICK_WIDTH + BRICK_PADDING));
    const brickGridY = Math.round((brick.y - BRICK_ROWS_START_Y) / (BRICK_HEIGHT + BRICK_PADDING));

    for (const offset of offsets) {
      if (
        brickGridX === sourceGridX + offset.dx &&
        brickGridY === sourceGridY + offset.dy
      ) {
        adjacent.push(brick);
        break;
      }
    }
    return true;
  });

  return adjacent;
}

/**
 * Process Electric AOE scoring (mirrors CollisionHandler.processElectricAOE)
 */
function processAOEScoring(
  adjacentBricks: ReturnType<typeof createMockBrick>[],
  onScoreChange: (score: number) => void
): void {
  adjacentBricks.forEach((brick) => {
    if (!brick || !brick.active) return;
    // 50% score penalty for AOE hits
    onScoreChange(Math.floor(brick.getScoreValue() * 0.5));
    // Apply 1 damage
    brick.takeDamage(1);
  });
}

describe('Electric Ball AOE System', () => {
  describe('Adjacent brick detection (N, S, E, W only)', () => {
    it('returns exactly 4 adjacent bricks for center brick in 3x3 grid', () => {
      // Create 3x3 grid at grid positions (0,0) to (2,2)
      const bricks = [
        createMockBrick(0, 0), // NW
        createMockBrick(1, 0), // N
        createMockBrick(2, 0), // NE
        createMockBrick(0, 1), // W
        createMockBrick(1, 1), // Center (source)
        createMockBrick(2, 1), // E
        createMockBrick(0, 2), // SW
        createMockBrick(1, 2), // S
        createMockBrick(2, 2), // SE
      ];

      const source = bricks[4]; // Center brick at (1,1)
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      // Should return exactly 4: N, S, E, W (not diagonals)
      expect(adjacent).toHaveLength(4);

      // Verify correct bricks are included
      expect(adjacent).toContain(bricks[1]); // N (1,0)
      expect(adjacent).toContain(bricks[7]); // S (1,2)
      expect(adjacent).toContain(bricks[3]); // W (0,1)
      expect(adjacent).toContain(bricks[5]); // E (2,1)
    });

    it('excludes diagonal bricks from adjacent results', () => {
      // Create 3x3 grid
      const bricks = [
        createMockBrick(0, 0), // NW diagonal
        createMockBrick(1, 0), // N
        createMockBrick(2, 0), // NE diagonal
        createMockBrick(0, 1), // W
        createMockBrick(1, 1), // Center
        createMockBrick(2, 1), // E
        createMockBrick(0, 2), // SW diagonal
        createMockBrick(1, 2), // S
        createMockBrick(2, 2), // SE diagonal
      ];

      const source = bricks[4];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      // Diagonal bricks should NOT be included
      expect(adjacent).not.toContain(bricks[0]); // NW
      expect(adjacent).not.toContain(bricks[2]); // NE
      expect(adjacent).not.toContain(bricks[6]); // SW
      expect(adjacent).not.toContain(bricks[8]); // SE
    });
  });

  describe('Source brick exclusion (no self-damage)', () => {
    it('excludes source brick from returned adjacent array', () => {
      const bricks = [
        createMockBrick(1, 0), // N
        createMockBrick(1, 1), // Center (source)
        createMockBrick(1, 2), // S
      ];

      const source = bricks[1];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      // Source brick must NOT be in the adjacent list
      expect(adjacent).not.toContain(source);
      expect(adjacent).toHaveLength(2); // Only N and S
    });

    it('source brick damage is NOT called via AOE processing', () => {
      const bricks = [
        createMockBrick(1, 0),
        createMockBrick(1, 1), // Source
        createMockBrick(1, 2),
      ];

      const source = bricks[1];
      const group = createMockBrickGroup(bricks);
      const adjacent = findAdjacentBricks(source, group);

      const scoreCallback = vi.fn();
      processAOEScoring(adjacent, scoreCallback);

      // Source brick's takeDamage should NOT be called
      expect(source.takeDamage).not.toHaveBeenCalled();
    });
  });

  describe('50% score penalty on AOE targets', () => {
    it('applies 50% score penalty for each AOE hit', () => {
      const bricks = [
        createMockBrick(1, 0, true, 100), // N - score 100
        createMockBrick(1, 1, true, 200), // Center (source)
        createMockBrick(1, 2, true, 100), // S - score 100
      ];

      const source = bricks[1];
      const group = createMockBrickGroup(bricks);
      const adjacent = findAdjacentBricks(source, group);

      const scoreCallback = vi.fn();
      processAOEScoring(adjacent, scoreCallback);

      // Each adjacent brick should award 50% of its score
      expect(scoreCallback).toHaveBeenCalledTimes(2);
      expect(scoreCallback).toHaveBeenCalledWith(50); // 100 * 0.5
    });

    it('floors score value when odd (no decimals)', () => {
      const bricks = [
        createMockBrick(0, 0, true, 75), // Score 75 → 37.5 → 37
        createMockBrick(1, 0, true, 100), // Source
      ];

      const source = bricks[1];
      const group = createMockBrickGroup(bricks);
      const adjacent = findAdjacentBricks(source, group);

      const scoreCallback = vi.fn();
      processAOEScoring(adjacent, scoreCallback);

      // Math.floor(75 * 0.5) = 37
      expect(scoreCallback).toHaveBeenCalledWith(37);
    });

    it('applies 1 damage to each adjacent brick', () => {
      const bricks = [
        createMockBrick(1, 0), // N
        createMockBrick(1, 1), // Source
        createMockBrick(1, 2), // S
        createMockBrick(0, 1), // W
        createMockBrick(2, 1), // E
      ];

      const source = bricks[1];
      const group = createMockBrickGroup(bricks);
      const adjacent = findAdjacentBricks(source, group);

      const scoreCallback = vi.fn();
      processAOEScoring(adjacent, scoreCallback);

      // All 4 adjacent bricks should receive 1 damage
      expect(bricks[0].takeDamage).toHaveBeenCalledWith(1); // N
      expect(bricks[2].takeDamage).toHaveBeenCalledWith(1); // S
      expect(bricks[3].takeDamage).toHaveBeenCalledWith(1); // W
      expect(bricks[4].takeDamage).toHaveBeenCalledWith(1); // E
    });
  });

  describe('Edge brick handling (fewer neighbors)', () => {
    it('edge brick returns 2-3 neighbors (top edge)', () => {
      // Top edge brick at (5, 0) - only has S, E, W
      const bricks = [
        createMockBrick(4, 0), // W
        createMockBrick(5, 0), // Source (top edge)
        createMockBrick(6, 0), // E
        createMockBrick(5, 1), // S
      ];

      const source = bricks[1];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      // Top edge: only W, E, S exist (no N)
      expect(adjacent).toHaveLength(3);
      expect(adjacent).toContain(bricks[0]); // W
      expect(adjacent).toContain(bricks[2]); // E
      expect(adjacent).toContain(bricks[3]); // S
    });

    it('left edge brick returns only E and S neighbors', () => {
      // Left edge brick at (0, 1)
      const bricks = [
        createMockBrick(0, 0), // N
        createMockBrick(0, 1), // Source (left edge)
        createMockBrick(0, 2), // S
        createMockBrick(1, 1), // E
      ];

      const source = bricks[1];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      // Should find N, S, E (no W exists at (-1, 1))
      expect(adjacent).toHaveLength(3);
      expect(adjacent).toContain(bricks[0]); // N
      expect(adjacent).toContain(bricks[2]); // S
      expect(adjacent).toContain(bricks[3]); // E
    });
  });

  describe('Corner brick handling (exactly 2 neighbors)', () => {
    it('top-left corner returns exactly 2 neighbors (E, S)', () => {
      const bricks = [
        createMockBrick(0, 0), // Source (top-left corner)
        createMockBrick(1, 0), // E
        createMockBrick(0, 1), // S
      ];

      const source = bricks[0];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      expect(adjacent).toHaveLength(2);
      expect(adjacent).toContain(bricks[1]); // E
      expect(adjacent).toContain(bricks[2]); // S
    });

    it('bottom-right corner returns exactly 2 neighbors (N, W)', () => {
      const bricks = [
        createMockBrick(9, 4), // N
        createMockBrick(8, 5), // W
        createMockBrick(9, 5), // Source (bottom-right corner)
      ];

      const source = bricks[2];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      expect(adjacent).toHaveLength(2);
      expect(adjacent).toContain(bricks[0]); // N
      expect(adjacent).toContain(bricks[1]); // W
    });

    it('top-right corner returns exactly 2 neighbors (W, S)', () => {
      const bricks = [
        createMockBrick(8, 0), // W
        createMockBrick(9, 0), // Source (top-right corner)
        createMockBrick(9, 1), // S
      ];

      const source = bricks[1];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      expect(adjacent).toHaveLength(2);
      expect(adjacent).toContain(bricks[0]); // W
      expect(adjacent).toContain(bricks[2]); // S
    });

    it('bottom-left corner returns exactly 2 neighbors (N, E)', () => {
      const bricks = [
        createMockBrick(0, 4), // N
        createMockBrick(0, 5), // Source (bottom-left corner)
        createMockBrick(1, 5), // E
      ];

      const source = bricks[1];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      expect(adjacent).toHaveLength(2);
      expect(adjacent).toContain(bricks[0]); // N
      expect(adjacent).toContain(bricks[2]); // E
    });
  });

  describe('Inactive bricks excluded', () => {
    it('excludes brick with active: false from adjacent list', () => {
      const bricks = [
        createMockBrick(1, 0, false), // N - inactive
        createMockBrick(1, 1, true),  // Source
        createMockBrick(1, 2, true),  // S - active
      ];

      const source = bricks[1];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      expect(adjacent).toHaveLength(1);
      expect(adjacent).toContain(bricks[2]); // Only S
      expect(adjacent).not.toContain(bricks[0]); // N is inactive
    });

    it('excludes all inactive neighbors even if positioned correctly', () => {
      const bricks = [
        createMockBrick(1, 0, false), // N - inactive
        createMockBrick(0, 1, false), // W - inactive
        createMockBrick(1, 1, true),  // Source
        createMockBrick(2, 1, false), // E - inactive
        createMockBrick(1, 2, false), // S - inactive
      ];

      const source = bricks[2];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      // All 4 potential neighbors are inactive
      expect(adjacent).toHaveLength(0);
    });

    it('only counts active bricks for AOE damage', () => {
      const bricks = [
        createMockBrick(1, 0, true),  // N - active
        createMockBrick(1, 1, true),  // Source
        createMockBrick(1, 2, false), // S - inactive
        createMockBrick(0, 1, true),  // W - active
        createMockBrick(2, 1, false), // E - inactive
      ];

      const source = bricks[1];
      const group = createMockBrickGroup(bricks);
      const adjacent = findAdjacentBricks(source, group);

      const scoreCallback = vi.fn();
      processAOEScoring(adjacent, scoreCallback);

      // Only 2 active neighbors should receive damage
      expect(scoreCallback).toHaveBeenCalledTimes(2);
      expect(bricks[0].takeDamage).toHaveBeenCalledWith(1); // N
      expect(bricks[3].takeDamage).toHaveBeenCalledWith(1); // W
      expect(bricks[2].takeDamage).not.toHaveBeenCalled();  // S (inactive)
      expect(bricks[4].takeDamage).not.toHaveBeenCalled();  // E (inactive)
    });
  });

  describe('Grid coordinate conversion', () => {
    it('correctly converts world coordinates to grid positions', () => {
      // Create bricks at known grid positions
      const brick00 = createMockBrick(0, 0);
      const brick55 = createMockBrick(5, 5);

      // Verify world coordinates are as expected
      expect(brick00.x).toBe(OFFSET_X);
      expect(brick00.y).toBe(BRICK_ROWS_START_Y);

      const expectedX = OFFSET_X + 5 * (BRICK_WIDTH + BRICK_PADDING);
      const expectedY = BRICK_ROWS_START_Y + 5 * (BRICK_HEIGHT + BRICK_PADDING);
      expect(brick55.x).toBe(expectedX);
      expect(brick55.y).toBe(expectedY);
    });

    it('handles sparse brick grid correctly', () => {
      // Only create bricks with gaps (not a contiguous grid)
      const bricks = [
        createMockBrick(2, 2), // Source
        createMockBrick(2, 0), // 2 rows above (not adjacent)
        createMockBrick(2, 3), // S (adjacent)
      ];

      const source = bricks[0];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      // Only the S neighbor is adjacent
      expect(adjacent).toHaveLength(1);
      expect(adjacent).toContain(bricks[2]); // S at (2,3)
      expect(adjacent).not.toContain(bricks[1]); // (2,0) is 2 rows away
    });
  });

  describe('Empty/minimal brick scenarios', () => {
    it('returns empty array when no neighbors exist', () => {
      const bricks = [
        createMockBrick(5, 5), // Isolated brick
      ];

      const source = bricks[0];
      const group = createMockBrickGroup(bricks);

      const adjacent = findAdjacentBricks(source, group);

      expect(adjacent).toHaveLength(0);
    });

    it('handles empty brick group gracefully', () => {
      const source = createMockBrick(1, 1);
      const group = createMockBrickGroup([source]); // Only source, no others

      const adjacent = findAdjacentBricks(source, group);

      expect(adjacent).toHaveLength(0);
    });
  });
});
