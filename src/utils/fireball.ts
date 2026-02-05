/**
 * Pure utility functions for Fireball power-up state management.
 * Extracted for testability — these functions have no Phaser dependencies.
 */

export interface FireballState {
  level: number;
}

/**
 * Increment fireball level by 1.
 * Called when a fireball power-up is collected.
 */
export function incrementLevel(state: FireballState): FireballState {
  return { level: state.level + 1 };
}

/**
 * Check if fireball is active (level > 0).
 */
export function isActive(state: FireballState): boolean {
  return state.level > 0;
}

/**
 * Get damage dealt per hit. Equals current level.
 */
export function getDamage(state: FireballState): number {
  return state.level;
}

/**
 * Get visual tier for particle effects.
 * - Level 0: tier 0 (no effect)
 * - Levels 1-2: tier 1 (basic flame)
 * - Levels 3-4: tier 2 (intense flame)
 * - Level 5+: tier 3 (maximum intensity with smoke)
 */
export function getVisualTier(state: FireballState): number {
  if (state.level <= 0) return 0;
  if (state.level <= 2) return 1;
  if (state.level <= 4) return 2;
  return 3;
}

/**
 * Check if fireball can pierce through a brick.
 * Piercing occurs when fireball level >= brick HP.
 */
export function canPierce(state: FireballState, brickHP: number): boolean {
  return state.level >= brickHP;
}

/**
 * Reset fireball state to initial (inactive) state.
 */
export function reset(): FireballState {
  return { level: 0 };
}
