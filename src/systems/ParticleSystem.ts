import Phaser from 'phaser';
import { COLORS } from '../config/Constants';

/**
 * Manages scene-level particle effects:
 * - Confetti burst on brick destruction
 * - Streamers on level clear
 *
 * Ball-level effects (danger sparks, fireball trails, etc.) are handled
 * by the BallEffectManager / BaseBallEffect handler system.
 */
export class ParticleSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Burst confetti when a brick is destroyed
   */
  burstConfetti(x: number, y: number, brickColor: number): void {
    // Create emitter for confetti
    const particles = this.scene.add.particles(x, y, 'particle-confetti', {
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 600,
      quantity: 12,
      tint: [brickColor, 0xffffff, 0xffd700, 0xff69b4],
      rotate: { min: 0, max: 360 },
      emitting: false,
    });

    particles.explode();

    // Auto-destroy after particles fade
    this.scene.time.delayedCall(700, () => {
      particles.destroy();
    });
  }

  /**
   * Rain streamers across the screen on level clear
   */
  celebrateStreamers(): void {
    const width = this.scene.cameras.main.width;
    const colors = [
      COLORS.PRESENT,
      COLORS.PINATA,
      COLORS.BALLOON,
      0xffd700,
      0xffffff,
    ];

    // Create multiple streamer emitters across the screen
    for (let i = 0; i < 5; i++) {
      const x = (width / 6) * (i + 1);

      const particles = this.scene.add.particles(x, -20, 'particle-streamer', {
        speedY: { min: 150, max: 300 },
        speedX: { min: -30, max: 30 },
        angle: { min: 80, max: 100 },
        scale: { start: 1, end: 0.5 },
        alpha: { start: 1, end: 0 },
        lifespan: 2000,
        frequency: 100,
        quantity: 2,
        tint: colors,
        rotate: { min: -180, max: 180 },
        maxParticles: 30,
      });

      // Stop emitting and cleanup
      this.scene.time.delayedCall(1500, () => {
        particles.stop();
      });

      this.scene.time.delayedCall(3500, () => {
        particles.destroy();
      });
    }
  }

}
