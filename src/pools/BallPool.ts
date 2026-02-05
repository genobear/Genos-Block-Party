import Phaser from 'phaser';
import { Ball } from '../objects/Ball';
import { Paddle } from '../objects/Paddle';
import { BallSpeedManager } from '../systems/BallSpeedManager';

const POOL_SIZE = 6; // Increased to account for initial ball being in pool

export class BallPool {
  private scene: Phaser.Scene;
  private pool: Ball[] = [];
  private group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create physics group for collisions
    this.group = scene.physics.add.group({
      classType: Ball,
      runChildUpdate: true,
    });

    // Pre-populate pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const ball = new Ball(scene, -100, -100);
      ball.initEffectManager(scene);
      ball.deactivate();
      this.pool.push(ball);
      this.group.add(ball);
    }
  }

  /**
   * Spawn balls at a position, optionally attached to paddle
   * Speed is calculated by BallSpeedManager (includes all multipliers)
   */
  spawnBalls(
    count: number,
    x: number,
    y: number,
    attachToPaddle?: Paddle
  ): Ball[] {
    const spawned: Ball[] = [];
    const speedManager = BallSpeedManager.getInstance();

    for (let i = 0; i < count; i++) {
      let ball = this.pool.find((b) => !b.active);

      if (!ball) {
        // Pool exhausted, create new one
        ball = new Ball(this.scene, -100, -100);
        ball.initEffectManager(this.scene);
        ball.deactivate();
        this.pool.push(ball);
        this.group.add(ball);
      }

      // Activate at position
      ball.activate(x, y);

      if (attachToPaddle) {
        // Attach to paddle (waiting for launch)
        ball.attachToPaddle(attachToPaddle);
      } else {
        // Launch immediately at different angles
        const angleOffset = (i + 1) * 30; // 30, 60 degrees offset
        const baseAngle = Phaser.Math.DegToRad(-90);
        const angle =
          baseAngle +
          Phaser.Math.DegToRad(angleOffset * (i % 2 === 0 ? 1 : -1));

        // Get speed from manager (includes all multipliers)
        const speed = speedManager.getEffectiveSpeed();
        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed;

        const body = ball.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(velocityX, velocityY);

        // Mark as launched since we're giving it velocity
        ball.markAsLaunched();
      }

      spawned.push(ball);
    }

    return spawned;
  }

  /**
   * Convenience method to spawn a single ball attached to paddle
   */
  spawnAttachedToPaddle(paddle: Paddle, x: number, y: number): Ball {
    return this.spawnBalls(1, x, y, paddle)[0];
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
    return this.pool.filter((ball) => ball.active);
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
      if (ball.active && ball.isOutOfBounds()) {
        ball.deactivate();
        this.scene.events.emit('ballLost', ball);
      }
    });
  }

  /**
   * Deactivate all balls
   */
  clearAll(): void {
    this.pool.forEach((ball) => {
      if (ball.active) {
        ball.deactivate();
      }
    });
  }
}
