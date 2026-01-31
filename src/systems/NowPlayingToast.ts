import type { TrackMetadata } from '../types/AudioManifest';

/**
 * Configuration for toast timing
 */
interface ToastConfig {
  /** Delay after track starts before showing toast (ms) */
  showDelay: number;
  /** How long toast remains visible (ms) */
  displayDuration: number;
  /** Slide-out animation duration (ms) - must match CSS */
  slideOutDuration: number;
}

/**
 * NowPlayingToast - MTV/VH1 style "Now Playing" notification
 *
 * Renders outside the Phaser game canvas using pure HTML/CSS.
 * Shows track name and genre when songs change, with animated
 * equalizer bars and neon glow effects.
 *
 * Usage:
 *   const toast = NowPlayingToast.getInstance();
 *   const unsubscribe = audioManager.onTrackChange((metadata) => toast.onTrackChange(metadata));
 */
export class NowPlayingToast {
  private static instance: NowPlayingToast | null = null;

  private container: HTMLElement | null = null;
  private trackElement: HTMLElement | null = null;
  private artistElement: HTMLElement | null = null;

  private showTimeoutId: number | null = null;
  private hideTimeoutId: number | null = null;
  private isVisible: boolean = false;

  private config: ToastConfig;

  private constructor(config?: Partial<ToastConfig>) {
    this.config = {
      showDelay: 3500,
      displayDuration: 5000,
      slideOutDuration: 400,
      ...config,
    };
    this.createContainer();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): NowPlayingToast {
    if (!NowPlayingToast.instance) {
      NowPlayingToast.instance = new NowPlayingToast();
    }
    return NowPlayingToast.instance;
  }

  /**
   * Called when a new track starts playing.
   * Schedules the toast to appear after the configured delay.
   */
  onTrackChange(metadata: TrackMetadata | null): void {
    // Cancel any pending show/hide operations
    this.cancelPendingTimers();

    // Immediately hide if currently visible
    if (this.isVisible) {
      this.hideImmediate();
    }

    // Don't show if no metadata
    if (!metadata || !metadata.name) {
      return;
    }

    // Schedule show after delay (let the music establish first)
    this.showTimeoutId = window.setTimeout(() => {
      this.show(metadata);
    }, this.config.showDelay);
  }

  /**
   * Create the toast DOM structure
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'now-playing-toast';
    this.container.className = 'now-playing-toast';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('role', 'status');

    this.container.innerHTML = `
      <div class="now-playing-eq">
        <div class="now-playing-eq-bar"></div>
        <div class="now-playing-eq-bar"></div>
        <div class="now-playing-eq-bar"></div>
        <div class="now-playing-eq-bar"></div>
      </div>
      <div class="now-playing-content">
        <div class="now-playing-label">NOW PLAYING</div>
        <div class="now-playing-track"></div>
        <div class="now-playing-artist"></div>
      </div>
    `;

    // Cache element references
    this.trackElement = this.container.querySelector('.now-playing-track');
    this.artistElement = this.container.querySelector('.now-playing-artist');

    document.body.appendChild(this.container);
  }

  /**
   * Show the toast with track information
   */
  private show(metadata: TrackMetadata): void {
    if (!this.container) return;

    // Update content
    if (this.trackElement) {
      this.trackElement.textContent = metadata.name || 'Unknown Track';
    }
    if (this.artistElement) {
      this.artistElement.textContent = metadata.artist || '';
      // Hide artist element if empty
      this.artistElement.style.display = metadata.artist ? 'block' : 'none';
    }

    // Trigger slide-in animation
    this.container.classList.remove('hiding');
    this.container.classList.add('visible');
    this.isVisible = true;

    // Schedule auto-hide
    this.hideTimeoutId = window.setTimeout(() => {
      this.hide();
    }, this.config.displayDuration);
  }

  /**
   * Hide the toast with slide-out animation
   */
  private hide(): void {
    if (!this.container || !this.isVisible) return;

    this.container.classList.add('hiding');
    this.container.classList.remove('visible');

    // After animation completes, clean up state
    setTimeout(() => {
      if (this.container) {
        this.container.classList.remove('hiding');
      }
      this.isVisible = false;
    }, this.config.slideOutDuration);
  }

  /**
   * Immediately hide without animation (for rapid track changes)
   */
  private hideImmediate(): void {
    if (!this.container) return;

    this.container.classList.remove('visible', 'hiding');
    this.isVisible = false;
  }

  /**
   * Cancel any pending show/hide timers
   */
  private cancelPendingTimers(): void {
    if (this.showTimeoutId !== null) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }
    if (this.hideTimeoutId !== null) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
  }

  /**
   * Manually dismiss the toast
   */
  dismiss(): void {
    this.cancelPendingTimers();
    this.hide();
  }

  /**
   * Check if toast is currently visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Update toast timing configuration
   */
  setConfig(config: Partial<ToastConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clean up for full game shutdown
   */
  destroy(): void {
    this.cancelPendingTimers();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.trackElement = null;
    this.artistElement = null;
    NowPlayingToast.instance = null;
  }
}
