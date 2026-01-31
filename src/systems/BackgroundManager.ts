import { LEVELS } from '../config/LevelData';
import { TransitionType } from '../types/TransitionTypes';

/**
 * BackgroundManager controls the full-viewport background behind the game.
 * Uses CSS background-image for level images, with gradient fallbacks for levels without images.
 */
export class BackgroundManager {
  private static bgWrapper: HTMLElement | null = null;
  private static transitionWrapper: HTMLElement | null = null;

  /**
   * Get the background wrapper element, caching the reference
   */
  private static getWrapper(): HTMLElement | null {
    if (!this.bgWrapper) {
      this.bgWrapper = document.getElementById('bg-wrapper');
    }
    return this.bgWrapper;
  }

  /**
   * Convert a hex number (0xRRGGBB) to CSS rgb string
   */
  private static hexToRgb(hex: number): string {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Generate a gradient background from a base color
   */
  private static createGradient(baseColor: number): string {
    const rgb = this.hexToRgb(baseColor);
    // Create a radial gradient from lighter center to darker edges
    const r = (baseColor >> 16) & 255;
    const g = (baseColor >> 8) & 255;
    const b = baseColor & 255;

    // Lighter version for center
    const lighterR = Math.min(255, r + 40);
    const lighterG = Math.min(255, g + 40);
    const lighterB = Math.min(255, b + 40);
    const lighter = `rgb(${lighterR}, ${lighterG}, ${lighterB})`;

    // Darker version for edges
    const darkerR = Math.max(0, r - 30);
    const darkerG = Math.max(0, g - 30);
    const darkerB = Math.max(0, b - 30);
    const darker = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;

    return `radial-gradient(ellipse at center, ${lighter} 0%, ${rgb} 50%, ${darker} 100%)`;
  }

  /**
   * Set the background for a specific level (1-indexed)
   * Uses level image if available, otherwise falls back to gradient
   */
  static setLevelBackground(levelNumber: number): void {
    const wrapper = this.getWrapper();
    if (!wrapper) return;

    // Try to use level background image
    const imagePath = `art/level${levelNumber}/bg.jpg`;

    // Get the level's base color for fallback
    const levelIndex = levelNumber - 1;
    const level = LEVELS[levelIndex];
    const fallbackGradient = level
      ? this.createGradient(level.backgroundColor)
      : this.createGradient(0x1a1a2e);

    // Set the image with gradient fallback
    // The image will be used if it exists, otherwise CSS shows the gradient
    wrapper.style.backgroundImage = `url('${imagePath}'), ${fallbackGradient}`;
  }

  /**
   * Set background with only a gradient (no image)
   */
  static setGradientBackground(color: number): void {
    const wrapper = this.getWrapper();
    if (!wrapper) return;

    wrapper.style.backgroundImage = this.createGradient(color);
  }

  /**
   * Clear the background
   */
  static clearBackground(): void {
    const wrapper = this.getWrapper();
    if (!wrapper) return;

    wrapper.style.backgroundImage = 'none';
  }

  /**
   * Get the transition background element, caching the reference
   */
  private static getTransitionWrapper(): HTMLElement | null {
    if (!this.transitionWrapper) {
      this.transitionWrapper = document.getElementById('bg-transition');
    }
    return this.transitionWrapper;
  }

  /**
   * Build the background image CSS value for a level
   */
  private static buildLevelBackgroundImage(levelNumber: number): string {
    const imagePath = `art/level${levelNumber}/bg.jpg`;
    const levelIndex = levelNumber - 1;
    const level = LEVELS[levelIndex];
    const fallbackGradient = level
      ? this.createGradient(level.backgroundColor)
      : this.createGradient(0x1a1a2e);

    return `url('${imagePath}'), ${fallbackGradient}`;
  }

  /**
   * Animate background transition with whip effect
   * @param type - The type of whip transition
   * @param newLevelNumber - The level to transition TO (1-indexed)
   * @param duration - Animation duration in ms
   * @param overlapDuration - How much the enter overlaps with exit
   */
  static animateTransition(
    type: TransitionType,
    newLevelNumber: number,
    duration: number,
    _overlapDuration: number // No longer used - both animations start simultaneously
  ): Promise<void> {
    const wrapper = this.getWrapper();
    const transitionWrapper = this.getTransitionWrapper();

    if (!wrapper || !transitionWrapper) {
      // Fallback: just set the background directly
      this.setLevelBackground(newLevelNumber);
      return Promise.resolve();
    }

    // Disable CSS transition during animation
    wrapper.classList.add('animating');

    // Set up the new background on the transition layer
    transitionWrapper.style.backgroundImage = this.buildLevelBackgroundImage(newLevelNumber);
    transitionWrapper.style.opacity = '1';

    // Determine animation classes based on type
    let exitClass: string;
    let enterClass: string;

    switch (type) {
      case TransitionType.WHIP_LEFT:
        exitClass = 'bg-whip-out-left';
        enterClass = 'bg-whip-in-right';
        break;
      case TransitionType.WHIP_RIGHT:
        exitClass = 'bg-whip-out-right';
        enterClass = 'bg-whip-in-left';
        break;
      case TransitionType.WHIP_DOWN:
        exitClass = 'bg-whip-out-down';
        enterClass = 'bg-whip-in-top';
        break;
      default:
        // Fallback to simple crossfade
        wrapper.style.backgroundImage = transitionWrapper.style.backgroundImage;
        transitionWrapper.style.opacity = '0';
        wrapper.classList.remove('animating');
        return Promise.resolve();
    }

    // Update animation duration via CSS custom property
    const durationSec = `${duration / 1000}s`;
    wrapper.style.setProperty('--transition-duration', durationSec);
    transitionWrapper.style.setProperty('--transition-duration', durationSec);

    return new Promise((resolve) => {
      // Start BOTH animations simultaneously - incoming slides over outgoing with no gaps
      wrapper.classList.add(exitClass);
      transitionWrapper.classList.add(enterClass);

      // After animations complete
      setTimeout(() => {
        // Swap backgrounds: move transition content to main wrapper
        wrapper.style.backgroundImage = transitionWrapper.style.backgroundImage;

        // Reset states
        wrapper.classList.remove(exitClass, 'animating');
        wrapper.style.transform = '';
        wrapper.style.opacity = '1';

        transitionWrapper.classList.remove(enterClass);
        transitionWrapper.style.opacity = '0';
        transitionWrapper.style.transform = '';

        resolve();
      }, duration + 100); // Small buffer for cleanup
    });
  }
}
