import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/Constants';
import { AudioManager } from '../systems/AudioManager';
import { BackgroundManager } from '../systems/BackgroundManager';
import { TransitionManager } from '../systems/TransitionManager';
import { EndlessModeManager } from '../systems/EndlessModeManager';

export class ModeSelectScene extends Phaser.Scene {
  private menuElements: Phaser.GameObjects.GameObject[] = [];
  private decorations: Phaser.GameObjects.GameObject[] = [];
  private isTransitioning: boolean = false;
  private endlessModeManager!: EndlessModeManager;

  constructor() {
    super('ModeSelectScene');
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Reset state
    this.menuElements = [];
    this.decorations = [];
    this.isTransitioning = false;

    // Get endless mode manager
    this.endlessModeManager = EndlessModeManager.getInstance();
    const isEndlessUnlocked = this.endlessModeManager.isUnlocked();

    // Initialize audio manager with this scene
    const audioManager = AudioManager.getInstance();
    audioManager.init(this);

    // Set transparent background so CSS background shows through
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');

    // Keep the menu background
    BackgroundManager.setLevelBackground(1);

    // Title
    const title = this.add.text(centerX, 120, 'SELECT MODE', {
      font: 'bold 48px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.menuElements.push(title);

    // Subtitle
    const subtitle = this.add.text(centerX, 170, 'Choose your challenge', {
      font: '20px Arial',
      color: '#a78bfa',
    }).setOrigin(0.5);
    this.menuElements.push(subtitle);

    // Story Mode Button (always available)
    const storyButton = this.createModeButton(
      centerX,
      centerY - 30,
      'STORY MODE',
      '10 levels of party fun!',
      COLORS.PADDLE,
      true,
      () => this.startStoryMode()
    );
    this.menuElements.push(...storyButton);

    // Endless Mode Button
    if (isEndlessUnlocked) {
      const highestWave = this.endlessModeManager.getHighestWave();
      const endlessSubtitle = highestWave > 0
        ? `Best: Wave ${highestWave}`
        : 'Infinite waves of chaos!';

      const endlessButton = this.createModeButton(
        centerX,
        centerY + 100,
        'ENDLESS MODE',
        endlessSubtitle,
        0xff6b00, // Orange for endless
        true,
        () => this.startEndlessMode()
      );
      this.menuElements.push(...endlessButton);
    } else {
      // Locked Endless Mode button
      const lockedButton = this.createModeButton(
        centerX,
        centerY + 100,
        '🔒 ENDLESS MODE',
        'Beat Story Mode to unlock!',
        0x444444,
        false,
        () => {} // No action
      );
      this.menuElements.push(...lockedButton);
    }

    // Back button
    const backButton = this.add.rectangle(centerX, centerY + 230, 160, 45, 0x333333)
      .setInteractive({ useHandCursor: true });
    this.menuElements.push(backButton);

    const backText = this.add.text(centerX, centerY + 230, '← BACK', {
      font: 'bold 18px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.menuElements.push(backText);

    backButton.on('pointerover', () => {
      if (this.isTransitioning) return;
      backButton.setScale(1.05);
      backText.setScale(1.05);
    });

    backButton.on('pointerout', () => {
      if (this.isTransitioning) return;
      backButton.setScale(1);
      backText.setScale(1);
    });

    backButton.on('pointerdown', () => {
      if (this.isTransitioning) return;
      this.scene.start('MenuScene');
    });

    // Add floating decorations
    this.createDecorations();

    // Entrance animation
    this.animateEntrance();
  }

  private createModeButton(
    x: number,
    y: number,
    title: string,
    subtitle: string,
    color: number,
    enabled: boolean,
    onClick: () => void
  ): Phaser.GameObjects.GameObject[] {
    const elements: Phaser.GameObjects.GameObject[] = [];

    // Button container
    const buttonWidth = 280;
    const buttonHeight = 90;

    // Background
    const bg = this.add.rectangle(x, y, buttonWidth, buttonHeight, color, enabled ? 1 : 0.5);
    if (enabled) {
      bg.setInteractive({ useHandCursor: true });
    }
    elements.push(bg);

    // Border
    const border = this.add.rectangle(x, y, buttonWidth, buttonHeight);
    border.setStrokeStyle(3, enabled ? 0xffffff : 0x666666);
    elements.push(border);

    // Title text
    const titleText = this.add.text(x, y - 12, title, {
      font: 'bold 24px Arial',
      color: enabled ? '#ffffff' : '#888888',
    }).setOrigin(0.5);
    elements.push(titleText);

    // Subtitle text
    const subtitleText = this.add.text(x, y + 18, subtitle, {
      font: '14px Arial',
      color: enabled ? '#cccccc' : '#666666',
    }).setOrigin(0.5);
    elements.push(subtitleText);

    if (enabled) {
      // Hover effects
      bg.on('pointerover', () => {
        if (this.isTransitioning) return;
        bg.setScale(1.03);
        border.setScale(1.03);
        titleText.setScale(1.03);
        subtitleText.setScale(1.03);
      });

      bg.on('pointerout', () => {
        if (this.isTransitioning) return;
        bg.setScale(1);
        border.setScale(1);
        titleText.setScale(1);
        subtitleText.setScale(1);
      });

      bg.on('pointerdown', () => {
        if (this.isTransitioning) return;
        onClick();
      });
    }

    return elements;
  }

  private startStoryMode(): void {
    this.isTransitioning = true;

    const transitionManager = TransitionManager.getInstance();
    transitionManager.init(this);

    const allElements = [...this.menuElements, ...this.decorations];

    transitionManager.transition(
      'menu-to-game',
      1,
      allElements,
      () => {
        this.scene.start('GameScene', { isEndlessMode: false });
      }
    );
  }

  private startEndlessMode(): void {
    this.isTransitioning = true;

    // Start endless mode session
    this.endlessModeManager.startSession();

    const transitionManager = TransitionManager.getInstance();
    transitionManager.init(this);

    const allElements = [...this.menuElements, ...this.decorations];

    transitionManager.transition(
      'menu-to-game',
      1,
      allElements,
      () => {
        this.scene.start('GameScene', { isEndlessMode: true });
      }
    );
  }

  private createDecorations(): void {
    // Create some floating particles for party feel
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(50, GAME_WIDTH - 50);
      const y = Phaser.Math.Between(50, GAME_HEIGHT - 50);
      const size = Phaser.Math.Between(3, 6);
      const colors = [0xff69b4, 0xffa500, 0x00bfff, 0xffd93d, 0xa78bfa];
      const color = Phaser.Utils.Array.GetRandom(colors);

      const particle = this.add.circle(x, y, size, color, 0.25);
      this.decorations.push(particle);

      // Gentle floating animation
      this.tweens.add({
        targets: particle,
        y: y + Phaser.Math.Between(-25, 25),
        x: x + Phaser.Math.Between(-15, 15),
        alpha: { from: 0.25, to: 0.08 },
        duration: Phaser.Math.Between(2000, 3500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private animateEntrance(): void {
    // Animate menu elements from below
    this.menuElements.forEach((element, index) => {
      // Check if element has y property (most Phaser game objects do)
      const gameObject = element as unknown as { y?: number };
      if (typeof gameObject.y === 'number') {
        const targetY = gameObject.y;
        gameObject.y = targetY + 50;

        this.tweens.add({
          targets: element,
          y: targetY,
          alpha: { from: 0, to: 1 },
          duration: 400,
          delay: index * 50,
          ease: 'Back.easeOut',
        });
      }
    });
  }
}
