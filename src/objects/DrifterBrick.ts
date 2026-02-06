import Phaser from 'phaser';
import { Brick } from './Brick';
import { BrickType } from '../types/BrickTypes';
import { DRIFTER } from '../config/Constants';

/**
 * DrifterBrick - A special brick that drifts upward and escapes if not destroyed in time.
 * Extends Brick and adds floating/bobbing behavior with escape mechanic.
 */
export class DrifterBrick extends Brick {
  // Starting position for bob calculation
  private startX: number;

  // Drift settings (from constants, but can be overridden)
  private driftSpeed: number = DRIFTER.DRIFT_SPEED;
  private bobAmplitude: number = DRIFTER.BOB_AMPLITUDE;
  private bobFrequency: number = DRIFTER.BOB_FREQUENCY;
  private escapeThreshold: number = DRIFTER.ESCAPE_THRESHOLD;

  // Track if we're escaping (prevent double escape)
  private isEscaping: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    health: number
  ) {
    super(scene, x, y, BrickType.DRIFTER, health);

    // Store starting X for bob calculation
    this.startX = x;

    // Set initial ethereal appearance
    this.setAlpha(0.75);
  }

  /**
   * Called every frame before physics update
   * Handles drifting, bobbing, alpha pulse, and escape check
   */
  preUpdate(time: number, delta: number): void {
    // Call parent preUpdate if it exists
    super.preUpdate(time, delta);

    // Don't update if we're escaping or inactive
    if (this.isEscaping || !this.active) return;

    // Drift upward
    this.y -= this.driftSpeed * (delta / 1000);

    // Bob side to side
    this.x = this.startX + Math.sin(time * this.bobFrequency / 1000 * Math.PI * 2) * this.bobAmplitude;

    // Update static body position to match sprite
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    if (body) {
      body.updateFromGameObject();
    }

    // Pulse alpha for ethereal effect
    this.setAlpha(0.75 + Math.sin(time / 200) * 0.1);

    // Check if brick should escape
    if (this.y < this.escapeThreshold) {
      this.escape();
    }
  }

  /**
   * Handle brick escaping - fades out and destroys without awarding points
   */
  private escape(): void {
    if (this.isEscaping) return;
    this.isEscaping = true;

    // Emit escape event so GameScene can track it
    this.scene.events.emit('drifterEscaped', this);

    // Disable physics body so ball passes through
    this.disableBody(true);

    // Fade out and drift up animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y - 30,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.destroy();
      },
    });
  }

  /**
   * Override destroy to clean up properly
   */
  destroy(fromScene?: boolean): void {
    this.isEscaping = true; // Prevent any further updates
    super.destroy(fromScene);
  }
}
