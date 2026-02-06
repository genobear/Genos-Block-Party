import { BrickType, BrickConfig } from '../types/BrickTypes';

export interface LevelData {
  id: number;
  name: string;
  subtitle: string;
  ballSpeedMultiplier: number;
  backgroundColor: number;
  bricks: BrickConfig[];
  bumpers?: { x: number; y: number }[];
}

/**
 * Helper to generate a full row of bricks
 */
function generateRow(
  y: number,
  type: BrickType,
  health: number,
  startX: number = 0,
  endX: number = 9
): BrickConfig[] {
  const bricks: BrickConfig[] = [];
  for (let x = startX; x <= endX; x++) {
    bricks.push({ x, y, type, health });
  }
  return bricks;
}

/**
 * Helper to generate a checkerboard pattern row
 */
function generateCheckerboardRow(
  y: number,
  types: [BrickType, BrickType],
  healths: [number, number],
  offset: number = 0
): BrickConfig[] {
  const bricks: BrickConfig[] = [];
  for (let x = 0; x <= 9; x++) {
    const idx = (x + offset) % 2;
    bricks.push({ x, y, type: types[idx], health: healths[idx] });
  }
  return bricks;
}

/**
 * Helper to generate a row with gaps at specified positions
 */
function generateRowWithGaps(
  y: number,
  type: BrickType,
  health: number,
  gaps: number[]
): BrickConfig[] {
  const bricks: BrickConfig[] = [];
  for (let x = 0; x <= 9; x++) {
    if (!gaps.includes(x)) {
      bricks.push({ x, y, type, health });
    }
  }
  return bricks;
}

/**
 * Helper to generate vertical column
 */
function generateColumn(
  x: number,
  startY: number,
  endY: number,
  type: BrickType,
  health: number
): BrickConfig[] {
  const bricks: BrickConfig[] = [];
  for (let y = startY; y <= endY; y++) {
    bricks.push({ x, y, type, health });
  }
  return bricks;
}

export const LEVELS: LevelData[] = [
  // ===========================================
  // Level 1: The Warm-Up
  // Simple intro - bricks close to paddle
  // ===========================================
  {
    id: 1,
    name: "The Warm-Up",
    subtitle: "Let's get this party started!",
    ballSpeedMultiplier: 1.0,
    backgroundColor: 0x1a1a2e,
    bricks: [
      // Test drifter brick
      { x: 5, y: 2, type: BrickType.DRIFTER, health: 1 },
      // Bricks at y=6-8, much closer to paddle
      ...generateRow(6, BrickType.PRESENT, 1),
      ...generateRow(7, BrickType.PRESENT, 1),
      ...generateRow(8, BrickType.PRESENT, 1),
    ],
  },

  // ===========================================
  // Level 2: Dance Floor
  // Introduce mixed types, still close to paddle
  // ===========================================
  {
    id: 2,
    name: "Dance Floor",
    subtitle: "Show us your moves!",
    ballSpeedMultiplier: 1.0,
    backgroundColor: 0x16213e,
    bricks: [
      // Checkerboard starting at y=4
      ...generateCheckerboardRow(4, [BrickType.PRESENT, BrickType.BALLOON], [1, 1], 0),
      ...generateCheckerboardRow(5, [BrickType.BALLOON, BrickType.PRESENT], [1, 1], 0),
      ...generateCheckerboardRow(6, [BrickType.PRESENT, BrickType.BALLOON], [1, 1], 0),
      ...generateCheckerboardRow(7, [BrickType.BALLOON, BrickType.PRESENT], [1, 1], 0),
    ],
  },

  // ===========================================
  // Level 3: Gift Wrapped
  // Pyramid with HP variation + bumpers
  // ===========================================
  {
    id: 3,
    name: "Gift Wrapped",
    subtitle: "Presents for everyone!",
    ballSpeedMultiplier: 1.05,
    backgroundColor: 0x1f4037,
    bricks: [
      // Inverted pyramid - wider at top, closer to paddle
      ...generateRow(3, BrickType.PRESENT, 1),
      ...generateRow(4, BrickType.PRESENT, 1, 1, 8),
      ...generateRow(5, BrickType.PRESENT, 2, 2, 7),
      ...generateRow(6, BrickType.BALLOON, 2, 3, 6),
      ...generateRow(7, BrickType.PINATA, 2, 4, 5),
    ],
    // Pinball bumpers for extra chaos
    bumpers: [
      { x: 200, y: 600 },
      { x: 600, y: 600 },
    ],
  },

  // ===========================================
  // Level 4: Balloon Bonanza
  // First "sections" level - two groups with gap
  // ===========================================
  {
    id: 4,
    name: "Balloon Bonanza",
    subtitle: "Pop 'em all!",
    ballSpeedMultiplier: 1.08,
    backgroundColor: 0x0f3460,
    bricks: [
      // Upper section
      ...generateRow(2, BrickType.BALLOON, 1),
      ...generateRow(3, BrickType.BALLOON, 1),
      // Gap at y=4-5 for ball to get in
      // Lower section (closer to paddle)
      ...generateRow(6, BrickType.BALLOON, 2),
      ...generateRow(7, BrickType.BALLOON, 2),
      ...generateRow(8, BrickType.PRESENT, 1),
    ],
  },

  // ===========================================
  // Level 5: Piñata Panic
  // Channels - vertical gaps for ball to slip through
  // ===========================================
  {
    id: 5,
    name: "Piñata Panic",
    subtitle: "Swing harder!",
    ballSpeedMultiplier: 1.12,
    backgroundColor: 0x533483,
    bricks: [
      // Dense piñatas with vertical channels at x=3 and x=6
      ...generateRowWithGaps(1, BrickType.PINATA, 2, [3, 6]),
      ...generateRowWithGaps(2, BrickType.PINATA, 2, [3, 6]),
      ...generateRowWithGaps(3, BrickType.PINATA, 2, [3, 6]),
      ...generateRowWithGaps(4, BrickType.PINATA, 2, [3, 6]),
      ...generateRowWithGaps(5, BrickType.PINATA, 1, [3, 6]),
      // Bottom row seals it (ball has to break through or use channels)
      ...generateRow(7, BrickType.PRESENT, 1),
    ],
  },

  // ===========================================
  // Level 6: The Maze
  // Multiple pockets and passages
  // ===========================================
  {
    id: 6,
    name: "The Maze",
    subtitle: "Find your way!",
    ballSpeedMultiplier: 1.15,
    backgroundColor: 0x2c3e50,
    bricks: [
      // Top walls with center gap
      ...generateRow(0, BrickType.PRESENT, 2, 0, 3),
      ...generateRow(0, BrickType.PRESENT, 2, 6, 9),
      // Second row - side walls only
      ...generateRow(2, BrickType.BALLOON, 2, 0, 1),
      ...generateRow(2, BrickType.BALLOON, 2, 8, 9),
      // Middle section - creates pockets
      ...generateRow(4, BrickType.PINATA, 2, 2, 4),
      ...generateRow(4, BrickType.PINATA, 2, 5, 7),
      ...generateRow(5, BrickType.PINATA, 2, 2, 4),
      ...generateRow(5, BrickType.PINATA, 2, 5, 7),
      // Bottom barriers
      ...generateRowWithGaps(7, BrickType.PRESENT, 1, [0, 4, 5, 9]),
      ...generateRowWithGaps(8, BrickType.PRESENT, 1, [2, 3, 6, 7]),
    ],
  },

  // ===========================================
  // Level 7: Disco Fever
  // Three distinct sections, high power-up drops
  // ===========================================
  {
    id: 7,
    name: "Disco Fever",
    subtitle: "Lights, camera, action!",
    ballSpeedMultiplier: 1.18,
    backgroundColor: 0x4a0080,
    bricks: [
      // Top section - sparse but tough
      ...generateRowWithGaps(0, BrickType.BALLOON, 3, [2, 4, 5, 7]),
      ...generateRowWithGaps(1, BrickType.BALLOON, 2, [0, 3, 6, 9]),
      // Middle section - checkerboard
      ...generateCheckerboardRow(4, [BrickType.PINATA, BrickType.PRESENT], [2, 2], 0),
      ...generateCheckerboardRow(5, [BrickType.PRESENT, BrickType.PINATA], [2, 2], 0),
      // Bottom section - solid wall
      ...generateRow(8, BrickType.PRESENT, 1),
      ...generateRow(9, BrickType.BALLOON, 2),
    ],
  },

  // ===========================================
  // Level 8: Sugar Rush
  // Fast-paced with lots of 1-hit bricks
  // Vertical columns create bounce chambers
  // ===========================================
  {
    id: 8,
    name: "Sugar Rush",
    subtitle: "Too much cake!",
    ballSpeedMultiplier: 1.22,
    backgroundColor: 0xff6b6b,
    bricks: [
      // Top scattered bricks
      { x: 1, y: 0, type: BrickType.PRESENT, health: 1 },
      { x: 4, y: 0, type: BrickType.BALLOON, health: 1 },
      { x: 5, y: 0, type: BrickType.BALLOON, health: 1 },
      { x: 8, y: 0, type: BrickType.PRESENT, health: 1 },
      // Vertical columns creating chambers
      ...generateColumn(0, 2, 8, BrickType.PINATA, 1),
      ...generateColumn(3, 2, 6, BrickType.BALLOON, 1),
      ...generateColumn(6, 2, 6, BrickType.BALLOON, 1),
      ...generateColumn(9, 2, 8, BrickType.PINATA, 1),
      // Fill the chambers
      ...generateRow(3, BrickType.PRESENT, 1, 1, 2),
      ...generateRow(3, BrickType.PRESENT, 1, 7, 8),
      ...generateRow(5, BrickType.PRESENT, 1, 4, 5),
      // Bottom rows
      ...generateRow(8, BrickType.PRESENT, 1, 1, 8),
      ...generateRow(10, BrickType.BALLOON, 1),
    ],
  },

  // ===========================================
  // Level 9: Last Call
  // Fortress pattern - tough core, softer outer
  // ===========================================
  {
    id: 9,
    name: "Last Call",
    subtitle: "The party's almost over!",
    ballSpeedMultiplier: 1.28,
    backgroundColor: 0x2d132c,
    bricks: [
      // Outer shell (lower HP)
      ...generateRow(0, BrickType.PRESENT, 1),
      ...generateRow(1, BrickType.PRESENT, 1, 0, 0),
      ...generateRow(1, BrickType.PRESENT, 1, 9, 9),
      ...generateRow(2, BrickType.PRESENT, 1, 0, 0),
      ...generateRow(2, BrickType.PRESENT, 1, 9, 9),
      ...generateRow(3, BrickType.PRESENT, 1, 0, 0),
      ...generateRow(3, BrickType.PRESENT, 1, 9, 9),
      ...generateRow(4, BrickType.PRESENT, 1),
      // Inner fortress (high HP)
      ...generateRow(1, BrickType.PINATA, 3, 3, 6),
      ...generateRow(2, BrickType.PINATA, 3, 2, 7),
      ...generateRow(3, BrickType.PINATA, 3, 3, 6),
      // Gap then lower defenses
      ...generateRow(6, BrickType.BALLOON, 2, 1, 8),
      ...generateRow(7, BrickType.BALLOON, 2, 2, 7),
      ...generateRowWithGaps(9, BrickType.PRESENT, 1, [0, 9]),
    ],
  },

  // ===========================================
  // Level 10: Grand Finale
  // Full vertical space, multiple sections, max chaos
  // ===========================================
  {
    id: 10,
    name: "Grand Finale",
    subtitle: "Give it everything you've got!",
    ballSpeedMultiplier: 1.35,
    backgroundColor: 0x000000,
    bricks: [
      // TOP SECTION - The Crown (HP 3)
      { x: 4, y: 0, type: BrickType.PINATA, health: 3 },
      { x: 5, y: 0, type: BrickType.PINATA, health: 3 },
      ...generateRow(1, BrickType.PINATA, 3, 2, 7),
      ...generateRow(2, BrickType.PINATA, 3, 1, 8),

      // MIDDLE SECTION - The Gauntlet (HP 2-3, with channels)
      ...generateRowWithGaps(4, BrickType.BALLOON, 3, [2, 7]),
      ...generateRowWithGaps(5, BrickType.BALLOON, 2, [2, 7]),
      ...generateRowWithGaps(6, BrickType.PINATA, 2, [2, 7]),
      ...generateRowWithGaps(7, BrickType.PINATA, 2, [2, 7]),

      // LOWER SECTION - The Maze (HP 1-2)
      ...generateRow(9, BrickType.PRESENT, 2, 0, 3),
      ...generateRow(9, BrickType.PRESENT, 2, 6, 9),
      ...generateRow(10, BrickType.BALLOON, 1, 0, 1),
      ...generateRow(10, BrickType.BALLOON, 1, 8, 9),
      ...generateRow(10, BrickType.PRESENT, 2, 4, 5),

      // BOTTOM - Final Defense (HP 1)
      ...generateRow(12, BrickType.PRESENT, 1),
      ...generateRowWithGaps(13, BrickType.BALLOON, 1, [4, 5]),
    ],
  },
];
