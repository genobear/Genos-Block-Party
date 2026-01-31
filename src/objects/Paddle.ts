import Phaser from 'phaser';
import { PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_Y_OFFSET, PADDLE_SPEED, GAME_WIDTH, PLAY_AREA_Y, PLAYABLE_HEIGHT } from '../config/Constants';

export class Paddle extends Phaser.Physics.Arcade.Sprite {
  private baseWidth: number = PADDLE_WIDTH;
  private currentWidth: number = PADDLE_WIDTH;
  private targetX: number;
  private isWobbly: boolean = false;
  private wobbleTime: number = 0;
  private wobbleIntensity: number = 50;
  private wobbleSpeed: number = 0.01;

  constructor(scene: Phaser.Scene) {
    const x = GAME_WIDTH / 2;
    const y = PLAY_AREA_Y + PLAYABLE_HEIGHT - PADDLE_Y_OFFSET;

    super(scene, x, y, 'paddle');

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.immovable = true;
    body.setAllowGravity(false);

    // Initialize target position
    this.targetX = x;
  }

  update(_time: number, delta: number): void {
    // Get pointer position
    const pointer = this.scene.input.activePointer;

    // Update target based on pointer
    if (pointer.isDown || pointer.wasTouch) {
      this.targetX = pointer.x;
    } else {
      // Also follow pointer when not pressed (for mouse)
      this.targetX = pointer.x;
    }

    // Apply wobbly effect if active
    let effectiveTargetX = this.targetX;
    if (this.isWobbly) {
      this.wobbleTime += delta * this.wobbleSpeed;
      const wobbleOffset = Math.sin(this.wobbleTime) * this.wobbleIntensity;
      effectiveTargetX += wobbleOffset;
    }

    // Smoothly move toward target
    this.x = Phaser.Math.Linear(this.x, effectiveTargetX, PADDLE_SPEED);

    // Clamp to screen bounds
    const halfWidth = this.currentWidth / 2;
    this.x = Phaser.Math.Clamp(this.x, halfWidth, GAME_WIDTH - halfWidth);

    // Update physics body position
    (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
  }

  /**
   * Calculate the bounce angle based on where the ball hits the paddle.
   * Returns angle in radians (negative = upward)
   */
  getCollisionAngle(ballX: number): number {
    const paddleCenter = this.x;
    const paddleHalfWidth = this.currentWidth / 2;

    // -1 to 1 based on hit position
    const hitPosition = (ballX - paddleCenter) / paddleHalfWidth;

    // Clamp hit position
    const clampedHit = Phaser.Math.Clamp(hitPosition, -1, 1);

    // Map to angle range: -150 to -30 degrees (upward arc)
    // Center = -90 (straight up), edges = steeper angles
    const minAngle = -150; // Left edge
    const maxAngle = -30;  // Right edge

    const angleDeg = Phaser.Math.Linear(minAngle, maxAngle, (clampedHit + 1) / 2);

    return Phaser.Math.DegToRad(angleDeg);
  }

  /**
   * Apply wide paddle power-up (Cake)
   */
  setWide(duration: number): void {
    this.currentWidth = this.baseWidth * 1.5;
    this.setScale(1.5, 1);

    // Update physics body
    (this.body as Phaser.Physics.Arcade.Body).setSize(this.currentWidth, PADDLE_HEIGHT);

    // Reset after duration
    this.scene.time.delayedCall(duration, () => {
      this.resetWidth();
    });
  }

  /**
   * Apply wobbly paddle effect (Drinks debuff)
   */
  setWobbly(duration: number): void {
    this.isWobbly = true;
    this.wobbleTime = 0;

    // Reset after duration
    this.scene.time.delayedCall(duration, () => {
      this.isWobbly = false;
    });
  }

  /**
   * Reset paddle width to normal
   */
  resetWidth(): void {
    this.currentWidth = this.baseWidth;
    this.setScale(1, 1);
    (this.body as Phaser.Physics.Arcade.Body).setSize(this.baseWidth, PADDLE_HEIGHT);
  }

  /**
   * Reset all effects
   */
  resetEffects(): void {
    this.resetWidth();
    this.isWobbly = false;
  }

  /**
   * Get the current paddle width
   */
  getCurrentWidth(): number {
    return this.currentWidth;
  }
}
