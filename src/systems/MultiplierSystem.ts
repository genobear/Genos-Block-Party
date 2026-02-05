import { MULTIPLIER } from '../config/Constants';

/**
 * Manages the score multiplier system with increment, decay, and cap mechanics.
 * Extracted from GameScene for testability.
 *
 * Mechanics:
 * - Starts at BASE (1.0)
 * - Increments on brick hit with diminishing returns
 * - Decays over time after a grace period (scales with current multiplier)
 * - Capped at MAX_MULTIPLIER (5.0)
 */
export class MultiplierSystem {
  private multiplier: number = MULTIPLIER.BASE;
  private lastHitTime: number = 0;

  /**
   * Get the current multiplier value
   */
  getValue(): number {
    return this.multiplier;
  }

  /**
   * Increment the multiplier on brick hit.
   * Uses diminishing returns: harder to grow at higher multipliers.
   * At 1.0x: +0.15, at 3.0x: +0.075, at 5.0x: +0.0375
   *
   * @param currentTime - Current game time in milliseconds
   */
  increment(currentTime: number): void {
    this.lastHitTime = currentTime;

    const growthFactor = MULTIPLIER.BASE / this.multiplier;
    const increment = 0.15 * growthFactor;

    this.multiplier = Math.min(
      MULTIPLIER.MAX_MULTIPLIER,
      this.multiplier + increment
    );
  }

  /**
   * Update multiplier decay based on time since last hit.
   * Decay rate scales with multiplier level - slower when low, faster when high.
   * At 1.1x: ~2.5% decay rate, at 3.0x: ~50%, at 5.0x: 100%
   *
   * @param currentTime - Current game time in milliseconds
   * @param deltaMs - Time since last update in milliseconds
   */
  update(currentTime: number, deltaMs: number): void {
    // Don't decay at or below base
    if (this.multiplier <= MULTIPLIER.BASE) return;

    const timeSinceHit = currentTime - this.lastHitTime;

    // Only decay after grace period
    if (timeSinceHit > MULTIPLIER.DECAY_DELAY_MS) {
      // Scale decay rate based on how far above base we are
      const multiplierAboveBase = this.multiplier - MULTIPLIER.BASE;
      const maxAboveBase = MULTIPLIER.MAX_MULTIPLIER - MULTIPLIER.BASE;
      const decayScale = multiplierAboveBase / maxAboveBase;
      const effectiveDecayRate = MULTIPLIER.DECAY_RATE * decayScale;

      const decay = effectiveDecayRate * (deltaMs / 1000);
      this.multiplier = Math.max(MULTIPLIER.BASE, this.multiplier - decay);
    }
  }

  /**
   * Reset the multiplier to base value.
   * Called on life loss or level transition.
   */
  reset(): void {
    this.multiplier = MULTIPLIER.BASE;
    this.lastHitTime = 0;
  }

  /**
   * Apply multiplier to a score value.
   * Returns floored result to avoid fractional points.
   *
   * @param points - Base points to multiply
   * @returns Multiplied and floored points
   */
  applyToScore(points: number): number {
    return Math.floor(points * this.multiplier);
  }
}
