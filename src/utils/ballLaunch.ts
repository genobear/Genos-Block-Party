/**
 * Calculate launch velocity for a ball.
 * @param speed - The speed magnitude
 * @param minAngleDeg - Minimum angle in degrees (default -120)
 * @param maxAngleDeg - Maximum angle in degrees (default -60)
 * @returns Object with velocityX, velocityY, and the chosen angle in degrees
 */
export function calculateLaunchVelocity(
  speed: number,
  minAngleDeg: number = -120,
  maxAngleDeg: number = -60
): { velocityX: number; velocityY: number; angleDeg: number } {
  // Random angle within range
  const angleDeg = Math.random() * (maxAngleDeg - minAngleDeg) + minAngleDeg;
  const angleRad = (angleDeg * Math.PI) / 180;

  return {
    velocityX: Math.cos(angleRad) * speed,
    velocityY: Math.sin(angleRad) * speed,
    angleDeg,
  };
}
