import Phaser from 'phaser';
import { Ball } from '../objects/Ball';
import type { ParticleSystem } from '../systems/ParticleSystem';

const POOL_SIZE = 5;

export class BallPool {
  private scene: Phaser.Scene;
  private pool: Ball[] = [];
  private group: Phaser.Physics.Arcade.Group;
  private primaryBall: Ball | null = null;
  private particleSystem: ParticleSystem | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create physics group for collisions
    this.group = scene.physics.add.group({
      classType: Ball,
      runChildUpdate: true,
    });

    // Pre-populate pool (excluding primary ball)
    for (let i = 0; i < POOL_SIZE; i++) {
      const ball = new Ball(scene, -100, -100);
      ball.deactivate();
      this.pool.push(ball);
      this.group.add(ball);
    }
  }

  /**
   * Set the primary ball (the main ball that triggers game over)
   */
  setPrimaryBall(ball: Ball): void {
    this.primaryBall = ball;
    this.group.add(ball);

    // IMPORTANT: group.add() resets physics properties, so we must restore them
    const body = ball.body as Phaser.Physics.Arcade.Body;
    body.setBounce(1, 1);
    body.setCollideWorldBounds(true);
    body.onWorldBounds = true;
  }

  /**
   * Set particle system reference for fireball visual effects
   */
  setParticleSystem(system: ParticleSystem): void {
    this.particleSystem = system;

    // Set on all pooled balls
    this.pool.forEach((ball) => ball.setParticleSystem(system));
  }

  /**
   * Spawn extra balls for Disco power-up
   */
  spawnExtraBalls(count: number, fromBall: Ball, speedMultiplier: number): Ball[] {
    const spawned: Ball[] = [];

    for (let i = 0; i < count; i++) {
      let ball = this.pool.find((b) => !b.active && b !== this.primaryBall);

      if (!ball) {
        // Pool exhausted, create new one
        ball = new Ball(this.scene, -100, -100);
        ball.deactivate();
        this.pool.push(ball);
        this.group.add(ball);
      }

      // Set particle system for visual effects
      if (this.particleSystem) {
        ball.setParticleSystem(this.particleSystem);
      }

      // Activate at same position as source ball
      ball.activate(fromBall.x, fromBall.y);

      // Launch at different angles
      const angleOffset = (i + 1) * 30; // 30, 60 degrees offset
      const baseAngle = Phaser.Math.DegToRad(-90);
      const angle = baseAngle + Phaser.Math.DegToRad(angleOffset * (i % 2 === 0 ? 1 : -1));

      const speed = 400 * speedMultiplier;
      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;

      (ball.body as Phaser.Physics.Arcade.Body).setVelocity(velocityX, velocityY);

      spawned.push(ball);
    }

    return spawned;
  }

  /**
   * Get the physics group for collision detection
   */
  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  /**
   * Get all active balls
   */
  getActiveBalls(): Ball[] {
    const active: Ball[] = [];

    if (this.primaryBall?.active) {
      active.push(this.primaryBall);
    }

    this.pool.forEach((ball) => {
      if (ball.active) {
        active.push(ball);
      }
    });

    return active;
  }

  /**
   * Get count of active balls
   */
  getActiveCount(): number {
    return this.getActiveBalls().length;
  }

  /**
   * Update - check for balls that fell out of bounds
   */
  update(): void {
    this.pool.forEach((ball) => {
      if (ball.active && ball !== this.primaryBall && ball.isOutOfBounds()) {
        ball.deactivate();
        this.scene.events.emit('extraBallLost');
      }
    });
  }

  /**
   * Deactivate all extra balls (keep primary)
   */
  clearExtras(): void {
    this.pool.forEach((ball) => {
      if (ball.active && ball !== this.primaryBall) {
        ball.deactivate();
      }
    });
  }

  /**
   * Check if only primary ball remains
   */
  hasOnlyPrimaryBall(): boolean {
    const activeBalls = this.getActiveBalls();
    return activeBalls.length === 1 && activeBalls[0] === this.primaryBall;
  }

  /**
   * Check if primary ball is lost (for game over check)
   */
  isPrimaryBallLost(): boolean {
    return this.primaryBall !== null && !this.primaryBall.active;
  }
}
