import Phaser from 'phaser';
import {
  PLAYABLE_WIDTH,
  PLAY_AREA_Y,
  PLAYABLE_HEIGHT,
  AUDIO,
} from '../config/Constants';
import { AudioManager } from '../systems/AudioManager';

/**
 * SafetyNet — a one-use horizontal bar that sits just above the death zone.
 * When a ball hits it, the ball bounces upward and the net is consumed (pop animation).
 */
export class SafetyNet extends Phaser.Physics.Arcade.Sprite {
  private consumed: boolean = false;
  private glowTween: Phaser.Tweens.Tween | null = null;

  /** Y position: just above the death zone, below the paddle */
  static readonly NET_Y = PLAY_AREA_Y + PLAYABLE_HEIGHT - 10;
  static readonly NET_WIDTH = PLAYABLE_WIDTH - 40; // Slightly narrower than play area
  static readonly NET_HEIGHT = 8;

  constructor(scene: Phaser.Scene) {
    super(scene, PLAYABLE_WIDTH / 2, SafetyNet.NET_Y, 'safety-net');

    scene.add.existing(this);
    scene.physics.add.existing(this, false); // dynamic body so collider works

    // Configure physics — immovable so ball bounces off it
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);
    body.moves = false;

    // Set collision body size to match the texture
    body.setSize(SafetyNet.NET_WIDTH, SafetyNet.NET_HEIGHT);

    // Visual: slightly transparent, green glow
    this.setAlpha(0.8);
    this.setDepth(5);

    // Spawn animation: inflate from nothing
    this.setScale(0, 0.5);
    scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Pulsing glow effect
    this.glowTween = scene.tweens.add({
      targets: this,
      alpha: { from: 0.6, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Whether this net has already been consumed
   */
  isConsumed(): boolean {
    return this.consumed;
  }

  /**
   * Called when a ball hits the net — bounce the ball and destroy the net
   */
  onBallHit(ball: Phaser.Physics.Arcade.Sprite): void {
    if (this.consumed) return;
    this.consumed = true;

    // Bounce the ball upward
    const ballBody = ball.body as Phaser.Physics.Arcade.Body;
    // Ensure ball moves upward with a strong bounce
    const speed = Math.max(Math.abs(ballBody.velocity.y), 300);
    ballBody.velocity.y = -speed;

    // Ensure the ball is above the net after bounce
    ball.y = this.y - SafetyNet.NET_HEIGHT / 2 - 12;

    // Play bounce SFX
    AudioManager.getInstance().playSFX(AUDIO.SFX.BOUNCE);

    // Stop glow
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }

    // Disable physics immediately so no further collisions
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    // Pop animation: expand and fade out
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.3,
      scaleY: 2.5,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.destroy();
      },
    });

    // Spawn pop particles
    this.spawnPopParticles();
  }

  /**
   * Pop particle burst when the net is consumed
   */
  private spawnPopParticles(): void {
    const particles = this.scene.add.particles(this.x, this.y, 'particle-sparkle', {
      speed: { min: 50, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      quantity: 20,
      tint: [0x90ee90, 0x00ff00, 0xffffff],
      emitting: false,
    });
    particles.explode();

    this.scene.time.delayedCall(600, () => {
      particles.destroy();
    });
  }

  /**
   * Clean up tweens on destroy
   */
  destroy(fromScene?: boolean): void {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }
    super.destroy(fromScene);
  }
}
