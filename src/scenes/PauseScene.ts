import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/Constants';
import { AudioManager } from '../systems/AudioManager';
import { CurrencyManager } from '../systems/CurrencyManager';
import { TransitionManager } from '../systems/TransitionManager';
import { GameScene } from './GameScene';

export class PauseScene extends Phaser.Scene {
  private audioManager!: AudioManager;
  private playPauseText!: Phaser.GameObjects.Text;
  private nowPlayingContainer!: Phaser.GameObjects.Container;
  private trackNameText!: Phaser.GameObjects.Text | null;
  private artistText!: Phaser.GameObjects.Text | null;
  private noTrackText!: Phaser.GameObjects.Text | null;
  private unsubscribeTrackChange: (() => void) | null = null;
  private container!: Phaser.GameObjects.Container;
  private isTransitioning: boolean = false;

  constructor() {
    super('PauseScene');
  }

  create(): void {
    // Reset transition flag when scene is re-opened
    this.isTransitioning = false;

    // Get AudioManager and init with this scene so it can use our sound/tween systems
    // (GameScene is paused, so we need an active scene for audio operations)
    this.audioManager = AudioManager.getInstance();
    this.audioManager.init(this);

    // Semi-transparent overlay
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.7
    );

    // Pause container
    this.container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Pause title
    const title = this.add.text(0, -190, 'PAUSED', {
      font: 'bold 48px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add(title);

    // Track info (mini version - just name/artist for quick reference)
    const trackInfo = this.createTrackInfoMini();
    trackInfo.setPosition(0, -100);
    this.container.add(trackInfo);

    // Music playback controls
    const musicControls = this.createMusicControls();
    musicControls.setPosition(0, -50);
    this.container.add(musicControls);

    // Settings button
    const settingsButton = this.createButton(0, 20, 'SETTINGS', 0x666666, () => {
      this.scene.stop();
      this.scene.launch('SettingsScene', { returnTo: 'PauseScene' });
    });
    this.container.add(settingsButton);

    // Music Player button (vintage brown)
    const musicPlayerButton = this.createButton(0, 90, 'MUSIC PLAYER', 0x8b4513, () => {
      this.scene.stop();
      this.scene.launch('MusicPlayerScene', { returnTo: 'PauseScene' });
    });
    this.container.add(musicPlayerButton);

    // Resume button
    const resumeButton = this.createButton(0, 160, 'RESUME', COLORS.PADDLE, () => {
      this.resumeGame();
    });
    this.container.add(resumeButton);

    // Restart button
    const restartButton = this.createButton(0, 230, 'RESTART', 0x4ade80, () => {
      this.restartGameWithTransition();
    });
    this.container.add(restartButton);

    // Quit button
    const quitButton = this.createButton(0, 300, 'QUIT TO MENU', 0xff6b6b, () => {
      this.quitToMenuWithTransition();
    });
    this.container.add(quitButton);

    // Instructions
    const instructions = this.add.text(0, 360, 'Press ESC or P to resume', {
      font: '16px Arial',
      color: '#888888',
    }).setOrigin(0.5);
    this.container.add(instructions);

    // Animate in
    this.container.setScale(0.8);
    this.container.setAlpha(0);
    overlay.setAlpha(0);

    this.tweens.add({
      targets: overlay,
      alpha: 0.7,
      duration: 200,
    });

    this.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-ESC', () => {
      this.resumeGame();
    });

    this.input.keyboard?.on('keydown-P', () => {
      this.resumeGame();
    });

    // Clean up track change listener when scene stops
    this.events.on('shutdown', () => {
      if (this.unsubscribeTrackChange) {
        this.unsubscribeTrackChange();
        this.unsubscribeTrackChange = null;
      }
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const buttonContainer = this.add.container(x, y);

    // Button background
    const bg = this.add.rectangle(0, 0, 220, 50, color)
      .setInteractive({ useHandCursor: true });
    buttonContainer.add(bg);

    // Button text
    const buttonText = this.add.text(0, 0, text, {
      font: 'bold 20px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    buttonContainer.add(buttonText);

    // Hover effects
    bg.on('pointerover', () => {
      buttonContainer.setScale(1.05);
    });

    bg.on('pointerout', () => {
      buttonContainer.setScale(1);
    });

    bg.on('pointerdown', onClick);

    return buttonContainer;
  }

  private createTrackInfoMini(): Phaser.GameObjects.Container {
    this.nowPlayingContainer = this.add.container(0, 0);

    // Create all text elements upfront
    this.trackNameText = this.add.text(0, -8, '', {
      font: 'bold 16px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.nowPlayingContainer.add(this.trackNameText);

    this.artistText = this.add.text(0, 12, '', {
      font: '14px Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.nowPlayingContainer.add(this.artistText);

    this.noTrackText = this.add.text(0, 0, 'No track playing', {
      font: '14px Arial',
      color: '#666666',
    }).setOrigin(0.5);
    this.nowPlayingContainer.add(this.noTrackText);

    // Set initial state
    this.updateTrackInfoMini();

    // Subscribe to track changes
    this.unsubscribeTrackChange = this.audioManager.onTrackChange(() => {
      this.updateTrackInfoMini();
    });

    return this.nowPlayingContainer;
  }

  private updateTrackInfoMini(): void {
    const metadata = this.audioManager.getCurrentTrackMetadata();

    if (metadata && metadata.name) {
      this.trackNameText?.setText(metadata.name).setVisible(true);
      this.artistText?.setText(metadata.artist || 'Unknown Artist').setVisible(true);
      this.noTrackText?.setVisible(false);
    } else {
      this.trackNameText?.setVisible(false);
      this.artistText?.setVisible(false);
      this.noTrackText?.setVisible(true);
    }
  }

  private createMusicControls(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const buttonSize = 36;
    const spacing = 50;

    // Helper to create an icon button
    const createIconButton = (x: number, icon: string, onClick: () => void): Phaser.GameObjects.Container => {
      const btnContainer = this.add.container(x, 0);

      const bg = this.add.rectangle(0, 0, buttonSize, buttonSize, 0x444444, 1)
        .setInteractive({ useHandCursor: true });
      btnContainer.add(bg);

      const text = this.add.text(0, 0, icon, {
        font: '18px Arial',
        color: '#ffffff',
      }).setOrigin(0.5);
      btnContainer.add(text);

      bg.on('pointerover', () => bg.setFillStyle(0x666666));
      bg.on('pointerout', () => bg.setFillStyle(0x444444));
      bg.on('pointerdown', onClick);

      return btnContainer;
    };

    // Previous track
    const prevBtn = createIconButton(-spacing * 1.5, '<<', () => {
      this.audioManager.skipToPreviousTrack();
    });
    container.add(prevBtn);

    // Play/Pause toggle
    const playPauseBtn = this.add.container(-spacing * 0.5, 0);
    const playPauseBg = this.add.rectangle(0, 0, buttonSize, buttonSize, 0x444444, 1)
      .setInteractive({ useHandCursor: true });
    playPauseBtn.add(playPauseBg);

    this.playPauseText = this.add.text(0, 0, this.audioManager.isMusicPlaying() ? '||' : '>', {
      font: 'bold 18px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    playPauseBtn.add(this.playPauseText);

    playPauseBg.on('pointerover', () => playPauseBg.setFillStyle(0x666666));
    playPauseBg.on('pointerout', () => playPauseBg.setFillStyle(0x444444));
    playPauseBg.on('pointerdown', () => {
      if (this.audioManager.isMusicPlaying()) {
        this.audioManager.pauseMusic();
        this.playPauseText.setText('>');
      } else {
        this.audioManager.resumeMusic();
        this.playPauseText.setText('||');
      }
    });
    container.add(playPauseBtn);

    // Stop (restart and pause)
    const stopBtn = createIconButton(spacing * 0.5, '[]', () => {
      this.audioManager.restartAndPause();
      this.playPauseText.setText('>');
    });
    container.add(stopBtn);

    // Next track
    const nextBtn = createIconButton(spacing * 1.5, '>>', () => {
      this.audioManager.skipToNextTrack();
    });
    container.add(nextBtn);

    return container;
  }

  private resumeGame(): void {
    const uiScene = this.scene.get('UIScene') as unknown as { resumeGame?: () => void };
    if (uiScene && typeof uiScene.resumeGame === 'function') {
      uiScene.resumeGame();
    } else {
      // Fallback if UIScene not available
      this.scene.resume('GameScene');
      this.scene.stop();
    }
  }

  private restartGameWithTransition(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const transitionManager = TransitionManager.getInstance();
    transitionManager.init(this);

    transitionManager.transition(
      'menu-to-game',
      1,
      [this.container],
      () => {
        this.restartGame();
      }
    );
  }

  private quitToMenuWithTransition(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const transitionManager = TransitionManager.getInstance();
    transitionManager.init(this);

    transitionManager.transition(
      'game-over-to-menu',
      1,
      [this.container],
      () => {
        this.quitToMenu();
      }
    );
  }

  private restartGame(): void {
    // Clear level state but keep music playing for seamless transition
    // GameScene's loadLevelMusic() will crossfade to new level's music
    this.audioManager.clearLevelState();

    this.scene.stop('UIScene');
    this.scene.stop('GameScene');
    this.scene.stop();
    this.scene.start('GameScene');
  }

  private quitToMenu(): void {
    // Handle return to menu - rebuilds playlist based on level lock setting
    // If level lock is ON, will switch to user's selected station playlist
    this.audioManager.handleReturnToMenu();

    // Get current score from GameScene for currency award
    const gameScene = this.scene.get('GameScene') as GameScene;
    const currentScore = gameScene?.getScore?.() ?? 0;

    // Award currency for partial game progress
    if (currentScore > 0) {
      CurrencyManager.getInstance().awardCurrencyFromScore(currentScore);
    }

    // Stop all game-related scenes
    this.scene.stop('GameScene');
    this.scene.stop('UIScene');
    this.scene.stop();

    // Go directly to menu
    this.scene.start('MenuScene');
  }
}
