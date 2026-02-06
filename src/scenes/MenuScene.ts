import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/Constants';
import { AudioManager } from '../systems/AudioManager';
import { BackgroundManager } from '../systems/BackgroundManager';
import { LoadingOverlay } from '../utils/LoadingOverlay';
import { CurrencyManager } from '../systems/CurrencyManager';

export class MenuScene extends Phaser.Scene {
  // Track menu elements for transition animation
  private menuElements: Phaser.GameObjects.GameObject[] = [];
  private decorations: Phaser.GameObjects.GameObject[] = [];
  private isTransitioning: boolean = false;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Reset state
    this.menuElements = [];
    this.decorations = [];
    this.isTransitioning = false;

    // Initialize audio manager with this scene
    const audioManager = AudioManager.getInstance();
    audioManager.init(this);

    // Set transparent background so CSS background shows through
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');

    // Set the full-viewport background (use level 1 for menu)
    BackgroundManager.setLevelBackground(1);

    // Title
    const titleTop = this.add.text(centerX, 120, "GENO'S", {
      font: 'bold 48px Arial',
      color: '#ff69b4',
    }).setOrigin(0.5);
    this.menuElements.push(titleTop);

    const titleBottom = this.add.text(centerX, 180, 'BLOCK PARTY', {
      font: 'bold 64px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.menuElements.push(titleBottom);

    // Subtitle
    const subtitle = this.add.text(centerX, 240, 'A Breakout Adventure', {
      font: '24px Arial',
      color: '#a78bfa',
    }).setOrigin(0.5);
    this.menuElements.push(subtitle);

    // Start button
    const startButton = this.add.rectangle(centerX, centerY + 50, 200, 60, COLORS.PADDLE)
      .setInteractive({ useHandCursor: true });
    this.menuElements.push(startButton);

    const startText = this.add.text(centerX, centerY + 50, 'START GAME', {
      font: 'bold 24px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.menuElements.push(startText);

    // Button hover effects
    startButton.on('pointerover', () => {
      if (this.isTransitioning) return;
      startButton.setScale(1.05);
      startText.setScale(1.05);
    });

    startButton.on('pointerout', () => {
      if (this.isTransitioning) return;
      startButton.setScale(1);
      startText.setScale(1);
    });

    startButton.on('pointerdown', () => {
      if (this.isTransitioning) return;
      this.goToModeSelect();
    });

    // Settings button
    const settingsButton = this.add.rectangle(centerX, centerY + 130, 200, 50, 0x666666)
      .setInteractive({ useHandCursor: true });
    this.menuElements.push(settingsButton);

    const settingsText = this.add.text(centerX, centerY + 130, 'SETTINGS', {
      font: 'bold 20px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.menuElements.push(settingsText);

    settingsButton.on('pointerover', () => {
      if (this.isTransitioning) return;
      settingsButton.setScale(1.05);
      settingsText.setScale(1.05);
    });

    settingsButton.on('pointerout', () => {
      if (this.isTransitioning) return;
      settingsButton.setScale(1);
      settingsText.setScale(1);
    });

    settingsButton.on('pointerdown', () => {
      if (this.isTransitioning) return;
      this.scene.launch('SettingsScene', { returnTo: 'MenuScene' });
    });

    // Party Shop button (gold/yellow to stand out)
    const shopButton = this.add.rectangle(centerX, centerY + 200, 200, 50, 0xdaa520)
      .setInteractive({ useHandCursor: true });
    this.menuElements.push(shopButton);

    const shopText = this.add.text(centerX, centerY + 200, 'PARTY SHOP', {
      font: 'bold 20px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.menuElements.push(shopText);

    // Currency balance next to the shop button
    const currency = CurrencyManager.getInstance().getTotalCurrency();
    const currencyDisplay = this.add.text(centerX, centerY + 230, `¢ ${currency}`, {
      font: '14px Arial',
      color: '#ffd700',
    }).setOrigin(0.5);
    this.menuElements.push(currencyDisplay);

    shopButton.on('pointerover', () => {
      if (this.isTransitioning) return;
      shopButton.setScale(1.05);
      shopText.setScale(1.05);
    });

    shopButton.on('pointerout', () => {
      if (this.isTransitioning) return;
      shopButton.setScale(1);
      shopText.setScale(1);
    });

    shopButton.on('pointerdown', () => {
      if (this.isTransitioning) return;
      this.scene.start('ShopScene');
    });

    // Stats button (purple to match theme)
    const statsButton = this.add.rectangle(centerX, centerY + 280, 200, 50, 0x8b5cf6)
      .setInteractive({ useHandCursor: true });
    this.menuElements.push(statsButton);

    const statsText = this.add.text(centerX, centerY + 280, 'STATS', {
      font: 'bold 20px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.menuElements.push(statsText);

    statsButton.on('pointerover', () => {
      if (this.isTransitioning) return;
      statsButton.setScale(1.05);
      statsText.setScale(1.05);
    });

    statsButton.on('pointerout', () => {
      if (this.isTransitioning) return;
      statsButton.setScale(1);
      statsText.setScale(1);
    });

    statsButton.on('pointerdown', () => {
      if (this.isTransitioning) return;
      this.scene.start('StatsScene');
    });

    // Music Player button (vintage brown)
    const musicPlayerButton = this.add.rectangle(centerX, centerY + 350, 200, 50, 0x8b4513)
      .setInteractive({ useHandCursor: true });
    this.menuElements.push(musicPlayerButton);

    const musicPlayerText = this.add.text(centerX, centerY + 350, 'MUSIC PLAYER', {
      font: 'bold 20px Arial',
      color: '#f5e6c8',
    }).setOrigin(0.5);
    this.menuElements.push(musicPlayerText);

    musicPlayerButton.on('pointerover', () => {
      if (this.isTransitioning) return;
      musicPlayerButton.setScale(1.05);
      musicPlayerText.setScale(1.05);
    });

    musicPlayerButton.on('pointerout', () => {
      if (this.isTransitioning) return;
      musicPlayerButton.setScale(1);
      musicPlayerText.setScale(1);
    });

    musicPlayerButton.on('pointerdown', () => {
      if (this.isTransitioning) return;
      this.scene.start('MusicPlayerScene', { returnTo: 'MenuScene' });
    });

    // High score display (derived from leaderboard)
    const highScore = this.getHighScoreFromLeaderboard();
    const highScoreText = this.add.text(centerX, GAME_HEIGHT - 60, `High Score: ${highScore}`, {
      font: '20px Arial',
      color: '#ffd93d',
    }).setOrigin(0.5);
    this.menuElements.push(highScoreText);

    // Instructions
    const instructions = this.add.text(centerX, GAME_HEIGHT - 28, 'Move paddle with mouse or touch', {
      font: '16px Arial',
      color: '#888888',
    }).setOrigin(0.5);
    this.menuElements.push(instructions);

    // Add some floating decorations
    this.createDecorations();

    // Show "Click to Start" button - the click unlocks audio context
    LoadingOverlay.getInstance().showContinueButton(() => {
      // This callback runs on user click, which unlocks browser audio
      const audioManager = AudioManager.getInstance();
      const webAudioSound = this.sound as Phaser.Sound.WebAudioSoundManager;

      // Resume audio context if suspended
      if (webAudioSound.context?.state === 'suspended') {
        webAudioSound.context.resume().then(() => {
          // Only start menu music if nothing is playing (first visit)
          // When returning from gameplay, music is already handled by handleReturnToMenu()
          if (!audioManager.isMusicPlaying()) {
            audioManager.playMusic('menu-music');
          }
        });
      } else {
        // Only start menu music if nothing is playing (first visit)
        if (!audioManager.isMusicPlaying()) {
          audioManager.playMusic('menu-music');
        }
      }
    });
  }

  private goToModeSelect(): void {
    this.isTransitioning = true;

    // Simple fade transition to mode select
    this.cameras.main.fadeOut(300, 0, 0, 0);

    this.time.delayedCall(300, () => {
      this.scene.start('ModeSelectScene');
    });
  }

  private createDecorations(): void {
    // Create some floating particles for party feel
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(50, GAME_WIDTH - 50);
      const y = Phaser.Math.Between(50, GAME_HEIGHT - 50);
      const size = Phaser.Math.Between(3, 8);
      const colors = [0xff69b4, 0xffa500, 0x00bfff, 0xffd93d, 0xa78bfa];
      const color = Phaser.Utils.Array.GetRandom(colors);

      const particle = this.add.circle(x, y, size, color, 0.3);
      this.decorations.push(particle);

      // Gentle floating animation
      this.tweens.add({
        targets: particle,
        y: y + Phaser.Math.Between(-30, 30),
        x: x + Phaser.Math.Between(-20, 20),
        alpha: { from: 0.3, to: 0.1 },
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private getHighScoreFromLeaderboard(): string {
    try {
      const data = localStorage.getItem('genos-block-party-leaderboard');
      if (data) {
        const leaderboard = JSON.parse(data) as { initials: string; score: number }[];
        if (leaderboard.length > 0) {
          return leaderboard[0].score.toString();
        }
      }
    } catch {
      // Ignore parse errors
    }
    return '0';
  }
}
