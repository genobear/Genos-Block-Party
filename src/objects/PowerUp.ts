import Phaser from 'phaser';
import { PowerUpType } from '../types/PowerUpTypes';
import { POWERUP_FALL_SPEED, POWERUP_DISPLAY_SIZE, GAME_HEIGHT } from '../config/Constants';

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  private powerUpType: PowerUpType;
  private collected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    const textureKey = `powerup-${type}`;
    super(scene, x, y, textureKey);

    this.powerUpType = type;

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Scale down HD texture (192×192) to game size
    this.setDisplaySize(POWERUP_DISPLAY_SIZE, POWERUP_DISPLAY_SIZE);

    // Configure physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(POWERUP_DISPLAY_SIZE, POWERUP_DISPLAY_SIZE);
    body.setOffset((this.width - POWERUP_DISPLAY_SIZE) / 2, (this.height - POWERUP_DISPLAY_SIZE) / 2);
    body.setAllowGravity(false);
    body.setVelocityY(POWERUP_FALL_SPEED);

    // Add slight wobble animation (rotation, not position - avoids physics interference)
    scene.tweens.add({
      targets: this,
      angle: 10,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Add pulsing glow effect
    scene.tweens.add({
      targets: this,
      scale: 1.2,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Get the power-up type
   */
  getType(): PowerUpType {
    return this.powerUpType;
  }

  /**
   * Check if power-up has been collected (prevents double-collection)
   */
  isCollected(): boolean {
    return this.collected;
  }

  /**
   * Mark power-up as collected (call immediately on collection)
   */
  markCollected(): void {
    this.collected = true;
  }

  /**
   * Check if power-up has fallen off screen
   */
  isOffScreen(): boolean {
    return this.y > GAME_HEIGHT + 50;
  }

  /**
   * Deactivate and return to pool
   */
  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.tweens.killTweensOf(this);
  }

  /**
   * Activate from pool at position
   */
  activate(x: number, y: number, type: PowerUpType): void {
    this.powerUpType = type;
    this.collected = false;  // Reset collected flag
    this.setTexture(`powerup-${type}`);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setScale(1);
    this.setAlpha(1);  // Reset alpha (was set to 0 during collect animation)

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;  // Explicitly enable before reset
    body.reset(x, y);
    this.setDisplaySize(POWERUP_DISPLAY_SIZE, POWERUP_DISPLAY_SIZE);
    body.setSize(POWERUP_DISPLAY_SIZE, POWERUP_DISPLAY_SIZE);
    body.setOffset((this.width - POWERUP_DISPLAY_SIZE) / 2, (this.height - POWERUP_DISPLAY_SIZE) / 2);
    body.setAllowGravity(false);
    body.setVelocityY(POWERUP_FALL_SPEED);

    // Restart animations (rotation wobble - doesn't interfere with physics)
    this.setAngle(0);  // Reset angle before starting tween
    this.scene.tweens.add({
      targets: this,
      angle: 10,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.scene.tweens.add({
      targets: this,
      scale: 1.2,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Play collection effect
   */
  playCollectAnimation(onComplete?: () => void): void {
    this.scene.tweens.killTweensOf(this);

    this.scene.tweens.add({
      targets: this,
      scale: 2,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.deactivate();
        if (onComplete) onComplete();
      },
    });
  }
}
