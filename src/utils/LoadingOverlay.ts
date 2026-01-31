/**
 * LoadingOverlay manages the HTML loading screen that displays
 * before and during Phaser initialization.
 *
 * This singleton bridges the pure HTML/CSS overlay with Phaser's
 * loading lifecycle, ensuring a smooth reveal when the game is ready.
 *
 * The overlay includes a "Click to Start" button which ensures
 * the browser's audio context is unlocked via user interaction.
 */
export class LoadingOverlay {
  private static instance: LoadingOverlay | null = null;

  private overlay: HTMLElement | null = null;
  private bgWrapper: HTMLElement | null = null;
  private gameContainer: HTMLElement | null = null;
  private loadingText: HTMLElement | null = null;
  private continueButton: HTMLElement | null = null;
  private isHidden: boolean = false;
  private isReady: boolean = false;
  private onContinueCallback: (() => void) | null = null;

  private constructor() {
    this.cacheElements();
    this.setupClickHandler();
  }

  static getInstance(): LoadingOverlay {
    if (!LoadingOverlay.instance) {
      LoadingOverlay.instance = new LoadingOverlay();
    }
    return LoadingOverlay.instance;
  }

  private cacheElements(): void {
    this.overlay = document.getElementById('loading-overlay');
    this.bgWrapper = document.getElementById('bg-wrapper');
    this.gameContainer = document.getElementById('game-container');
    this.loadingText = this.overlay?.querySelector('.loading-text') ?? null;
    this.continueButton = this.overlay?.querySelector('.click-to-continue') ?? null;
  }

  private setupClickHandler(): void {
    if (!this.continueButton) return;

    this.continueButton.addEventListener('click', () => {
      if (!this.isReady) return;

      // Trigger the callback first (to unlock audio)
      if (this.onContinueCallback) {
        this.onContinueCallback();
      }

      // Then hide the overlay
      this.performHide();
    });
  }

  /**
   * Update the loading status text
   */
  setLoadingText(text: string): void {
    if (this.isHidden || !this.loadingText) return;
    this.loadingText.textContent = text;
  }

  /**
   * Show the "Click to Start" button and wait for user interaction.
   * This ensures the browser's audio context is unlocked.
   *
   * @param onContinue - Callback to run when user clicks (before hiding)
   */
  showContinueButton(onContinue?: () => void): void {
    if (this.isHidden) return;

    this.isReady = true;
    this.onContinueCallback = onContinue ?? null;

    // Hide loading text, stop block animations, show button
    if (this.loadingText) {
      this.loadingText.classList.add('hidden');
    }

    // Stop the block animations by removing them
    const allBlocks = this.overlay?.querySelectorAll('.loading-block');
    allBlocks?.forEach((block) => {
      (block as HTMLElement).style.animation = 'none';
      (block as HTMLElement).style.opacity = '1';
      (block as HTMLElement).style.transform = 'none';
    });

    // Show the continue button
    if (this.continueButton) {
      this.continueButton.style.display = 'flex';
    }
  }

  /**
   * Perform the actual hide animation
   */
  private async performHide(): Promise<void> {
    if (this.isHidden || !this.overlay) return;
    this.isHidden = true;

    // Reveal background and game container first
    this.bgWrapper?.classList.add('ready');
    this.gameContainer?.classList.add('ready');

    // Brief pause to let background start appearing
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Fade out the overlay
    this.overlay.classList.add('hidden');

    // After CSS transition completes, remove from DOM entirely
    await new Promise((resolve) => setTimeout(resolve, 800));
    this.overlay.classList.add('removed');
  }

  /**
   * Legacy method - now shows the continue button instead of auto-hiding
   * @deprecated Use showContinueButton() for click-to-start behavior
   */
  async hide(delay: number = 0): Promise<void> {
    // For backwards compatibility, this now just shows the continue button
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.showContinueButton();
  }

  /**
   * Check if the overlay is currently visible
   */
  isVisible(): boolean {
    return !this.isHidden;
  }
}
