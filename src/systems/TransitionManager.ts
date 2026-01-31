import Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { BackgroundManager } from './BackgroundManager';
import {
  TransitionConfig,
  ElementExitStyle,
  DEFAULT_TRANSITION,
  TRANSITION_PRESETS,
} from '../types/TransitionTypes';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

type TransitionCallback = () => void;

/**
 * TransitionManager orchestrates scene transitions with coordinated
 * CSS background animations and Phaser game element effects.
 */
export class TransitionManager {
  private static instance: TransitionManager | null = null;
  private scene: Phaser.Scene | null = null;
  private isTransitioning: boolean = false;

  private constructor() {}

  static getInstance(): TransitionManager {
    if (!TransitionManager.instance) {
      TransitionManager.instance = new TransitionManager();
    }
    return TransitionManager.instance;
  }

  /**
   * Initialize with current scene context
   */
  init(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /**
   * Check if a transition is in progress
   */
  isInTransition(): boolean {
    return this.isTransitioning;
  }

  /**
   * Execute a full scene transition
   * @param preset - Named preset from TRANSITION_PRESETS, or custom config
   * @param newLevelNumber - The level to transition TO (for background)
   * @param elementsToAnimate - Array of Phaser game objects to animate out
   * @param onMidpoint - Callback when exit complete, before enter (load new scene here)
   * @param onComplete - Callback when transition fully complete
   */
  async transition(
    preset: string | Partial<TransitionConfig>,
    newLevelNumber: number,
    elementsToAnimate: Phaser.GameObjects.GameObject[],
    onMidpoint: TransitionCallback,
    onComplete?: TransitionCallback
  ): Promise<void> {
    if (this.isTransitioning || !this.scene) return;
    this.isTransitioning = true;

    // Merge preset with defaults
    const config = this.resolveConfig(preset);
    const audioManager = AudioManager.getInstance();

    // Phase 1: Play exit sound
    if (config.exitSfx) {
      audioManager.playSFX(config.exitSfx);
    }

    // Start element exit AND background transition simultaneously
    await Promise.all([
      this.animateElementsOut(elementsToAnimate, config),
      this.transitionBackground(config, newLevelNumber),
    ]);

    // Phase 3: Play enter sound (before midpoint since scene may change)
    if (config.enterSfx) {
      audioManager.playSFX(config.enterSfx);
    }

    // Reset transitioning state BEFORE midpoint callback
    // (midpoint may call scene.start() which stops the current scene)
    this.isTransitioning = false;

    // Phase 4: Midpoint callback (scene loads new content)
    onMidpoint();

    // Note: Code after onMidpoint() may not execute if scene.start() was called
    onComplete?.();
  }

  /**
   * Simplified transition for level-to-level (within GameScene)
   */
  async transitionToNextLevel(
    nextLevelNumber: number,
    bricks: Phaser.Physics.Arcade.StaticGroup,
    paddle: Phaser.GameObjects.Sprite,
    ball: Phaser.GameObjects.Sprite,
    onLoadLevel: TransitionCallback
  ): Promise<void> {
    const elements = [
      ...bricks.getChildren(),
      paddle,
      ball,
    ].filter(Boolean);

    await this.transition(
      'level-complete',
      nextLevelNumber,
      elements,
      onLoadLevel
    );
  }

  /**
   * Resolve preset name or partial config to full config
   */
  private resolveConfig(preset: string | Partial<TransitionConfig>): TransitionConfig {
    if (typeof preset === 'string') {
      return { ...DEFAULT_TRANSITION, ...TRANSITION_PRESETS[preset] };
    }
    return { ...DEFAULT_TRANSITION, ...preset };
  }

  /**
   * Animate game elements out of the scene
   */
  private async animateElementsOut(
    elements: Phaser.GameObjects.GameObject[],
    config: TransitionConfig
  ): Promise<void> {
    if (!this.scene || elements.length === 0) return;

    const promises: Promise<void>[] = [];

    elements.forEach((element, index) => {
      if (!element || !(element as Phaser.GameObjects.Sprite).active) return;

      const delay = index * config.elementExitStagger;
      const sprite = element as Phaser.GameObjects.Sprite;

      promises.push(
        this.animateSingleElement(sprite, config.elementExitStyle, config.elementExitDuration, delay)
      );
    });

    await Promise.all(promises);
  }

  /**
   * Animate a single element based on exit style
   */
  private animateSingleElement(
    sprite: Phaser.GameObjects.Sprite,
    style: ElementExitStyle,
    duration: number,
    delay: number
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.scene) {
        resolve();
        return;
      }

      const centerX = GAME_WIDTH / 2;
      const centerY = GAME_HEIGHT / 2;

      switch (style) {
        case ElementExitStyle.EXPLODE: {
          // Calculate direction away from center
          const angle = Math.atan2(sprite.y - centerY, sprite.x - centerX);
          const distance = 400;
          const targetX = sprite.x + Math.cos(angle) * distance;
          const targetY = sprite.y + Math.sin(angle) * distance;

          this.scene.tweens.add({
            targets: sprite,
            x: targetX,
            y: targetY,
            scale: 0,
            alpha: 0,
            rotation: Phaser.Math.DegToRad(Phaser.Math.Between(-180, 180)),
            duration,
            delay,
            ease: 'Back.easeIn',
            onComplete: () => resolve(),
          });
          break;
        }

        case ElementExitStyle.DROP: {
          this.scene.tweens.add({
            targets: sprite,
            y: GAME_HEIGHT + 100,
            alpha: 0,
            rotation: Phaser.Math.DegToRad(Phaser.Math.Between(-45, 45)),
            duration,
            delay,
            ease: 'Quad.easeIn',
            onComplete: () => resolve(),
          });
          break;
        }

        case ElementExitStyle.SLIDE_OUT: {
          const direction = sprite.x < centerX ? -1 : 1;
          this.scene.tweens.add({
            targets: sprite,
            x: sprite.x + direction * (GAME_WIDTH + 100),
            alpha: 0,
            duration,
            delay,
            ease: 'Quad.easeIn',
            onComplete: () => resolve(),
          });
          break;
        }

        case ElementExitStyle.SPIRAL: {
          this.scene.tweens.add({
            targets: sprite,
            x: centerX,
            y: centerY,
            scale: 0,
            alpha: 0,
            rotation: Phaser.Math.DegToRad(720),
            duration,
            delay,
            ease: 'Cubic.easeIn',
            onComplete: () => resolve(),
          });
          break;
        }

        case ElementExitStyle.SHATTER: {
          // Quick scale/rotation burst then fade
          this.scene.tweens.add({
            targets: sprite,
            scale: 1.5,
            duration: duration * 0.2,
            delay,
            ease: 'Quad.easeOut',
            yoyo: false,
            onComplete: () => {
              this.scene?.tweens.add({
                targets: sprite,
                scale: 0,
                alpha: 0,
                rotation: Phaser.Math.DegToRad(Phaser.Math.Between(-90, 90)),
                duration: duration * 0.8,
                ease: 'Cubic.easeIn',
                onComplete: () => resolve(),
              });
            },
          });
          break;
        }

        default:
          resolve();
      }
    });
  }

  /**
   * Transition the CSS background with whip effect
   */
  private transitionBackground(
    config: TransitionConfig,
    newLevelNumber: number
  ): Promise<void> {
    return BackgroundManager.animateTransition(
      config.backgroundType,
      newLevelNumber,
      config.backgroundDuration,
      config.overlapDuration
    );
  }

}
