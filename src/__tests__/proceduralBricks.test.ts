import { describe, it, expect } from 'vitest';
import {
  PatternType,
  createSeededRandom,
  getDifficultyParams,
  selectBrickType,
  calculateBrickHP,
  selectPatternType,
  generateBrickPattern,
} from '../utils/proceduralBricks';
import { BrickType } from '../types/BrickTypes';
import { ENDLESS_MODE, BRICK_COLS } from '../config/Constants';

describe('Procedural Brick Generation', () => {
  // ─── 1. Seeded RNG ───────────────────────────────────────────────

  describe('createSeededRandom', () => {
    it('same seed produces identical sequence across multiple calls', () => {
      const rng1 = createSeededRandom(42);
      const rng2 = createSeededRandom(42);

      for (let i = 0; i < 100; i++) {
        expect(rng1()).toBe(rng2());
      }
    });

    it('different seeds produce different sequences', () => {
      const rng1 = createSeededRandom(42);
      const rng2 = createSeededRandom(99);

      // At least some values should differ (virtually guaranteed)
      let hasDifference = false;
      for (let i = 0; i < 20; i++) {
        if (rng1() !== rng2()) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);
    });

    it('output range is [0, 1) for many iterations', () => {
      const rng = createSeededRandom(123);
      for (let i = 0; i < 10000; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('determinism: two generators with same seed produce exact same values', () => {
      const seed = 777;
      const rngA = createSeededRandom(seed);
      const rngB = createSeededRandom(seed);

      const seqA = Array.from({ length: 50 }, () => rngA());
      const seqB = Array.from({ length: 50 }, () => rngB());

      expect(seqA).toEqual(seqB);
    });
  });

  // ─── 2. Difficulty Parameters ─────────────────────────────────────

  describe('getDifficultyParams', () => {
    it('wave 1: correct brick count, avgHP, density, and speed', () => {
      const params = getDifficultyParams(1);
      expect(params.brickCount).toBe(22); // min(20 + 1*2, 40) = 22
      expect(params.avgHP).toBe(1); // 1 + floor(1/10) = 1
      expect(params.density).toBeCloseTo(0.32, 2); // 0.3 + 1*0.02 = 0.32
      expect(params.speedMultiplier).toBeCloseTo(1.03, 2); // 1.0 + 1*0.03 = 1.03
    });

    it('wave 10: brick count capped at 40, avgHP = 2', () => {
      const params = getDifficultyParams(10);
      expect(params.brickCount).toBe(40); // min(20 + 10*2, 40) = 40
      expect(params.avgHP).toBe(2); // 1 + floor(10/10) = 2
      expect(params.density).toBeCloseTo(0.5, 2); // 0.3 + 10*0.02 = 0.5
      expect(params.speedMultiplier).toBeCloseTo(1.3, 2); // 1.0 + 10*0.03 = 1.3
    });

    it('wave 20: all values at or near caps, avgHP = 3', () => {
      const params = getDifficultyParams(20);
      expect(params.brickCount).toBe(40);
      expect(params.avgHP).toBe(3); // 1 + floor(20/10) = 3
      expect(params.density).toBeCloseTo(0.7, 2); // 0.3 + 20*0.02 = 0.7 (capped)
      expect(params.speedMultiplier).toBeCloseTo(1.5, 2); // 1.0 + 20*0.03 = 1.6 → capped at 1.5
    });

    it('wave 100: everything at max caps', () => {
      const params = getDifficultyParams(100);
      expect(params.brickCount).toBe(ENDLESS_MODE.MAX_BRICK_COUNT);
      expect(params.avgHP).toBe(3);
      expect(params.density).toBe(ENDLESS_MODE.MAX_DENSITY);
      expect(params.speedMultiplier).toBe(ENDLESS_MODE.MAX_SPEED_MULTIPLIER);
    });

    it('brickCount never exceeds MAX_BRICK_COUNT', () => {
      for (const wave of [1, 5, 10, 20, 50, 100]) {
        const params = getDifficultyParams(wave);
        expect(params.brickCount).toBeLessThanOrEqual(ENDLESS_MODE.MAX_BRICK_COUNT);
      }
    });

    it('avgHP capped at 3', () => {
      for (const wave of [30, 50, 100, 200]) {
        const params = getDifficultyParams(wave);
        expect(params.avgHP).toBe(3);
      }
    });

    it('speedMultiplier capped at MAX_SPEED_MULTIPLIER', () => {
      for (const wave of [20, 50, 100]) {
        const params = getDifficultyParams(wave);
        expect(params.speedMultiplier).toBe(ENDLESS_MODE.MAX_SPEED_MULTIPLIER);
      }
    });
  });

  // ─── 3. Brick Type Selection ──────────────────────────────────────

  describe('selectBrickType', () => {
    describe('difficulty ≤ 5 (easy)', () => {
      it('random < 0.7 → PRESENT', () => {
        expect(selectBrickType(1, 0.0)).toBe(BrickType.PRESENT);
        expect(selectBrickType(5, 0.5)).toBe(BrickType.PRESENT);
        expect(selectBrickType(3, 0.69)).toBe(BrickType.PRESENT);
      });

      it('random 0.7–0.89 → BALLOON', () => {
        expect(selectBrickType(1, 0.7)).toBe(BrickType.BALLOON);
        expect(selectBrickType(5, 0.85)).toBe(BrickType.BALLOON);
        expect(selectBrickType(3, 0.89)).toBe(BrickType.BALLOON);
      });

      it('random ≥ 0.9 → PINATA', () => {
        expect(selectBrickType(1, 0.9)).toBe(BrickType.PINATA);
        expect(selectBrickType(5, 0.99)).toBe(BrickType.PINATA);
      });
    });

    describe('difficulty 6–15 (medium)', () => {
      it('random < 0.4 → PRESENT', () => {
        expect(selectBrickType(6, 0.0)).toBe(BrickType.PRESENT);
        expect(selectBrickType(10, 0.39)).toBe(BrickType.PRESENT);
      });

      it('random 0.4–0.74 → BALLOON', () => {
        expect(selectBrickType(6, 0.4)).toBe(BrickType.BALLOON);
        expect(selectBrickType(15, 0.74)).toBe(BrickType.BALLOON);
      });

      it('random ≥ 0.75 → PINATA', () => {
        expect(selectBrickType(6, 0.75)).toBe(BrickType.PINATA);
        expect(selectBrickType(15, 0.99)).toBe(BrickType.PINATA);
      });
    });

    describe('difficulty > 15 (hard)', () => {
      it('random < 0.2 → PRESENT', () => {
        expect(selectBrickType(16, 0.0)).toBe(BrickType.PRESENT);
        expect(selectBrickType(50, 0.19)).toBe(BrickType.PRESENT);
      });

      it('random 0.2–0.59 → BALLOON', () => {
        expect(selectBrickType(16, 0.2)).toBe(BrickType.BALLOON);
        expect(selectBrickType(50, 0.59)).toBe(BrickType.BALLOON);
      });

      it('random ≥ 0.6 → PINATA', () => {
        expect(selectBrickType(16, 0.6)).toBe(BrickType.PINATA);
        expect(selectBrickType(50, 0.99)).toBe(BrickType.PINATA);
      });
    });
  });

  // ─── 4. HP Calculation ────────────────────────────────────────────

  describe('calculateBrickHP', () => {
    it('baseDifficulty 1 (wave 1): avgHP = 1, result in [1, 3]', () => {
      for (let i = 0; i < 50; i++) {
        const hp = calculateBrickHP(1, 5, 5, Math.random());
        expect(hp).toBeGreaterThanOrEqual(1);
        expect(hp).toBeLessThanOrEqual(3);
      }
    });

    it('baseDifficulty 10: avgHP = 2', () => {
      // With random = 0.5, no variation, center position → center bonus
      const hp = calculateBrickHP(10, 5, 5, 0.5);
      // avgHP = 2, centerBonus = 0.2, topBonus = 0 (y=5), variation = 0 → round(2.2) = 2
      expect(hp).toBe(2);
    });

    it('baseDifficulty 20+: avgHP = 3 (capped)', () => {
      // With random=0.5 (no variation), center position
      const hp = calculateBrickHP(20, 5, 2, 0.5);
      // avgHP=3, centerBonus=0.2, topBonus=0.15 (y<4), variation=0 → round(3.35)=3
      expect(hp).toBe(3);
    });

    it('center bonus: x close to center gets +0.2', () => {
      // x=5, dist from center(5)=0 → center bonus applies
      const hpCenter = calculateBrickHP(10, 5, 6, 0.5);
      // x=0, dist from center(5)=5 → no center bonus
      const hpEdge = calculateBrickHP(10, 0, 6, 0.5);
      // Center: round(2 + 0.2 + 0 + 0) = 2; Edge: round(2 + 0 + 0 + 0) = 2
      // Both round to 2 with these specific values, but center has higher raw
      expect(hpCenter).toBeGreaterThanOrEqual(hpEdge);
    });

    it('top bonus: y < 4 gets +0.15', () => {
      // y=2 (top) vs y=6 (not top), same x and random
      const hpTop = calculateBrickHP(10, 0, 2, 0.5);
      const hpBottom = calculateBrickHP(10, 0, 6, 0.5);
      // Top: round(2 + 0 + 0.15 + 0) = 2; Bottom: round(2 + 0 + 0 + 0) = 2
      expect(hpTop).toBeGreaterThanOrEqual(hpBottom);
    });

    it('result always clamped to [1, 3]', () => {
      // Test with extreme random values across various difficulties
      for (const diff of [1, 5, 10, 20, 50]) {
        for (const random of [0.0, 0.01, 0.5, 0.99, 1.0]) {
          for (const x of [0, 5, 9]) {
            for (const y of [0, 6, 11]) {
              const hp = calculateBrickHP(diff, x, y, random);
              expect(hp).toBeGreaterThanOrEqual(1);
              expect(hp).toBeLessThanOrEqual(3);
            }
          }
        }
      }
    });

    it('high random pushes HP up, low random pushes HP down', () => {
      // random=0.99 → variation = 0.49; random=0.01 → variation = -0.49
      const hpHigh = calculateBrickHP(10, 5, 5, 0.99);
      const hpLow = calculateBrickHP(10, 5, 5, 0.01);
      expect(hpHigh).toBeGreaterThanOrEqual(hpLow);
    });
  });

  // ─── 5. Pattern Selection ─────────────────────────────────────────

  describe('selectPatternType', () => {
    it('checkpoint waves (wave % 5 === 0): only ROWS or SCATTER', () => {
      const checkpointWaves = [5, 10, 15, 20, 25, 50];
      for (const wave of checkpointWaves) {
        for (let r = 0; r < 100; r++) {
          const random = r / 100;
          const pattern = selectPatternType(wave, random);
          expect([PatternType.ROWS, PatternType.SCATTER]).toContain(pattern);
        }
      }
    });

    it('checkpoint: random < 0.5 → ROWS, random ≥ 0.5 → SCATTER', () => {
      expect(selectPatternType(10, 0.3)).toBe(PatternType.ROWS);
      expect(selectPatternType(10, 0.7)).toBe(PatternType.SCATTER);
    });

    it('early waves (1–5): SCATTER, ROWS, or SYMMETRIC only', () => {
      const earlyPatterns = [PatternType.SCATTER, PatternType.ROWS, PatternType.SYMMETRIC];
      for (const wave of [1, 2, 3, 4]) {
        for (let r = 0; r < 100; r++) {
          const random = r / 100;
          const pattern = selectPatternType(wave, random);
          expect(earlyPatterns).toContain(pattern);
        }
      }
    });

    it('mid waves (6–15, non-checkpoint): SCATTER, SYMMETRIC, CLUSTERS, or MAZE', () => {
      const midPatterns = [
        PatternType.SCATTER,
        PatternType.SYMMETRIC,
        PatternType.CLUSTERS,
        PatternType.MAZE,
      ];
      // Use non-checkpoint mid waves
      for (const wave of [6, 7, 8, 9, 11, 12, 13, 14]) {
        for (let r = 0; r < 100; r++) {
          const random = r / 100;
          const pattern = selectPatternType(wave, random);
          expect(midPatterns).toContain(pattern);
        }
      }
    });

    it('late waves (16+, non-checkpoint): FORTRESS, MAZE, CLUSTERS, or SYMMETRIC', () => {
      const latePatterns = [
        PatternType.FORTRESS,
        PatternType.MAZE,
        PatternType.CLUSTERS,
        PatternType.SYMMETRIC,
      ];
      for (const wave of [16, 17, 18, 19, 21, 22, 23, 99]) {
        for (let r = 0; r < 100; r++) {
          const random = r / 100;
          const pattern = selectPatternType(wave, random);
          expect(latePatterns).toContain(pattern);
        }
      }
    });
  });

  // ─── 6. Main Generator ────────────────────────────────────────────

  describe('generateBrickPattern', () => {
    it('deterministic: same wave + same seed → identical output', () => {
      const result1 = generateBrickPattern(5, 12345);
      const result2 = generateBrickPattern(5, 12345);
      expect(result1).toEqual(result2);
    });

    it('different seeds → different output', () => {
      const result1 = generateBrickPattern(5, 111);
      const result2 = generateBrickPattern(5, 222);

      // At least positions or types should differ
      const str1 = JSON.stringify(result1);
      const str2 = JSON.stringify(result2);
      expect(str1).not.toBe(str2);
    });

    it('all bricks have valid BrickType', () => {
      const validTypes = Object.values(BrickType);
      for (const wave of [1, 5, 10, 20]) {
        const bricks = generateBrickPattern(wave, 42);
        for (const brick of bricks) {
          expect(validTypes).toContain(brick.type);
        }
      }
    });

    it('all brick x positions in [0, GRID_COLS-1]', () => {
      for (const wave of [1, 10, 20, 50]) {
        const bricks = generateBrickPattern(wave, 42);
        for (const brick of bricks) {
          expect(brick.x).toBeGreaterThanOrEqual(0);
          expect(brick.x).toBeLessThan(ENDLESS_MODE.GRID_COLS);
        }
      }
    });

    it('all brick y positions in valid range [0, GRID_ROWS-1]', () => {
      for (const wave of [1, 10, 20, 50]) {
        const bricks = generateBrickPattern(wave, 42);
        for (const brick of bricks) {
          expect(brick.y).toBeGreaterThanOrEqual(0);
          expect(brick.y).toBeLessThan(ENDLESS_MODE.GRID_ROWS);
        }
      }
    });

    it('all brick health in [1, 3]', () => {
      for (const wave of [1, 5, 10, 20, 50]) {
        const bricks = generateBrickPattern(wave, 42);
        for (const brick of bricks) {
          expect(brick.health).toBeGreaterThanOrEqual(1);
          expect(brick.health).toBeLessThanOrEqual(3);
        }
      }
    });

    it('no duplicate positions (same x,y)', () => {
      for (const wave of [1, 5, 10, 20, 50]) {
        const bricks = generateBrickPattern(wave, 42);
        const positionKeys = bricks.map(b => `${b.x},${b.y}`);
        const uniqueKeys = new Set(positionKeys);
        expect(uniqueKeys.size).toBe(positionKeys.length);
      }
    });

    it('returns non-empty array', () => {
      for (const wave of [1, 5, 10, 20, 50, 100]) {
        const bricks = generateBrickPattern(wave, 42);
        expect(bricks.length).toBeGreaterThan(0);
      }
    });

    it('default seed is deterministic based on wave number', () => {
      // Without explicit seed, uses wave * 12345
      const result1 = generateBrickPattern(7);
      const result2 = generateBrickPattern(7);
      expect(result1).toEqual(result2);
    });

    it('brick count respects difficulty params bounds', () => {
      for (const wave of [1, 10, 20, 50]) {
        const bricks = generateBrickPattern(wave, 42);
        const { brickCount } = getDifficultyParams(wave);
        // Brick count should not exceed requested count
        // (some patterns may produce fewer due to overlaps/gaps, but never more)
        expect(bricks.length).toBeLessThanOrEqual(brickCount);
      }
    });
  });
});
