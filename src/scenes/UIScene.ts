import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAY_AREA_Y, PLAYABLE_HEIGHT, IS_TOUCH_DEVICE, MOBILE_TOUCH_ZONE_HEIGHT, UI_BORDER_BOTTOM } from '../config/Constants';
import { PowerUpType, POWERUP_CONFIGS } from '../types/PowerUpTypes';

interface PowerUpIndicator {
  container: Phaser.GameObjects.Container;
  timerBar: Phaser.GameObjects.Rectangle;
  startTime: number;
  duration: number;
  stackBadge?: Phaser.GameObjects.Container;
}

export class UIScene extends Phaser.Scene {
  // UI elements
  private scoreText!: Phaser.GameObjects.Text;
  private livesContainer!: Phaser.GameObjects.Container;
  private levelText!: Phaser.GameObjects.Text;
  private launchText!: Phaser.GameObjects.Text;

  // Power-up indicators (positioned in bottom UI border)
  private powerUpIndicators: Map<string, PowerUpIndicator> = new Map();
  private indicatorStartX = 16;
  private indicatorY = GAME_HEIGHT - 25; // Center of bottom 50px border

  // Pause button (for mobile)
  private pauseButton!: Phaser.GameObjects.Container;
  private pauseButtonBg!: Phaser.GameObjects.Arc;

  // State
  private currentLives: number = 3;
  private isPaused: boolean = false;

  constructor() {
    super('UIScene');
  }

  create(): void {
    // Reset state (Phaser reuses scene instances, so these may retain old values)
    this.isPaused = false;
    this.currentLives = 3;
    this.powerUpIndicators.clear();

    // Create all UI elements
    this.createScoreDisplay();
    this.createLivesDisplay();
    this.createLevelDisplay();
    this.createLaunchText();
    this.createPauseButton();
    this.createMobileTouchHint();

    // Listen for game events
    this.setupEventListeners();
  }

  update(_time: number, _delta: number): void {
    // Update power-up timer bars
    this.updatePowerUpTimers();
  }

  private createScoreDisplay(): void {
    // Score label
    this.add.text(16, 12, 'SCORE', {
      font: 'bold 12px Arial',
      color: '#888888',
    });

    // Score value with glow effect container
    this.scoreText = this.add.text(16, 28, '0', {
      font: 'bold 28px Arial',
      color: '#ffffff',
    });
  }

  private createLivesDisplay(): void {
    this.livesContainer = this.add.container(GAME_WIDTH - 16, 16);

    // Lives label
    const label = this.add.text(0, -4, 'LIVES', {
      font: 'bold 12px Arial',
      color: '#888888',
    }).setOrigin(1, 0);
    this.livesContainer.add(label);

    // Initial lives icons
    this.updateLivesIcons(3);
  }

  private updateLivesIcons(lives: number): void {
    // Remove existing life icons
    this.livesContainer.each((child: Phaser.GameObjects.GameObject) => {
      if (child instanceof Phaser.GameObjects.Arc) {
        child.destroy();
      }
    });

    // Add life icons (hearts represented as circles)
    for (let i = 0; i < lives; i++) {
      const heart = this.add.circle(
        -(i * 28) - 14,
        28,
        10,
        0xff6b6b
      );
      this.livesContainer.add(heart);

      // Add subtle pulse to last life when low
      if (lives === 1) {
        this.tweens.add({
          targets: heart,
          scale: 1.2,
          duration: 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  private createLevelDisplay(): void {
    // Level container at top center
    const container = this.add.container(GAME_WIDTH / 2, 24);

    // Level name
    this.levelText = this.add.text(0, 0, 'Level 1', {
      font: 'bold 20px Arial',
      color: '#ffd93d',
    }).setOrigin(0.5);
    container.add(this.levelText);
  }

  private createLaunchText(): void {
    // Position within playable area (above paddle)
    this.launchText = this.add.text(
      GAME_WIDTH / 2,
      PLAY_AREA_Y + PLAYABLE_HEIGHT - 100,
      'Click or tap to launch!',
      {
        font: '18px Arial',
        color: '#888888',
      }
    ).setOrigin(0.5);

    // Subtle pulse animation
    this.tweens.add({
      targets: this.launchText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createPauseButton(): void {
    // Position in top UI border
    this.pauseButton = this.add.container(GAME_WIDTH - 50, 25);

    // Button background
    this.pauseButtonBg = this.add.circle(0, 0, 20, 0x000000, 0.3)
      .setInteractive({ useHandCursor: true });
    this.pauseButton.add(this.pauseButtonBg);

    // Pause icon (two vertical bars)
    const bar1 = this.add.rectangle(-5, 0, 4, 14, 0xffffff);
    const bar2 = this.add.rectangle(5, 0, 4, 14, 0xffffff);
    this.pauseButton.add(bar1);
    this.pauseButton.add(bar2);

    // Button interaction
    this.pauseButtonBg.on('pointerover', () => {
      this.pauseButton.setScale(1.1);
    });

    this.pauseButtonBg.on('pointerout', () => {
      this.pauseButton.setScale(1);
    });

    this.pauseButtonBg.on('pointerdown', () => {
      this.togglePause();
    });

    // Keyboard pause
    this.input.keyboard?.on('keydown-ESC', () => {
      this.togglePause();
    });

    this.input.keyboard?.on('keydown-P', () => {
      this.togglePause();
    });
  }

  private createMobileTouchHint(): void {
    if (!IS_TOUCH_DEVICE) return;

    // Position hint in center of the mobile touch zone
    const touchZoneY = PLAY_AREA_Y + PLAYABLE_HEIGHT + UI_BORDER_BOTTOM + (MOBILE_TOUCH_ZONE_HEIGHT / 2);

    const hintText = this.add.text(
      GAME_WIDTH / 2,
      touchZoneY,
      '← swipe here to move paddle →',
      {
        font: '16px Arial',
        color: '#ffffff',
      }
    ).setOrigin(0.5).setAlpha(0.3);

    // Fade out after a few seconds of gameplay
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: hintText,
        alpha: 0,
        duration: 1000,
      });
    });
  }

  private togglePause(): void {
    // Don't allow toggling if already paused (PauseScene handles resume)
    if (this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.scene.pause('GameScene');
    this.scene.launch('PauseScene');
  }

  private setupEventListeners(): void {
    const gameScene = this.scene.get('GameScene');

    // Score updates
    gameScene.events.on('scoreUpdate', this.updateScore, this);

    // Lives updates
    gameScene.events.on('livesUpdate', this.updateLives, this);

    // Level updates
    gameScene.events.on('levelUpdate', this.updateLevel, this);

    // Launch state
    gameScene.events.on('ballLaunched', this.hideLaunchText, this);
    gameScene.events.on('ballReset', this.showLaunchText, this);

    // Power-up effects
    gameScene.events.on('effectApplied', this.showPowerUpIndicator, this);
    gameScene.events.on('effectExpired', this.hidePowerUpIndicator, this);
    gameScene.events.on('effectsCleared', this.clearAllIndicators, this);

    // Game end
    gameScene.events.on('gameOver', this.onGameEnd, this);
    gameScene.events.on('gameWin', this.onGameEnd, this);

    // Clean up on scene shutdown
    this.events.on('shutdown', () => {
      gameScene.events.off('scoreUpdate', this.updateScore, this);
      gameScene.events.off('livesUpdate', this.updateLives, this);
      gameScene.events.off('levelUpdate', this.updateLevel, this);
      gameScene.events.off('ballLaunched', this.hideLaunchText, this);
      gameScene.events.off('ballReset', this.showLaunchText, this);
      gameScene.events.off('effectApplied', this.showPowerUpIndicator, this);
      gameScene.events.off('effectExpired', this.hidePowerUpIndicator, this);
      gameScene.events.off('effectsCleared', this.clearAllIndicators, this);
      gameScene.events.off('gameOver', this.onGameEnd, this);
      gameScene.events.off('gameWin', this.onGameEnd, this);
    });
  }

  private updateScore(score: number): void {
    // Animate score change
    this.tweens.add({
      targets: this.scoreText,
      scale: 1.2,
      duration: 100,
      yoyo: true,
      onStart: () => {
        this.scoreText.setText(score.toString());
      },
    });
  }

  private updateLives(lives: number): void {
    const previousLives = this.currentLives;
    this.currentLives = lives;

    // Animate life loss
    if (lives < previousLives) {
      this.cameras.main.flash(200, 255, 100, 100);
    }

    this.updateLivesIcons(lives);
  }

  private updateLevel(levelName: string): void {
    this.levelText.setText(levelName);

    // Animate level transition
    this.tweens.add({
      targets: this.levelText,
      scale: 1.3,
      duration: 300,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private hideLaunchText(): void {
    this.tweens.add({
      targets: this.launchText,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.launchText.setVisible(false);
      },
    });
  }

  private showLaunchText(): void {
    this.launchText.setVisible(true);
    this.launchText.setAlpha(0);
    this.tweens.add({
      targets: this.launchText,
      alpha: 1,
      duration: 200,
    });
  }

  private showPowerUpIndicator(type: string, duration?: number, stackCount?: number): void {
    // Remove existing indicator for this type
    this.hidePowerUpIndicator(type);

    // Calculate position
    const index = this.powerUpIndicators.size;
    const x = this.indicatorStartX + index * 50;

    // Create container
    const container = this.add.container(x, this.indicatorY);

    // Background
    const bg = this.add.circle(0, 0, 20, 0x000000, 0.6);
    container.add(bg);

    // Power-up icon
    const icon = this.add.image(0, 0, `powerup-${type}`);
    icon.setScale(1.5);
    container.add(icon);

    // Timer bar (if duration provided)
    let timerBar: Phaser.GameObjects.Rectangle | null = null;
    if (duration) {
      const barBg = this.add.rectangle(0, 28, 36, 4, 0x333333);
      container.add(barBg);

      timerBar = this.add.rectangle(0, 28, 36, 4, this.getEffectColor(type));
      container.add(timerBar);
    }

    // Stack count badge (for stackable power-ups like FireBall)
    // Fireball always shows level badge, others only show when > 1
    let stackBadge: Phaser.GameObjects.Container | undefined;
    const isFireball = type === PowerUpType.FIREBALL;
    const shouldShowBadge = stackCount && (isFireball || stackCount > 1);

    if (shouldShowBadge) {
      stackBadge = this.add.container(14, -14);

      const badgeBg = this.add.circle(0, 0, 10, isFireball ? 0xff4500 : 0xff0000);
      stackBadge.add(badgeBg);

      const stackText = this.add.text(0, 0, stackCount.toString(), {
        font: 'bold 12px Arial',
        color: '#ffffff',
      }).setOrigin(0.5);
      stackBadge.add(stackText);

      container.add(stackBadge);

      // Pulse animation on badge
      this.tweens.add({
        targets: stackBadge,
        scale: 1.2,
        duration: 150,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }

    // Entrance animation
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Pulsing glow
    this.tweens.add({
      targets: bg,
      alpha: 0.8,
      scale: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.powerUpIndicators.set(type, {
      container,
      timerBar: timerBar!,
      startTime: this.time.now,
      duration: duration || 0,
      stackBadge,
    });
  }

  private hidePowerUpIndicator(type: string): void {
    const indicator = this.powerUpIndicators.get(type);
    if (indicator) {
      this.tweens.killTweensOf(indicator.container);
      this.tweens.add({
        targets: indicator.container,
        scale: 0,
        alpha: 0,
        duration: 150,
        onComplete: () => {
          indicator.container.destroy();
        },
      });
      this.powerUpIndicators.delete(type);

      // Reposition remaining indicators
      this.repositionIndicators();
    }
  }

  private clearAllIndicators(): void {
    this.powerUpIndicators.forEach((indicator) => {
      this.tweens.killTweensOf(indicator.container);
      indicator.container.destroy();
    });
    this.powerUpIndicators.clear();
  }

  private repositionIndicators(): void {
    let index = 0;
    this.powerUpIndicators.forEach((indicator) => {
      const targetX = this.indicatorStartX + index * 50;
      this.tweens.add({
        targets: indicator.container,
        x: targetX,
        duration: 200,
        ease: 'Power2',
      });
      index++;
    });
  }

  private updatePowerUpTimers(): void {
    const now = this.time.now;

    this.powerUpIndicators.forEach((indicator) => {
      if (indicator.timerBar && indicator.duration > 0) {
        const elapsed = now - indicator.startTime;
        const remaining = Math.max(0, 1 - elapsed / indicator.duration);
        indicator.timerBar.setScale(remaining, 1);
      }
    });
  }

  private getEffectColor(type: string): number {
    const powerUpType = type as PowerUpType;
    const config = POWERUP_CONFIGS[powerUpType];
    return config?.color ?? 0xffffff;
  }

  private onGameEnd(): void {
    // Hide UI elements during game over
    this.tweens.add({
      targets: [this.scoreText, this.livesContainer, this.levelText, this.pauseButton],
      alpha: 0,
      duration: 500,
    });
    this.clearAllIndicators();
  }

  // Public method to resume pause state (called from PauseScene)
  public resumeGame(): void {
    this.isPaused = false;
    this.scene.resume('GameScene');
    this.scene.stop('PauseScene');
  }

  // Public method to quit to menu (called from PauseScene)
  public quitToMenu(): void {
    this.isPaused = false;
    this.scene.stop('GameScene');
    this.scene.stop('PauseScene');
    this.scene.stop('UIScene');
    this.scene.start('MenuScene');
  }
}
