/**
 * Procedural brick generation utilities for Endless Mode
 * Pure functions for testability
 */

import { BrickType, BrickConfig } from '../types/BrickTypes';
import { ENDLESS_MODE, BRICK_COLS } from '../config/Constants';

/**
 * Pattern types for procedural generation
 */
export enum PatternType {
  SCATTER = 'scatter',
  SYMMETRIC = 'symmetric',
  FORTRESS = 'fortress',
  MAZE = 'maze',
  CLUSTERS = 'clusters',
  ROWS = 'rows',
}

/**
 * Seeded random number generator for consistent wave generation
 * Uses mulberry32 algorithm
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return function () {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Calculate difficulty parameters based on wave number
 */
export function getDifficultyParams(wave: number): {
  brickCount: number;
  avgHP: number;
  density: number;
  speedMultiplier: number;
} {
  // Brick count: 20 → 40 bricks
  const brickCount = Math.min(
    ENDLESS_MODE.BASE_BRICK_COUNT + wave * 2,
    ENDLESS_MODE.MAX_BRICK_COUNT
  );

  // HP increases every 10 waves: 1 → 2 → 3
  const avgHP = Math.min(1 + Math.floor(wave / ENDLESS_MODE.HP_INCREMENT_WAVE_INTERVAL), 3);

  // Density: 30% → 70% grid fill
  const density = Math.min(
    ENDLESS_MODE.BASE_DENSITY + wave * ENDLESS_MODE.DENSITY_INCREMENT_PER_WAVE,
    ENDLESS_MODE.MAX_DENSITY
  );

  // Ball speed: 1.0× → 1.5× speed
  const speedMultiplier = Math.min(
    1.0 + wave * ENDLESS_MODE.SPEED_INCREMENT_PER_WAVE,
    ENDLESS_MODE.MAX_SPEED_MULTIPLIER
  );

  return { brickCount, avgHP, density, speedMultiplier };
}

/**
 * Select brick type based on difficulty and random value
 * Higher waves favor tougher brick types with better drops
 */
export function selectBrickType(difficulty: number, random: number): BrickType {
  // Wave 1-5: Mostly Presents
  // Wave 6-15: Mixed
  // Wave 16+: Mostly Piñatas and Balloons

  if (difficulty <= 5) {
    // Easy: 70% Present, 20% Balloon, 10% Piñata
    if (random < 0.7) return BrickType.PRESENT;
    if (random < 0.9) return BrickType.BALLOON;
    return BrickType.PINATA;
  } else if (difficulty <= 15) {
    // Medium: 40% Present, 35% Balloon, 25% Piñata
    if (random < 0.4) return BrickType.PRESENT;
    if (random < 0.75) return BrickType.BALLOON;
    return BrickType.PINATA;
  } else {
    // Hard: 20% Present, 40% Balloon, 40% Piñata
    if (random < 0.2) return BrickType.PRESENT;
    if (random < 0.6) return BrickType.BALLOON;
    return BrickType.PINATA;
  }
}

/**
 * Calculate brick HP based on difficulty and position
 * Bricks toward the top and center tend to have more HP
 */
export function calculateBrickHP(
  baseDifficulty: number,
  x: number,
  y: number,
  random: number
): number {
  const avgHP = Math.min(1 + Math.floor(baseDifficulty / 10), 3);

  // Center bricks have slightly higher chance of more HP
  const centerX = BRICK_COLS / 2;
  const distFromCenter = Math.abs(x - centerX);
  const centerBonus = distFromCenter < 3 ? 0.2 : 0;

  // Top bricks have higher chance of more HP
  const topBonus = y < 4 ? 0.15 : 0;

  // Random variation
  const variation = random - 0.5;

  const hp = Math.round(avgHP + centerBonus + topBonus + variation);
  return Math.max(1, Math.min(3, hp));
}

/**
 * Select pattern type based on wave number
 * Checkpoint waves (every 5) use special "breather" patterns
 */
export function selectPatternType(wave: number, random: number): PatternType {
  const isCheckpoint = wave % ENDLESS_MODE.CHECKPOINT_INTERVAL === 0;

  if (isCheckpoint) {
    // Checkpoint waves are easier - use simpler patterns
    return random < 0.5 ? PatternType.ROWS : PatternType.SCATTER;
  }

  if (wave <= 5) {
    // Early waves: simple patterns
    const patterns = [PatternType.SCATTER, PatternType.ROWS, PatternType.SYMMETRIC];
    return patterns[Math.floor(random * patterns.length)];
  } else if (wave <= 15) {
    // Mid waves: mixed patterns
    const patterns = [PatternType.SCATTER, PatternType.SYMMETRIC, PatternType.CLUSTERS, PatternType.MAZE];
    return patterns[Math.floor(random * patterns.length)];
  } else {
    // Late waves: harder patterns
    const patterns = [PatternType.FORTRESS, PatternType.MAZE, PatternType.CLUSTERS, PatternType.SYMMETRIC];
    return patterns[Math.floor(random * patterns.length)];
  }
}

/**
 * Generate a grid of possible positions
 */
function generateGrid(cols: number, rows: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      positions.push({ x, y });
    }
  }
  return positions;
}

/**
 * Shuffle array using seeded random
 */
function shuffleArray<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate scatter pattern - random brick placement
 */
function generateScatterPattern(
  count: number,
  difficulty: number,
  random: () => number
): BrickConfig[] {
  const positions = generateGrid(ENDLESS_MODE.GRID_COLS, ENDLESS_MODE.GRID_ROWS);
  const shuffled = shuffleArray(positions, random);
  const selected = shuffled.slice(0, count);

  return selected.map(pos => ({
    x: pos.x,
    y: pos.y,
    type: selectBrickType(difficulty, random()),
    health: calculateBrickHP(difficulty, pos.x, pos.y, random()),
  }));
}

/**
 * Generate symmetric pattern - mirrored horizontally
 */
function generateSymmetricPattern(
  count: number,
  difficulty: number,
  random: () => number
): BrickConfig[] {
  const bricks: BrickConfig[] = [];
  const halfCols = Math.floor(ENDLESS_MODE.GRID_COLS / 2);
  const positions = generateGrid(halfCols, ENDLESS_MODE.GRID_ROWS);
  const shuffled = shuffleArray(positions, random);
  const halfCount = Math.ceil(count / 2);
  const selected = shuffled.slice(0, halfCount);

  selected.forEach(pos => {
    const type = selectBrickType(difficulty, random());
    const health = calculateBrickHP(difficulty, pos.x, pos.y, random());

    // Left side
    bricks.push({ x: pos.x, y: pos.y, type, health });

    // Right side (mirrored)
    const mirrorX = ENDLESS_MODE.GRID_COLS - 1 - pos.x;
    if (mirrorX !== pos.x && bricks.length < count) {
      bricks.push({ x: mirrorX, y: pos.y, type, health });
    }
  });

  return bricks.slice(0, count);
}

/**
 * Generate fortress pattern - tough core, softer outer shell
 */
function generateFortressPattern(
  count: number,
  difficulty: number,
  random: () => number
): BrickConfig[] {
  const bricks: BrickConfig[] = [];
  const centerX = Math.floor(ENDLESS_MODE.GRID_COLS / 2);
  const centerY = Math.floor(ENDLESS_MODE.GRID_ROWS / 3);

  // Core bricks (high HP)
  const coreSize = Math.min(3 + Math.floor(difficulty / 10), 4);
  for (let dy = -1; dy <= coreSize - 2; dy++) {
    for (let dx = -coreSize + 1; dx <= coreSize - 1; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x >= 0 && x < ENDLESS_MODE.GRID_COLS && y >= 0 && y < ENDLESS_MODE.GRID_ROWS) {
        if (bricks.length < count * 0.4) {
          bricks.push({
            x,
            y,
            type: BrickType.PINATA,
            health: Math.min(2 + Math.floor(difficulty / 15), 3),
          });
        }
      }
    }
  }

  // Outer shell (lower HP)
  const shellPositions: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < ENDLESS_MODE.GRID_ROWS; y++) {
    for (let x = 0; x < ENDLESS_MODE.GRID_COLS; x++) {
      const isCore = bricks.some(b => b.x === x && b.y === y);
      if (!isCore) {
        shellPositions.push({ x, y });
      }
    }
  }

  const shuffledShell = shuffleArray(shellPositions, random);
  const shellCount = Math.min(count - bricks.length, shuffledShell.length);

  for (let i = 0; i < shellCount; i++) {
    const pos = shuffledShell[i];
    bricks.push({
      x: pos.x,
      y: pos.y,
      type: selectBrickType(difficulty, random()),
      health: 1,
    });
  }

  return bricks;
}

/**
 * Generate maze pattern - passages and pockets
 */
function generateMazePattern(
  count: number,
  difficulty: number,
  random: () => number
): BrickConfig[] {
  const bricks: BrickConfig[] = [];

  // Create vertical channels
  const channelCount = 2 + Math.floor(random() * 2);
  const channels: number[] = [];
  for (let i = 0; i < channelCount; i++) {
    channels.push(Math.floor(random() * ENDLESS_MODE.GRID_COLS));
  }

  // Fill grid except channels
  for (let y = 0; y < ENDLESS_MODE.GRID_ROWS && bricks.length < count; y++) {
    // Skip some rows for horizontal passages
    if (random() < 0.3) continue;

    for (let x = 0; x < ENDLESS_MODE.GRID_COLS && bricks.length < count; x++) {
      // Skip channels
      if (channels.includes(x)) continue;

      // Random gaps
      if (random() < 0.25) continue;

      bricks.push({
        x,
        y,
        type: selectBrickType(difficulty, random()),
        health: calculateBrickHP(difficulty, x, y, random()),
      });
    }
  }

  return bricks;
}

/**
 * Generate clusters pattern - grouped brick formations
 */
function generateClustersPattern(
  count: number,
  difficulty: number,
  random: () => number
): BrickConfig[] {
  const bricks: BrickConfig[] = [];
  const clusterCount = 3 + Math.floor(random() * 3);
  // Note: bricksPerCluster is approximate; we use count limit directly in loop
  const _bricksPerCluster = Math.ceil(count / clusterCount);
  void _bricksPerCluster; // Suppress unused variable warning

  for (let c = 0; c < clusterCount && bricks.length < count; c++) {
    const centerX = Math.floor(random() * (ENDLESS_MODE.GRID_COLS - 2)) + 1;
    const centerY = Math.floor(random() * (ENDLESS_MODE.GRID_ROWS - 2));
    const clusterType = selectBrickType(difficulty, random());

    // Create cluster around center
    for (let dy = -1; dy <= 1 && bricks.length < count; dy++) {
      for (let dx = -1; dx <= 1 && bricks.length < count; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && x < ENDLESS_MODE.GRID_COLS && y >= 0 && y < ENDLESS_MODE.GRID_ROWS) {
          // Check for overlap
          const exists = bricks.some(b => b.x === x && b.y === y);
          if (!exists && random() < 0.8) {
            bricks.push({
              x,
              y,
              type: clusterType,
              health: calculateBrickHP(difficulty, x, y, random()),
            });
          }
        }
      }
    }
  }

  return bricks;
}

/**
 * Generate rows pattern - horizontal lines with gaps
 */
function generateRowsPattern(
  count: number,
  difficulty: number,
  random: () => number
): BrickConfig[] {
  const bricks: BrickConfig[] = [];
  const rowCount = Math.ceil(count / ENDLESS_MODE.GRID_COLS);

  for (let row = 0; row < rowCount && bricks.length < count; row++) {
    const y = row + Math.floor(random() * 2); // Slight y variation
    const gapCount = Math.floor(random() * 3);
    const gaps: number[] = [];

    for (let g = 0; g < gapCount; g++) {
      gaps.push(Math.floor(random() * ENDLESS_MODE.GRID_COLS));
    }

    for (let x = 0; x < ENDLESS_MODE.GRID_COLS && bricks.length < count; x++) {
      if (!gaps.includes(x)) {
        bricks.push({
          x,
          y: Math.min(y, ENDLESS_MODE.GRID_ROWS - 1),
          type: selectBrickType(difficulty, random()),
          health: calculateBrickHP(difficulty, x, y, random()),
        });
      }
    }
  }

  return bricks;
}

/**
 * Main function: Generate a complete brick layout for a wave
 */
export function generateBrickPattern(wave: number, seed?: number): BrickConfig[] {
  const actualSeed = seed ?? wave * 12345;
  const random = createSeededRandom(actualSeed);

  const { brickCount } = getDifficultyParams(wave);
  const patternType = selectPatternType(wave, random());

  let bricks: BrickConfig[];

  switch (patternType) {
    case PatternType.SCATTER:
      bricks = generateScatterPattern(brickCount, wave, random);
      break;
    case PatternType.SYMMETRIC:
      bricks = generateSymmetricPattern(brickCount, wave, random);
      break;
    case PatternType.FORTRESS:
      bricks = generateFortressPattern(brickCount, wave, random);
      break;
    case PatternType.MAZE:
      bricks = generateMazePattern(brickCount, wave, random);
      break;
    case PatternType.CLUSTERS:
      bricks = generateClustersPattern(brickCount, wave, random);
      break;
    case PatternType.ROWS:
      bricks = generateRowsPattern(brickCount, wave, random);
      break;
    default:
      bricks = generateScatterPattern(brickCount, wave, random);
  }

  // Ensure no duplicate positions
  const uniqueBricks: BrickConfig[] = [];
  const seen = new Set<string>();

  for (const brick of bricks) {
    const key = `${brick.x},${brick.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueBricks.push(brick);
    }
  }

  return uniqueBricks;
}
