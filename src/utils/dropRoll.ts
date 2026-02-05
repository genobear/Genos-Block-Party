/**
 * Pure utility functions for drop roll probability calculations.
 * These are testable functions with no Phaser/class dependencies.
 */

export interface DropChanceParams {
  baseChance: number;
  powerBallActive?: boolean;
  isAOE?: boolean;
  debugOverride?: number | null;
}

/**
 * Calculate effective drop chance based on modifiers.
 * @param params Configuration for drop chance calculation
 * @returns The final drop chance (0-1)
 */
export function calculateDropChance(params: DropChanceParams): number {
  // Debug override takes absolute precedence
  if (params.debugOverride != null) {
    return params.debugOverride;
  }

  let chance = params.baseChance;

  // Apply Power Ball multiplier if active (double, cap at 100%)
  if (params.powerBallActive) {
    chance = Math.min(chance * 2, 1);
  }

  // Apply AOE penalty (50% reduction for Electric Ball chain damage)
  if (params.isAOE) {
    chance *= 0.5;
  }

  return chance;
}

/**
 * Roll a single drop with injectable RNG for testing.
 * @param chance Drop probability (0-1)
 * @param rng Random number generator (returns 0-1), defaults to Math.random
 * @returns true if drop should occur
 */
export function rollDrop(chance: number, rng: () => number = Math.random): boolean {
  return rng() < chance;
}

/**
 * Roll multiple drops for multi-hit damage.
 * Each damage point rolls independently.
 * @param chance Drop probability per roll (0-1)
 * @param damageAmount Number of damage points (each rolls independently)
 * @param rng Random number generator (returns 0-1), defaults to Math.random
 * @returns Number of power-ups that should drop (0 to damageAmount)
 */
export function rollDropsForDamage(
  chance: number,
  damageAmount: number,
  rng: () => number = Math.random
): number {
  let drops = 0;
  for (let i = 0; i < damageAmount; i++) {
    if (rng() < chance) {
      drops++;
    }
  }
  return drops;
}
