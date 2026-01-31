import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

/**
 * MusicScene - Dedicated scene for audio that runs independently
 * This scene is never paused or stopped, ensuring music controls always work.
 */
export class MusicScene extends Phaser.Scene {
  constructor() {
    super('MusicScene');
  }

  create(): void {
    // Initialize AudioManager with this scene
    // All audio operations will use MusicScene's tweens/sound manager
    AudioManager.getInstance().init(this);
  }
}
