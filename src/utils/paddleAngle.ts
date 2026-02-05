/**
 * Calculate the bounce angle for a ball hitting a paddle.
 * @param ballX - X position where the ball hits
 * @param paddleX - X position of paddle center
 * @param paddleHalfWidth - Half the paddle width
 * @returns Angle in radians (negative = upward)
 */
export function calculatePaddleBounceAngle(
  ballX: number,
  paddleX: number,
  paddleHalfWidth: number
): number {
  const hitPosition = (ballX - paddleX) / paddleHalfWidth;
  
  // Clamp hit position to [-1, 1]
  const clampedHit = Math.max(-1, Math.min(1, hitPosition));
  
  const minAngle = -150; // degrees
  const maxAngle = -30;  // degrees
  
  // Linear interpolation: minAngle + (maxAngle - minAngle) * t
  const t = (clampedHit + 1) / 2;
  const angleDeg = minAngle + (maxAngle - minAngle) * t;
  
  // Convert degrees to radians
  return angleDeg * (Math.PI / 180);
}
