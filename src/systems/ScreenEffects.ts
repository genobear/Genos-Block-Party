import Phaser from 'phaser';

/**
 * Manages screen-wide visual effects:
 * - Screen shake (already exists in camera, this wraps it)
 * - Screen flash
 * - Slow-motion effect
 * - Vignette overlay
 */
export class ScreenEffects {
  private scene: Phaser.Scene;
  private isSlowMotion: boolean = false;
  private originalTimeScale: number = 1;
  private dangerOverlay: Phaser.GameObjects.Graphics | null = null;
  private dangerTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Flash the screen with a color
   */
  flash(duration: number = 100, color: number = 0xffffff, intensity: number = 0.8): void {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    this.scene.cameras.main.flash(duration, r, g, b, false, (
      _cam: Phaser.Cameras.Scene2D.Camera,
      progress: number
    ) => {
      // Adjust intensity by modifying alpha
      if (progress < 0.5) {
        this.scene.cameras.main.setAlpha(1 - (progress * intensity));
      } else {
        this.scene.cameras.main.setAlpha(1 - ((1 - progress) * intensity));
      }
    });

    // Ensure alpha is reset
    this.scene.time.delayedCall(duration + 50, () => {
      this.scene.cameras.main.setAlpha(1);
    });
  }

  /**
   * Level clear celebration flash
   */
  levelClearFlash(): void {
    // Multi-color flash sequence
    this.flash(150, 0xffffff, 0.6);

    this.scene.time.delayedCall(200, () => {
      this.flash(100, 0xffd700, 0.3);
    });
  }

  /**
   * Enable slow-motion effect
   */
  enableSlowMotion(scale: number = 0.5, duration?: number): void {
    if (this.isSlowMotion) return;

    this.isSlowMotion = true;
    this.originalTimeScale = this.scene.time.timeScale;

    // Smoothly transition to slow motion
    this.scene.tweens.add({
      targets: this.scene.time,
      timeScale: scale,
      duration: 200,
      ease: 'Quad.easeOut',
    });

    // Also slow physics
    this.scene.physics.world.timeScale = 1 / scale;

    if (duration) {
      this.scene.time.delayedCall(duration * scale, () => {
        this.disableSlowMotion();
      });
    }
  }

  /**
   * Disable slow-motion effect
   */
  disableSlowMotion(): void {
    if (!this.isSlowMotion) return;

    this.isSlowMotion = false;

    // Smoothly return to normal speed
    this.scene.tweens.add({
      targets: this.scene.time,
      timeScale: this.originalTimeScale,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.scene.physics.world.timeScale = 1;
      },
    });
  }

  /**
   * Check if slow motion is active
   */
  isInSlowMotion(): boolean {
    return this.isSlowMotion;
  }

  /**
   * Show danger indicator (subtle pulsing red vignette at edges)
   */
  showDangerIndicator(): void {
    if (this.dangerOverlay) return;

    // Create a red vignette overlay
    this.dangerOverlay = this.scene.add.graphics();
    this.dangerOverlay.setDepth(1000);
    this.updateDangerOverlay(0.12);

    // Subtle pulsing animation
    this.dangerTween = this.scene.tweens.add({
      targets: { alpha: 0.12 },
      alpha: 0.25,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const value = tween.getValue();
        if (typeof value === 'number') {
          this.updateDangerOverlay(value);
        }
      },
    });
  }

  /**
   * Update danger overlay alpha
   */
  private updateDangerOverlay(alpha: number): void {
    if (!this.dangerOverlay) return;

    const { width, height } = this.scene.cameras.main;

    this.dangerOverlay.clear();

    // Draw subtle vignette (only at edges, smoother gradient)
    const gradient = this.dangerOverlay;

    // Thin vignette confined to screen edges
    const steps = 12;
    const lineWidth = 6;

    for (let i = 0; i < steps; i++) {
      // Ease-out curve for more natural falloff (stronger at very edge)
      const t = i / steps;
      const eased = 1 - (t * t); // Quadratic ease-out
      const stepAlpha = alpha * eased;
      const inset = i * lineWidth;

      gradient.lineStyle(lineWidth, 0xff0000, stepAlpha);
      gradient.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    }
  }

  /**
   * Hide danger indicator
   */
  hideDangerIndicator(): void {
    if (this.dangerTween) {
      this.dangerTween.stop();
      this.dangerTween = null;
    }

    if (this.dangerOverlay) {
      this.scene.tweens.add({
        targets: this.dangerOverlay,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.dangerOverlay?.destroy();
          this.dangerOverlay = null;
        },
      });
    }
  }

  /**
   * Cleanup all effects
   */
  destroy(): void {
    this.disableSlowMotion();
    this.hideDangerIndicator();
  }
}
