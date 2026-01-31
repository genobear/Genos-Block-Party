import Phaser from 'phaser';
import { PowerUp } from '../objects/PowerUp';
import { PowerUpType } from '../types/PowerUpTypes';

const POOL_SIZE = 10;

export class PowerUpPool {
  private scene: Phaser.Scene;
  private pool: PowerUp[] = [];
  private group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create physics group for collisions
    this.group = scene.physics.add.group({
      classType: PowerUp,
      runChildUpdate: true,
    });

    // Pre-populate pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const powerUp = new PowerUp(scene, -100, -100, PowerUpType.BALLOON);
      powerUp.deactivate();
      this.pool.push(powerUp);
      this.group.add(powerUp);
    }
  }

  /**
   * Get a power-up from the pool
   */
  spawn(x: number, y: number, type: PowerUpType): PowerUp | null {
    // Find inactive power-up
    let powerUp = this.pool.find((p) => !p.active);

    if (!powerUp) {
      // Pool exhausted, create new one
      powerUp = new PowerUp(this.scene, x, y, type);
      powerUp.deactivate();
      this.pool.push(powerUp);
      this.group.add(powerUp);
    }

    powerUp.activate(x, y, type);
    return powerUp;
  }

  /**
   * Get the physics group for collision detection
   */
  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  /**
   * Update all active power-ups, deactivate off-screen ones
   */
  update(): void {
    this.pool.forEach((powerUp) => {
      if (powerUp.active && powerUp.isOffScreen()) {
        powerUp.deactivate();
      }
    });
  }

  /**
   * Deactivate all power-ups
   */
  clear(): void {
    this.pool.forEach((powerUp) => {
      if (powerUp.active) {
        powerUp.deactivate();
      }
    });
  }

  /**
   * Get count of active power-ups
   */
  getActiveCount(): number {
    return this.pool.filter((p) => p.active).length;
  }
}
