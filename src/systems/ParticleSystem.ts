import Phaser from 'phaser';
import { COLORS } from '../config/Constants';

/**
 * Manages all particle effects in the game:
 * - Confetti burst on brick destruction
 * - Streamers on level clear
 * - Danger sparks on last life
 * - Fireball trails
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

  /**
   * Danger warning particles when on last ball
   */
  dangerSparks(ball: Phaser.GameObjects.Sprite): Phaser.GameObjects.Particles.ParticleEmitter | null {
    if (!ball || !ball.active) return null;

    const particles = this.scene.add.particles(0, 0, 'particle-spark', {
      follow: ball,
      speed: { min: 20, max: 50 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 300,
      frequency: 50,
      quantity: 1,
      tint: [0xff6b6b, 0xff0000, 0xffaa00],
      blendMode: Phaser.BlendModes.ADD,
    });

    return particles;
  }

  /**
   * Stop danger sparks
   */
  stopDangerSparks(emitter: Phaser.GameObjects.Particles.ParticleEmitter | null): void {
    if (emitter) {
      emitter.stop();
      this.scene.time.delayedCall(400, () => {
        emitter.destroy();
      });
    }
  }

  /**
   * Start fireball trail effect - returns emitter for cleanup
   * Visual intensity caps at level 3
   */
  startFireballTrail(ball: Phaser.GameObjects.Sprite, level: number): Phaser.GameObjects.Particles.ParticleEmitter {
    const effectiveLevel = Math.min(level, 3) as 1 | 2 | 3;

    const configs: Record<1 | 2 | 3, {
      colors: number[];
      quantity: number;
      frequency: number;
      lifespan: number;
      scale: { start: number; end: number };
    }> = {
      1: {
        colors: [0xff4500, 0xff6600],
        quantity: 1,
        frequency: 40,
        lifespan: 200,
        scale: { start: 0.6, end: 0 },
      },
      2: {
        colors: [0xff4500, 0xff8800, 0xffcc00, 0xffffff],
        quantity: 2,
        frequency: 30,
        lifespan: 350,
        scale: { start: 0.9, end: 0 },
      },
      3: {
        colors: [0xffffff, 0xffff00, 0xff8800, 0xff4500, 0xff2200],
        quantity: 3,
        frequency: 20,
        lifespan: 500,
        scale: { start: 1.2, end: 0 },
      },
    };

    const config = configs[effectiveLevel];

    const emitter = this.scene.add.particles(0, 0, 'particle-flame', {
      follow: ball,
      speed: { min: 10, max: 30 },
      scale: config.scale,
      alpha: { start: 0.9, end: 0 },
      lifespan: config.lifespan,
      frequency: config.frequency,
      quantity: config.quantity,
      tint: config.colors,
      blendMode: Phaser.BlendModes.ADD,
      angle: { min: 0, max: 360 },
    });

    return emitter;
  }

  /**
   * Update fireball trail intensity (when level changes)
   */
  updateFireballTrail(emitter: Phaser.GameObjects.Particles.ParticleEmitter, level: number): void {
    const effectiveLevel = Math.min(level, 3) as 1 | 2 | 3;

    const configs: Record<1 | 2 | 3, { frequency: number; lifespan: number; quantity: number }> = {
      1: { frequency: 40, lifespan: 200, quantity: 1 },
      2: { frequency: 30, lifespan: 350, quantity: 2 },
      3: { frequency: 20, lifespan: 500, quantity: 3 },
    };

    const config = configs[effectiveLevel];
    emitter.frequency = config.frequency;
    // Update emitter properties directly
    (emitter as unknown as { lifespan: { propertyValue: number } }).lifespan.propertyValue = config.lifespan;
    (emitter as unknown as { quantity: { propertyValue: number } }).quantity.propertyValue = config.quantity;
  }

  /**
   * Stop fireball trail with fadeout
   */
  stopFireballTrail(emitter: Phaser.GameObjects.Particles.ParticleEmitter | null): void {
    if (emitter) {
      emitter.stop();
      this.scene.time.delayedCall(600, () => {
        emitter.destroy();
      });
    }
  }

  /**
   * Start smoke trail (level 3 only) - darker particles behind the flames
   */
  startSmokeTrail(ball: Phaser.GameObjects.Sprite): Phaser.GameObjects.Particles.ParticleEmitter {
    return this.scene.add.particles(0, 0, 'particle-spark', {
      follow: ball,
      followOffset: { x: 0, y: 2 },
      speed: { min: 5, max: 15 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.4, end: 0 },
      lifespan: 400,
      frequency: 50,
      quantity: 1,
      tint: [0x442200, 0x331100, 0x220000],
      blendMode: Phaser.BlendModes.NORMAL,
    });
  }
}
