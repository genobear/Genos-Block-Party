import Phaser from 'phaser';
import { Brick } from './Brick';
import { CONFETTI_CANNON } from '../config/Constants';

/**
 * A confetti streamer projectile that travels from a start position to a target brick
 * in a wavy sine-wave pattern with a particle trail behind it.
 */
export class ConfettiStreamer {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private target: Brick;
  private startX: number;
  private startY: number;
  private color: number;

  // Motion parameters
  private elapsed: number = 0;
  private travelDuration: number;
  private sineAmplitude: number;
  private sineFrequency: number;
  private sinePhase: number;

  // Precomputed perpendicular unit vector
  private perpX: number;
  private perpY: number;

  // State
  private alive: boolean = true;
  private timeoutTimer: Phaser.Time.TimerEvent;

  // Callbacks
  private onHit: (brick: Brick) => void;
  private onComplete: (streamer: ConfettiStreamer) => void;

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
    target: Brick,
    color: number,
    travelDuration: number,
    onHit: (brick: Brick) => void,
    onComplete: (streamer: ConfettiStreamer) => void
  ) {
    this.scene = scene;
    this.startX = startX;
    this.startY = startY;
    this.target = target;
    this.color = color;
    this.travelDuration = travelDuration;
    this.onHit = onHit;
    this.onComplete = onComplete;

    // Randomize sine wave parameters for visual variety
    this.sineAmplitude = Phaser.Math.Between(
      CONFETTI_CANNON.SINE_AMPLITUDE_MIN,
      CONFETTI_CANNON.SINE_AMPLITUDE_MAX
    );
    this.sineFrequency = Phaser.Math.FloatBetween(
      CONFETTI_CANNON.SINE_FREQUENCY_MIN,
      CONFETTI_CANNON.SINE_FREQUENCY_MAX
    );
    this.sinePhase = Phaser.Math.FloatBetween(0, Math.PI * 2);

    // Compute perpendicular unit vector to the travel direction
    const dx = target.x - startX;
    const dy = target.y - startY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    // Perpendicular is (-dy, dx) normalized
    this.perpX = -dy / dist;
    this.perpY = dx / dist;

    // Create the streamer sprite
    this.sprite = scene.add.image(startX, startY, 'particle-streamer');
    this.sprite.setTint(color);
    this.sprite.setScale(1.2);
    this.sprite.setDepth(18); // Above bricks (10), below UI

    // Create trailing particle emitter
    this.trailEmitter = scene.add.particles(0, 0, 'particle-confetti', {
      follow: this.sprite,
      speed: { min: 5, max: 25 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 300,
      frequency: 30,
      quantity: 1,
      tint: [color, 0xffffff],
      rotate: { min: -180, max: 180 },
    });
    this.trailEmitter.setDepth(17);

    // Safety timeout
    this.timeoutTimer = scene.time.delayedCall(CONFETTI_CANNON.TIMEOUT, () => {
      if (this.alive) {
        this.fizzleOut();
      }
    });
  }

  update(delta: number): void {
    if (!this.alive) return;

    // If target was destroyed mid-flight by something else
    if (!this.target || !this.target.active) {
      this.fizzleOut();
      return;
    }

    this.elapsed += delta;
    const t = Math.min(this.elapsed / this.travelDuration, 1.0);

    // Base position: linear interpolation from start to target
    const baseX = Phaser.Math.Linear(this.startX, this.target.x, t);
    const baseY = Phaser.Math.Linear(this.startY, this.target.y, t);

    // Sine wave offset perpendicular to travel direction
    // Quadratic taper (1 - t^2) makes it wiggle wide at launch, converge at target
    const taper = 1.0 - t * t;
    const sineOffset =
      Math.sin(this.sinePhase + t * this.sineFrequency * Math.PI * 2) *
      this.sineAmplitude *
      taper;

    this.sprite.x = baseX + this.perpX * sineOffset;
    this.sprite.y = baseY + this.perpY * sineOffset;

    // Rotate sprite to roughly face travel direction
    if (t < 0.99) {
      const angle = Math.atan2(
        this.target.y - this.sprite.y,
        this.target.x - this.sprite.x
      );
      this.sprite.setRotation(angle);
    }

    // Arrived at target
    if (t >= 1.0) {
      this.hitTarget();
    }
  }

  private hitTarget(): void {
    if (!this.alive) return;
    this.alive = false;

    // Apply damage via callback
    this.onHit(this.target);

    // Small impact burst at target position
    this.createImpactBurst();

    this.cleanup();
  }

  private fizzleOut(): void {
    if (!this.alive) return;
    this.alive = false;

    // Fade out the sprite
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.cleanup();
      },
    });

    // Stop emitting new trail particles immediately
    this.trailEmitter.stop();
  }

  private createImpactBurst(): void {
    const burst = this.scene.add.particles(
      this.sprite.x,
      this.sprite.y,
      'particle-confetti',
      {
        speed: { min: 40, max: 120 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 300,
        quantity: 8,
        tint: [this.color, 0xffffff, 0xffd700],
        rotate: { min: -180, max: 180 },
      }
    );
    burst.explode();
    burst.setDepth(18);

    // Auto-destroy after particles finish
    this.scene.time.delayedCall(400, () => {
      burst.destroy();
    });
  }

  private cleanup(): void {
    // Cancel safety timeout
    if (this.timeoutTimer) {
      this.timeoutTimer.destroy();
    }

    // Stop trail and schedule destruction (let existing particles fade)
    this.trailEmitter.stop();
    this.scene.time.delayedCall(350, () => {
      this.trailEmitter.destroy();
    });

    // Destroy sprite
    this.sprite.destroy();

    // Notify GameScene to remove from active list
    this.onComplete(this);
  }

  isAlive(): boolean {
    return this.alive;
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    if (this.timeoutTimer) {
      this.timeoutTimer.destroy();
    }
    this.trailEmitter.destroy();
    this.sprite.destroy();
  }
}
