import Phaser from 'phaser';
import { BUMPER, COLORS } from '../config/Constants';

/**
 * Pinball Bumper - Static circular obstacle that bounces the ball with extra velocity
 * Cannot be destroyed, purely for deflection
 */
export class Bumper extends Phaser.Physics.Arcade.Sprite {
  private boostMultiplier: number = BUMPER.BOOST_MULTIPLIER;
  private flashDuration: number = BUMPER.FLASH_DURATION;
  private isFlashing: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bumper');

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // true = static body

    // Scale HD sprite to game dimensions
    this.setDisplaySize(BUMPER.SIZE, BUMPER.SIZE);

    // Configure circular physics body
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    const radius = BUMPER.SIZE / 2;
    body.setCircle(radius);
    // Offset to center the circular body on the sprite
    body.setOffset(
      (this.width - BUMPER.SIZE) / 2,
      (this.height - BUMPER.SIZE) / 2
    );

    // Set depth to appear below balls but above background
    this.setDepth(5);
  }

  /**
   * Apply velocity boost to a ball and trigger flash animation
   * @param ball The ball that hit this bumper
   * @param maxSpeed Maximum allowed ball speed (cap)
   */
  applyBoost(ball: Phaser.Physics.Arcade.Sprite, maxSpeed: number): void {
    const body = ball.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    // Clone and scale velocity
    const boosted = body.velocity.clone().scale(this.boostMultiplier);

    // Cap at max speed to prevent crazy speeds
    boosted.limit(maxSpeed);

    // Apply boosted velocity
    body.setVelocity(boosted.x, boosted.y);

    // Trigger flash animation
    this.flash();
  }

  /**
   * Flash animation on impact - brief white glow overlay
   */
  flash(): void {
    if (this.isFlashing) return;

    this.isFlashing = true;

    // Store original tint
    const originalTint = this.tintTopLeft;

    // Flash to white
    this.setTint(COLORS.BUMPER_FLASH);

    // Scale punch for impact feel (relative to display scale, not texture scale)
    const baseScaleX = this.scaleX;
    const baseScaleY = this.scaleY;
    this.scene.tweens.add({
      targets: this,
      scaleX: baseScaleX * 1.15,
      scaleY: baseScaleY * 1.15,
      duration: this.flashDuration / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Return to normal color after flash duration
    this.scene.time.delayedCall(this.flashDuration, () => {
      this.setTint(originalTint || COLORS.BUMPER);
      this.isFlashing = false;
    });
  }

  /**
   * Get the boost multiplier value
   */
  getBoostMultiplier(): number {
    return this.boostMultiplier;
  }
}
