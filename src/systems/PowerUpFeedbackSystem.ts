import Phaser from 'phaser';
import { PowerUpType, POWERUP_CONFIGS } from '../types/PowerUpTypes';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

/**
 * Configuration for per-power-up visual feedback
 */
interface PowerUpFeedbackConfig {
  displayName: string;
  color: number;
  particles?: {
    colors?: number[];
    count?: number;
    // Hook for custom particle effect (method name on ParticleSystem)
    custom?: string;
  };
  screenEffect?: {
    flash?: { duration: number; color: number; alpha?: number };
    shake?: { duration: number; intensity: number };
  };
}

/**
 * Default feedback configurations for each power-up type
 */
const POWERUP_FEEDBACK_CONFIG: Record<PowerUpType, PowerUpFeedbackConfig> = {
  [PowerUpType.BALLOON]: {
    displayName: 'SLOW BALL!',
    color: POWERUP_CONFIGS[PowerUpType.BALLOON].color,
    particles: {
      colors: [POWERUP_CONFIGS[PowerUpType.BALLOON].color, 0xffffff, 0xffaaaa],
      count: 10,
    },
    screenEffect: {
      flash: { duration: 100, color: 0xffffff, alpha: 0.3 },
    },
  },
  [PowerUpType.CAKE]: {
    displayName: 'WIDE PADDLE!',
    color: POWERUP_CONFIGS[PowerUpType.CAKE].color,
    particles: {
      colors: [POWERUP_CONFIGS[PowerUpType.CAKE].color, 0xffffff, 0xffee88],
      count: 10,
    },
    screenEffect: {
      flash: { duration: 100, color: 0xffffff, alpha: 0.3 },
    },
  },
  [PowerUpType.DRINKS]: {
    displayName: 'WOBBLY!',
    color: POWERUP_CONFIGS[PowerUpType.DRINKS].color,
    particles: {
      colors: [POWERUP_CONFIGS[PowerUpType.DRINKS].color, 0xffffff, 0xaaffaa],
      count: 10,
    },
    screenEffect: {
      flash: { duration: 100, color: 0xffffff, alpha: 0.3 },
    },
  },
  [PowerUpType.DISCO]: {
    displayName: 'MULTI-BALL!',
    color: POWERUP_CONFIGS[PowerUpType.DISCO].color,
    particles: {
      colors: [0xff00ff, 0x00ffff, 0xffff00, POWERUP_CONFIGS[PowerUpType.DISCO].color],
      count: 15,
    },
    screenEffect: {
      flash: { duration: 100, color: POWERUP_CONFIGS[PowerUpType.DISCO].color, alpha: 0.4 },
    },
  },
  [PowerUpType.MYSTERY]: {
    displayName: '???',
    color: POWERUP_CONFIGS[PowerUpType.MYSTERY].color,
    particles: {
      colors: [POWERUP_CONFIGS[PowerUpType.MYSTERY].color, 0xffffff, 0x88ff88],
      count: 10,
    },
    screenEffect: {
      flash: { duration: 100, color: 0xffffff, alpha: 0.3 },
    },
  },
  [PowerUpType.POWERBALL]: {
    displayName: 'POWER BALL!',
    color: POWERUP_CONFIGS[PowerUpType.POWERBALL].color,
    particles: {
      colors: [POWERUP_CONFIGS[PowerUpType.POWERBALL].color, 0xffcc00, 0xffffff],
      count: 12,
    },
    screenEffect: {
      flash: { duration: 100, color: POWERUP_CONFIGS[PowerUpType.POWERBALL].color, alpha: 0.35 },
    },
  },
  [PowerUpType.FIREBALL]: {
    displayName: 'FIREBALL!',
    color: POWERUP_CONFIGS[PowerUpType.FIREBALL].color,
    particles: {
      colors: [0xff4500, 0xff6600, 0xffaa00, 0xffcc00],
      count: 15,
    },
    screenEffect: {
      flash: { duration: 150, color: POWERUP_CONFIGS[PowerUpType.FIREBALL].color, alpha: 0.5 },
    },
  },
  [PowerUpType.ELECTRICBALL]: {
    displayName: 'ELECTRIC BALL!',
    color: POWERUP_CONFIGS[PowerUpType.ELECTRICBALL].color,
    particles: {
      colors: [0x00ffff, 0x00e5ff, 0x40ffff, 0xffffff, 0xff00ff],
      count: 15,
    },
    screenEffect: {
      flash: { duration: 120, color: POWERUP_CONFIGS[PowerUpType.ELECTRICBALL].color, alpha: 0.45 },
    },
  },
  [PowerUpType.PARTY_POPPER]: {
    displayName: 'PARTY POPPER!',
    color: POWERUP_CONFIGS[PowerUpType.PARTY_POPPER].color,
    particles: {
      colors: [0xff4500, 0xff6600, 0xffaa00, 0xffcc00, 0xffffff],
      count: 15,
    },
    screenEffect: {
      flash: { duration: 150, color: POWERUP_CONFIGS[PowerUpType.PARTY_POPPER].color, alpha: 0.5 },
      shake: { duration: 100, intensity: 0.005 },
    },
  },
  [PowerUpType.BASS_DROP]: {
    displayName: '🎵 BASS DROP! 🎵',
    color: POWERUP_CONFIGS[PowerUpType.BASS_DROP].color,
    particles: {
      colors: [0x9400d3, 0xba55d3, 0xff00ff, 0x7b00ff, 0xffffff],
      count: 25,
    },
    screenEffect: {
      flash: { duration: 300, color: 0x9400d3, alpha: 0.6 },
      shake: { duration: 400, intensity: 0.02 },
    },
  },
  [PowerUpType.DJ_SCRATCH]: {
    displayName: 'MAGNET PADDLE!',
    color: POWERUP_CONFIGS[PowerUpType.DJ_SCRATCH].color,
    particles: {
      colors: [0x00ffff, 0x00e5ff, 0xffffff, 0x40ffff],
      count: 12,
    },
    screenEffect: {
      flash: { duration: 100, color: POWERUP_CONFIGS[PowerUpType.DJ_SCRATCH].color, alpha: 0.35 },
    },
  },
  [PowerUpType.BOUNCE_HOUSE]: {
    displayName: 'SAFETY NET!',
    color: POWERUP_CONFIGS[PowerUpType.BOUNCE_HOUSE].color,
    particles: {
      colors: [0x90ee90, 0xffffff, 0x00ff00, 0xaaffaa],
      count: 12,
    },
    screenEffect: {
      flash: { duration: 100, color: POWERUP_CONFIGS[PowerUpType.BOUNCE_HOUSE].color, alpha: 0.35 },
    },
  },
  [PowerUpType.PARTY_FAVOR]: {
    displayName: 'EXTRA LIFE!',
    color: POWERUP_CONFIGS[PowerUpType.PARTY_FAVOR].color,
    particles: {
      colors: [0xff69b4, 0xffd700, 0xffffff, 0xff1493],
      count: 20,
    },
    screenEffect: {
      flash: { duration: 200, color: 0xffd700, alpha: 0.5 },
    },
  },
  [PowerUpType.CONFETTI_CANNON]: {
    displayName: 'CONFETTI CANNON!',
    color: POWERUP_CONFIGS[PowerUpType.CONFETTI_CANNON].color,
    particles: {
      colors: [0xff1493, 0x00ff00, 0xffff00, 0x00ffff, 0xff6600, 0xff00ff],
      count: 20,
    },
    screenEffect: {
      flash: { duration: 150, color: POWERUP_CONFIGS[PowerUpType.CONFETTI_CANNON].color, alpha: 0.4 },
    },
  },
};

/**
 * Manages all visual feedback when power-ups are collected:
 * - Center-screen popup text
 * - Sparkle particles (type-specific colors)
 * - Screen effects (flash, shake)
 */
export class PowerUpFeedbackSystem {
  private scene: Phaser.Scene;
  private activePopup: Phaser.GameObjects.Text | null = null;
  private popupTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Called when a power-up is collected
   */
  onCollect(type: PowerUpType, x: number, y: number): void {
    const config = POWERUP_FEEDBACK_CONFIG[type];

    // 1. Sparkle particles at collection point
    this.playParticles(x, y, config);

    // 2. Screen effect
    this.playScreenEffect(config);

    // 3. Popup text in center
    this.showPopupText(config.displayName, config.color);
  }

  /**
   * Called when mystery power-up reveals its actual effect
   */
  revealMystery(actualType: PowerUpType): void {
    const config = POWERUP_FEEDBACK_CONFIG[actualType];

    // Delay the reveal slightly for dramatic effect
    this.scene.time.delayedCall(300, () => {
      this.showPopupText(config.displayName, config.color);
    });
  }

  /**
   * Play sparkle particles at collection point
   */
  private playParticles(x: number, y: number, config: PowerUpFeedbackConfig): void {
    const particleConfig = config.particles || {};
    const colors = particleConfig.colors || [0xffffff, 0xffd700, 0x00ffff];
    const count = particleConfig.count || 8;

    const particles = this.scene.add.particles(x, y, 'particle-sparkle', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      quantity: count,
      tint: colors,
      emitting: false,
    });

    particles.explode();

    // Cleanup
    this.scene.time.delayedCall(500, () => {
      particles.destroy();
    });
  }

  /**
   * Play screen effect (flash and/or shake)
   */
  private playScreenEffect(config: PowerUpFeedbackConfig): void {
    const screenEffect = config.screenEffect;
    if (!screenEffect) return;

    const camera = this.scene.cameras.main;

    // Flash effect
    if (screenEffect.flash) {
      const { duration, color, alpha = 0.3 } = screenEffect.flash;
      // Phaser flash takes RGB components
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;
      camera.flash(duration, r, g, b, false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        // Custom alpha curve - fade in then out
        if (progress < 0.5) {
          camera.flashEffect.alpha = alpha * (progress * 2);
        } else {
          camera.flashEffect.alpha = alpha * ((1 - progress) * 2);
        }
      });
    }

    // Shake effect
    if (screenEffect.shake) {
      const { duration, intensity } = screenEffect.shake;
      camera.shake(duration, intensity);
    }
  }

  /**
   * Show popup text in center of screen
   */
  private showPopupText(displayName: string, color: number): void {
    // Clean up any existing popup
    this.clearPopup();

    // Create text with styling
    const popup = this.scene.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 50,
      displayName,
      {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '42px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        stroke: '#000000',
        strokeThickness: 6,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          fill: true,
        },
      }
    );
    popup.setOrigin(0.5);
    popup.setScale(0);
    popup.setAlpha(0);
    popup.setDepth(1000); // Ensure on top

    this.activePopup = popup;

    // Animation sequence:
    // 1. Pop-in (scale 0 → 1.2, alpha 0 → 1)
    // 2. Settle (scale 1.2 → 1)
    // 3. Hold
    // 4. Float up and fade out

    this.popupTween = this.scene.tweens.add({
      targets: popup,
      scale: { from: 0, to: 1.2 },
      alpha: { from: 0, to: 1 },
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Settle
        this.scene.tweens.add({
          targets: popup,
          scale: 1,
          duration: 100,
          ease: 'Quad.easeOut',
          onComplete: () => {
            // Hold then float and fade
            this.scene.time.delayedCall(600, () => {
              if (popup && popup.active) {
                this.scene.tweens.add({
                  targets: popup,
                  y: popup.y - 50,
                  alpha: 0,
                  scale: 0.8,
                  duration: 400,
                  ease: 'Quad.easeIn',
                  onComplete: () => {
                    popup.destroy();
                    if (this.activePopup === popup) {
                      this.activePopup = null;
                    }
                  },
                });
              }
            });
          },
        });
      },
    });
  }

  /**
   * Clear any active popup
   */
  private clearPopup(): void {
    if (this.popupTween) {
      this.popupTween.stop();
      this.popupTween = null;
    }
    if (this.activePopup) {
      this.activePopup.destroy();
      this.activePopup = null;
    }
  }

  /**
   * Get config for a power-up type (useful for extensions)
   */
  getConfig(type: PowerUpType): PowerUpFeedbackConfig {
    return POWERUP_FEEDBACK_CONFIG[type];
  }

  /**
   * Clean up on scene shutdown
   */
  destroy(): void {
    this.clearPopup();
  }
}
