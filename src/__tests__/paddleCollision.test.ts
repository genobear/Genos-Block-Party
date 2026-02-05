import { describe, it, expect } from 'vitest';
import { calculatePaddleBounceAngle } from '../utils/paddleAngle';

describe('Paddle Collision Angle Calculation', () => {
  const paddleX = 400;
  const paddleHalfWidth = 60;

  const degToRad = (deg: number) => deg * (Math.PI / 180);

  it('returns -90° (straight up) for center hit', () => {
    const angle = calculatePaddleBounceAngle(paddleX, paddleX, paddleHalfWidth);
    expect(angle).toBeCloseTo(degToRad(-90), 4);
  });

  it('returns -150° for exact left edge hit', () => {
    const ballX = paddleX - paddleHalfWidth;
    const angle = calculatePaddleBounceAngle(ballX, paddleX, paddleHalfWidth);
    expect(angle).toBeCloseTo(degToRad(-150), 4);
  });

  it('returns -30° for exact right edge hit', () => {
    const ballX = paddleX + paddleHalfWidth;
    const angle = calculatePaddleBounceAngle(ballX, paddleX, paddleHalfWidth);
    expect(angle).toBeCloseTo(degToRad(-30), 4);
  });

  it('clamps to -150° when hit is beyond left edge', () => {
    const ballX = paddleX - paddleHalfWidth - 50;
    const angle = calculatePaddleBounceAngle(ballX, paddleX, paddleHalfWidth);
    expect(angle).toBeCloseTo(degToRad(-150), 4);
  });

  it('clamps to -30° when hit is beyond right edge', () => {
    const ballX = paddleX + paddleHalfWidth + 50;
    const angle = calculatePaddleBounceAngle(ballX, paddleX, paddleHalfWidth);
    expect(angle).toBeCloseTo(degToRad(-30), 4);
  });

  it('returns -120° for quarter-left position', () => {
    const ballX = paddleX - paddleHalfWidth / 2;
    const angle = calculatePaddleBounceAngle(ballX, paddleX, paddleHalfWidth);
    expect(angle).toBeCloseTo(degToRad(-120), 4);
  });

  it('returns -60° for quarter-right position', () => {
    const ballX = paddleX + paddleHalfWidth / 2;
    const angle = calculatePaddleBounceAngle(ballX, paddleX, paddleHalfWidth);
    expect(angle).toBeCloseTo(degToRad(-60), 4);
  });
});
