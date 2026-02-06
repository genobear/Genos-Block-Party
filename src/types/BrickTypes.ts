export enum BrickType {
  PRESENT = 'present',
  PINATA = 'pinata',
  BALLOON = 'balloon',
  DRIFTER = 'drifter',
}

/**
 * Per-brick-type power-up drop chances
 */
export const BRICK_DROP_CHANCES: Record<BrickType, number> = {
  [BrickType.PRESENT]: 0.15,   // 15% - lowest (common bricks)
  [BrickType.PINATA]: 0.25,    // 25% - medium
  [BrickType.BALLOON]: 0.30,   // 30% - highest
  [BrickType.DRIFTER]: 0.20,   // 20% - between Present and Piñata
};

export interface BrickConfig {
  x: number;           // Grid x position (0-9)
  y: number;           // Grid y position
  type: BrickType;
  health: number;      // 1-3
}

export interface BrickData {
  type: BrickType;
  health: number;
  maxHealth: number;
  scoreValue: number;
}
