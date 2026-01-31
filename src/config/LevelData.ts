import { BrickType, BrickConfig } from '../types/BrickTypes';

export interface LevelData {
  id: number;
  name: string;
  subtitle: string;
  ballSpeedMultiplier: number;
  powerUpDropChance: number;
  backgroundColor: number;
  bricks: BrickConfig[];
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

export const LEVELS: LevelData[] = [
  // Level 1: The Warm-Up
  {
    id: 1,
    name: "The Warm-Up",
    subtitle: "Let's get this party started!",
    ballSpeedMultiplier: 1.0,
    powerUpDropChance: 0.3,
    backgroundColor: 0x1a1a2e,
    bricks: [
      ...generateRow(0, BrickType.PRESENT, 1),
      ...generateRow(1, BrickType.PRESENT, 1),
      ...generateRow(2, BrickType.PRESENT, 1),
    ],
  },

  // Level 2: Dance Floor
  {
    id: 2,
    name: "Dance Floor",
    subtitle: "Show us your moves!",
    ballSpeedMultiplier: 1.05,
    powerUpDropChance: 0.28,
    backgroundColor: 0x16213e,
    bricks: [
      ...generateCheckerboardRow(0, [BrickType.PRESENT, BrickType.BALLOON], [1, 1], 0),
      ...generateCheckerboardRow(1, [BrickType.PRESENT, BrickType.BALLOON], [1, 1], 1),
      ...generateCheckerboardRow(2, [BrickType.BALLOON, BrickType.PRESENT], [2, 1], 0),
      ...generateCheckerboardRow(3, [BrickType.BALLOON, BrickType.PRESENT], [2, 1], 1),
    ],
  },

  // Level 3: Gift Wrapped
  {
    id: 3,
    name: "Gift Wrapped",
    subtitle: "Presents for everyone!",
    ballSpeedMultiplier: 1.1,
    powerUpDropChance: 0.25,
    backgroundColor: 0x1f4037,
    bricks: [
      // Pyramid of presents
      { x: 4, y: 0, type: BrickType.PRESENT, health: 3 },
      { x: 5, y: 0, type: BrickType.PRESENT, health: 3 },
      { x: 3, y: 1, type: BrickType.PRESENT, health: 2 },
      { x: 4, y: 1, type: BrickType.PRESENT, health: 2 },
      { x: 5, y: 1, type: BrickType.PRESENT, health: 2 },
      { x: 6, y: 1, type: BrickType.PRESENT, health: 2 },
      { x: 2, y: 2, type: BrickType.PRESENT, health: 1 },
      { x: 3, y: 2, type: BrickType.PRESENT, health: 1 },
      { x: 4, y: 2, type: BrickType.PRESENT, health: 1 },
      { x: 5, y: 2, type: BrickType.PRESENT, health: 1 },
      { x: 6, y: 2, type: BrickType.PRESENT, health: 1 },
      { x: 7, y: 2, type: BrickType.PRESENT, health: 1 },
      ...generateRow(3, BrickType.PRESENT, 1, 1, 8),
      ...generateRow(4, BrickType.PRESENT, 1),
    ],
  },

  // Level 4: Balloon Bonanza
  {
    id: 4,
    name: "Balloon Bonanza",
    subtitle: "Pop 'em all!",
    ballSpeedMultiplier: 1.15,
    powerUpDropChance: 0.25,
    backgroundColor: 0x0f3460,
    bricks: [
      ...generateRow(0, BrickType.BALLOON, 2),
      ...generateRow(1, BrickType.BALLOON, 2),
      ...generateRow(2, BrickType.BALLOON, 1),
      ...generateRow(3, BrickType.BALLOON, 1),
      ...generateRow(4, BrickType.PRESENT, 1),
    ],
  },

  // Level 5: Piñata Panic
  {
    id: 5,
    name: "Piñata Panic",
    subtitle: "Swing harder!",
    ballSpeedMultiplier: 1.2,
    powerUpDropChance: 0.22,
    backgroundColor: 0x533483,
    bricks: [
      ...generateRow(0, BrickType.PINATA, 3, 2, 7),
      ...generateRow(1, BrickType.PINATA, 2, 1, 8),
      ...generateRow(2, BrickType.PINATA, 2),
      ...generateRow(3, BrickType.PINATA, 1),
      ...generateRow(4, BrickType.PRESENT, 1),
    ],
  },

  // Level 6: The Maze
  {
    id: 6,
    name: "The Maze",
    subtitle: "Find your way!",
    ballSpeedMultiplier: 1.2,
    powerUpDropChance: 0.2,
    backgroundColor: 0x2c3e50,
    bricks: [
      // Maze-like pattern with gaps
      { x: 0, y: 0, type: BrickType.PRESENT, health: 2 },
      { x: 1, y: 0, type: BrickType.PRESENT, health: 2 },
      { x: 2, y: 0, type: BrickType.PRESENT, health: 2 },
      { x: 4, y: 0, type: BrickType.BALLOON, health: 2 },
      { x: 5, y: 0, type: BrickType.BALLOON, health: 2 },
      { x: 7, y: 0, type: BrickType.PRESENT, health: 2 },
      { x: 8, y: 0, type: BrickType.PRESENT, health: 2 },
      { x: 9, y: 0, type: BrickType.PRESENT, health: 2 },
      { x: 2, y: 1, type: BrickType.PINATA, health: 2 },
      { x: 4, y: 1, type: BrickType.PINATA, health: 2 },
      { x: 5, y: 1, type: BrickType.PINATA, health: 2 },
      { x: 7, y: 1, type: BrickType.PINATA, health: 2 },
      { x: 0, y: 2, type: BrickType.BALLOON, health: 1 },
      { x: 1, y: 2, type: BrickType.BALLOON, health: 1 },
      { x: 2, y: 2, type: BrickType.BALLOON, health: 1 },
      { x: 4, y: 2, type: BrickType.PRESENT, health: 1 },
      { x: 5, y: 2, type: BrickType.PRESENT, health: 1 },
      { x: 7, y: 2, type: BrickType.BALLOON, health: 1 },
      { x: 8, y: 2, type: BrickType.BALLOON, health: 1 },
      { x: 9, y: 2, type: BrickType.BALLOON, health: 1 },
      ...generateRow(3, BrickType.PRESENT, 1, 1, 8),
      ...generateRow(4, BrickType.PRESENT, 1, 0, 4),
      ...generateRow(4, BrickType.PRESENT, 1, 5, 9),
    ],
  },

  // Level 7: Disco Fever
  {
    id: 7,
    name: "Disco Fever",
    subtitle: "Lights, camera, action!",
    ballSpeedMultiplier: 1.25,
    powerUpDropChance: 0.3, // Higher drop rate for disco theme
    backgroundColor: 0x4a0080,
    bricks: [
      ...generateRow(0, BrickType.BALLOON, 2),
      ...generateRow(1, BrickType.PINATA, 2),
      ...generateRow(2, BrickType.PRESENT, 2),
      ...generateRow(3, BrickType.PINATA, 2),
      ...generateRow(4, BrickType.BALLOON, 2),
    ],
  },

  // Level 8: Sugar Rush
  {
    id: 8,
    name: "Sugar Rush",
    subtitle: "Too much cake!",
    ballSpeedMultiplier: 1.3,
    powerUpDropChance: 0.28,
    backgroundColor: 0xff6b6b,
    bricks: [
      // Dense pattern, all 1-hit for fast gameplay
      ...generateRow(0, BrickType.PRESENT, 1),
      ...generateRow(1, BrickType.BALLOON, 1),
      ...generateRow(2, BrickType.PINATA, 1),
      ...generateRow(3, BrickType.PRESENT, 1),
      ...generateRow(4, BrickType.BALLOON, 1),
      ...generateRow(5, BrickType.PINATA, 1),
    ],
  },

  // Level 9: Last Call
  {
    id: 9,
    name: "Last Call",
    subtitle: "The party's almost over!",
    ballSpeedMultiplier: 1.35,
    powerUpDropChance: 0.2,
    backgroundColor: 0x2d132c,
    bricks: [
      // High-health challenging pattern
      ...generateRow(0, BrickType.PINATA, 3),
      ...generateRow(1, BrickType.PINATA, 3),
      ...generateRow(2, BrickType.BALLOON, 3, 1, 8),
      ...generateRow(3, BrickType.PRESENT, 2),
      ...generateRow(4, BrickType.PRESENT, 2),
    ],
  },

  // Level 10: Grand Finale
  {
    id: 10,
    name: "Grand Finale",
    subtitle: "Give it everything you've got!",
    ballSpeedMultiplier: 1.4,
    powerUpDropChance: 0.18,
    backgroundColor: 0x000000,
    bricks: [
      // Maximum density, all types, high health
      ...generateRow(0, BrickType.PINATA, 3),
      ...generateRow(1, BrickType.BALLOON, 3),
      ...generateRow(2, BrickType.PRESENT, 3),
      ...generateRow(3, BrickType.PINATA, 2),
      ...generateRow(4, BrickType.BALLOON, 2),
      ...generateRow(5, BrickType.PRESENT, 2),
      ...generateRow(6, BrickType.PINATA, 1),
    ],
  },
];
