import Phaser from 'phaser';
import {
  PLAY_AREA_Y,
  PLAYABLE_WIDTH,
  PLAYABLE_HEIGHT,
  PADDLE_Y_OFFSET,
} from '../config/Constants';

/**
 * Safety net Y position: below paddle, above death zone.
 *
 * Paddle center:  PLAY_AREA_Y + PLAYABLE_HEIGHT - PADDLE_Y_OFFSET  = 1000
 * Death zone:     PLAY_AREA_Y + PLAYABLE_HEIGHT + BALL_RADIUS      = 1060
 * Safety net:     midway between paddle and bottom of playable area = 1025
 */
const SAFETY_NET_Y = PLAY_AREA_Y + PLAYABLE_HEIGHT - (PADDLE_Y_OFFSET / 2);

/**
 * SafetyNet — A temporary floor that saves the ball once, then disappears.
 * Spawns when the Bounce House power-up is collected.
 * One-use: destroyed on first ball contact.
 */
export class SafetyNet extends Phaser.Physics.Arcade.Sprite {
  private glowTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, PLAYABLE_WIDTH / 2, SAFETY_NET_Y, 'safety-net');

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    // Semi-transparent glowing green bar
    this.setAlpha(0.7);
    this.setDepth(5);

    // Pulsing glow animation
    this.glowTween = scene.tweens.add({
      targets: this,
      alpha: { from: 0.5, to: 0.9 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Spawn animation: scale in vertically
    this.setScale(1, 0);
    scene.tweens.add({
      targets: this,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Play destroy animation (pop / burst) then remove from scene.
   */
  playDestroyAnimation(): void {
    // Stop glow
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }

    // Disable physics body immediately to prevent re-triggering
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    if (body) body.enable = false;

    // Burst particles along the net
    const particles = this.scene.add.particles(this.x, this.y, 'particle-sparkle', {
      speed: { min: 50, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 15,
      tint: [0x90ee90, 0xffffff, 0x00ff00],
      emitting: false,
    });
    particles.explode();
    this.scene.time.delayedCall(500, () => particles.destroy());

    // Scale up and fade out
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleY: 3,
      scaleX: 1.3,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.destroy();
      },
    });
  }

  destroy(fromScene?: boolean): void {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }
    super.destroy(fromScene);
  }
}
