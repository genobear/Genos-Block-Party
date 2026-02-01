import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, AUDIO } from '../config/Constants';
import { AudioManager } from '../systems/AudioManager';

interface HighScoreEntry {
  initials: string;
  score: number;
}

const STORAGE_KEY = 'genos-block-party-leaderboard';
const MAX_LEADERBOARD_ENTRIES = 5;

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;
  private isWin: boolean = false;
  private isNewHighScore: boolean = false;
  private currentInitials: string = '';
  private initialsText!: Phaser.GameObjects.Text;
  private cursorBlink!: Phaser.Time.TimerEvent;

  constructor() {
    super('GameOverScene');
  }

  init(data: { score: number; isWin: boolean }): void {
    this.finalScore = data.score || 0;
    this.isWin = data.isWin || false;
    this.currentInitials = '';
  }

  create(): void {
    // Play appropriate sound
    const audioManager = AudioManager.getInstance();

    // Play trombone for game over, or airhorn for win
    if (this.isWin) {
      audioManager.playSFX(AUDIO.SFX.AIRHORN);
    } else {
      audioManager.playSFX(AUDIO.SFX.TROMBONE);
    }

    // Check if this is a new high score
    const leaderboard = this.getLeaderboard();
    this.isNewHighScore = this.checkIsHighScore(this.finalScore, leaderboard);

    // Create background overlay
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.85
    );

    // Create the main container
    const container = this.add.container(GAME_WIDTH / 2, 0);

    // Title
    const titleText = this.isWin ? 'YOU WIN!' : 'GAME OVER';
    const titleColor = this.isWin ? '#4ade80' : '#ff6b6b';

    const title = this.add.text(0, 80, titleText, {
      font: 'bold 56px Arial',
      color: titleColor,
    }).setOrigin(0.5);
    container.add(title);

    // Animate title
    this.tweens.add({
      targets: title,
      scale: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Score display
    const scoreLabel = this.add.text(0, 150, 'FINAL SCORE', {
      font: 'bold 16px Arial',
      color: '#888888',
    }).setOrigin(0.5);
    container.add(scoreLabel);

    const scoreText = this.add.text(0, 185, this.finalScore.toString(), {
      font: 'bold 48px Arial',
      color: '#ffd93d',
    }).setOrigin(0.5);
    container.add(scoreText);

    // Animate score counting up
    this.tweens.addCounter({
      from: 0,
      to: this.finalScore,
      duration: 1500,
      ease: 'Power2',
      onUpdate: (tween) => {
        const value = tween.getValue();
        if (value !== null) {
          scoreText.setText(Math.floor(value).toString());
        }
      },
    });

    if (this.isNewHighScore) {
      this.createHighScoreEntry(container);
    } else {
      this.createLeaderboardDisplay(container, leaderboard);
      this.createActionButtons(container, 350);
    }

    // Add decorative particles
    this.createParticles();
  }

  private createHighScoreEntry(container: Phaser.GameObjects.Container): void {
    // New high score announcement
    const newHighText = this.add.text(0, 240, 'NEW HIGH SCORE!', {
      font: 'bold 24px Arial',
      color: '#ff69b4',
    }).setOrigin(0.5);
    container.add(newHighText);

    // Flash animation
    this.tweens.add({
      targets: newHighText,
      alpha: 0.5,
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    // Enter initials prompt
    const promptText = this.add.text(0, 290, 'Enter your initials:', {
      font: '18px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(promptText);

    // Initials display boxes
    const boxWidth = 50;
    const boxSpacing = 10;
    const totalWidth = 3 * boxWidth + 2 * boxSpacing;
    const startX = -totalWidth / 2 + boxWidth / 2;

    for (let i = 0; i < 3; i++) {
      const box = this.add.rectangle(
        startX + i * (boxWidth + boxSpacing),
        340,
        boxWidth,
        60,
        0x333333
      ).setStrokeStyle(2, 0x888888);
      container.add(box);
    }

    // Initials text
    this.initialsText = this.add.text(0, 340, '___', {
      font: 'bold 36px Arial',
      color: '#ffffff',
      letterSpacing: 20,
    }).setOrigin(0.5);
    container.add(this.initialsText);

    // Blinking cursor effect
    this.cursorBlink = this.time.addEvent({
      delay: 500,
      callback: this.blinkCursor,
      callbackScope: this,
      loop: true,
    });

    // Set up keyboard input
    this.input.keyboard?.on('keydown', this.handleKeyInput, this);

    // Instructions
    const instructions = this.add.text(0, 400, 'Type 3 letters, then press ENTER', {
      font: '14px Arial',
      color: '#888888',
    }).setOrigin(0.5);
    container.add(instructions);

    // Create action buttons (positioned lower)
    this.createActionButtons(container, 470);
  }

  private blinkCursor(): void {
    if (!this.initialsText) return;

    const display = this.currentInitials.padEnd(3, '_');
    const cursorPos = this.currentInitials.length;

    if (cursorPos < 3) {
      const visible = this.initialsText.alpha === 1;
      // Just toggle the underscore visibility at cursor position
      const chars = display.split('');
      if (!visible) {
        chars[cursorPos] = ' ';
      }
      this.initialsText.setText(chars.join(''));
      this.initialsText.setAlpha(1);
    }
  }

  private handleKeyInput(event: KeyboardEvent): void {
    const key = event.key.toUpperCase();

    if (key === 'BACKSPACE' && this.currentInitials.length > 0) {
      this.currentInitials = this.currentInitials.slice(0, -1);
      this.updateInitialsDisplay();
    } else if (key === 'ENTER' && this.currentInitials.length === 3) {
      this.submitHighScore();
    } else if (key.length === 1 && /[A-Z]/.test(key) && this.currentInitials.length < 3) {
      this.currentInitials += key;
      this.updateInitialsDisplay();
    }
  }

  private updateInitialsDisplay(): void {
    const display = this.currentInitials.padEnd(3, '_');
    this.initialsText.setText(display);
  }

  private submitHighScore(): void {
    // Stop input handling
    this.input.keyboard?.off('keydown', this.handleKeyInput, this);
    this.cursorBlink.remove();

    // Save to leaderboard
    const leaderboard = this.getLeaderboard();
    leaderboard.push({
      initials: this.currentInitials,
      score: this.finalScore,
    });

    // Sort and trim
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.splice(MAX_LEADERBOARD_ENTRIES);

    // Save
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));

    // Also update legacy high score for menu display
    const currentHigh = parseInt(localStorage.getItem('genos-block-party-highscore') || '0', 10);
    if (this.finalScore > currentHigh) {
      localStorage.setItem('genos-block-party-highscore', this.finalScore.toString());
    }

    // Flash confirmation
    this.initialsText.setColor('#4ade80');
    this.tweens.add({
      targets: this.initialsText,
      scale: 1.2,
      duration: 200,
      yoyo: true,
    });

    // Show leaderboard after delay
    this.time.delayedCall(500, () => {
      this.scene.restart({ score: this.finalScore, isWin: this.isWin });
    });
  }

  private createLeaderboardDisplay(
    container: Phaser.GameObjects.Container,
    leaderboard: HighScoreEntry[]
  ): void {
    // Leaderboard header
    const header = this.add.text(0, 260, 'LEADERBOARD', {
      font: 'bold 20px Arial',
      color: '#a78bfa',
    }).setOrigin(0.5);
    container.add(header);

    // Leaderboard entries
    const startY = 295;
    const lineHeight = 30;

    if (leaderboard.length === 0) {
      const noScores = this.add.text(0, startY + 30, 'No scores yet!', {
        font: '18px Arial',
        color: '#666666',
      }).setOrigin(0.5);
      container.add(noScores);
    } else {
      leaderboard.forEach((entry, index) => {
        const isCurrentScore = entry.score === this.finalScore &&
                               entry.initials === this.currentInitials;

        const rank = this.add.text(-100, startY + index * lineHeight, `${index + 1}.`, {
          font: 'bold 18px Arial',
          color: isCurrentScore ? '#ffd93d' : '#888888',
        }).setOrigin(0, 0.5);
        container.add(rank);

        const initials = this.add.text(-60, startY + index * lineHeight, entry.initials, {
          font: 'bold 18px Arial',
          color: isCurrentScore ? '#ffd93d' : '#ffffff',
        }).setOrigin(0, 0.5);
        container.add(initials);

        const score = this.add.text(100, startY + index * lineHeight, entry.score.toString(), {
          font: '18px Arial',
          color: isCurrentScore ? '#ffd93d' : '#ffffff',
        }).setOrigin(1, 0.5);
        container.add(score);
      });
    }
  }

  private createActionButtons(container: Phaser.GameObjects.Container, yPosition: number): void {
    // Play Again button
    const playAgainBtn = this.createButton(
      -100,
      yPosition,
      'PLAY AGAIN',
      COLORS.PADDLE,
      () => this.restartGame()
    );
    container.add(playAgainBtn);

    // Menu button
    const menuBtn = this.createButton(
      100,
      yPosition,
      'MENU',
      0x666666,
      () => this.goToMenu()
    );
    container.add(menuBtn);

    // Add delayed input enable
    this.time.delayedCall(1000, () => {
      this.input.keyboard?.on('keydown-SPACE', () => this.restartGame());
      this.input.keyboard?.on('keydown-ENTER', () => {
        if (!this.isNewHighScore || this.currentInitials.length === 3) {
          this.restartGame();
        }
      });
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

    const bg = this.add.rectangle(0, 0, 160, 45, color)
      .setInteractive({ useHandCursor: true });
    buttonContainer.add(bg);

    const buttonText = this.add.text(0, 0, text, {
      font: 'bold 16px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    buttonContainer.add(buttonText);

    bg.on('pointerover', () => buttonContainer.setScale(1.05));
    bg.on('pointerout', () => buttonContainer.setScale(1));
    bg.on('pointerdown', onClick);

    return buttonContainer;
  }

  private createParticles(): void {
    // Create celebratory particles if won
    if (this.isWin) {
      for (let i = 0; i < 30; i++) {
        const x = Phaser.Math.Between(50, GAME_WIDTH - 50);
        const y = Phaser.Math.Between(50, GAME_HEIGHT - 100);
        const colors = [0xff69b4, 0xffa500, 0x00bfff, 0xffd93d, 0x4ade80];
        const color = Phaser.Utils.Array.GetRandom(colors);
        const size = Phaser.Math.Between(3, 8);

        const particle = this.add.circle(x, -20, size, color, 0.8);

        this.tweens.add({
          targets: particle,
          y: y,
          duration: Phaser.Math.Between(1000, 2000),
          ease: 'Bounce.easeOut',
          delay: Phaser.Math.Between(0, 500),
        });

        this.tweens.add({
          targets: particle,
          alpha: 0,
          duration: 3000,
          delay: 2000,
        });
      }
    }
  }

  private getLeaderboard(): HighScoreEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as HighScoreEntry[];
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  }

  private checkIsHighScore(score: number, leaderboard: HighScoreEntry[]): boolean {
    if (score === 0) return false;
    if (leaderboard.length < MAX_LEADERBOARD_ENTRIES) return true;
    return score > leaderboard[leaderboard.length - 1].score;
  }

  private restartGame(): void {
    this.scene.stop('UIScene');
    this.scene.stop();
    this.scene.start('GameScene');
  }

  private goToMenu(): void {
    // Handle return to menu - rebuilds playlist based on level lock setting
    const audioManager = AudioManager.getInstance();
    audioManager.handleReturnToMenu();

    this.scene.stop('UIScene');
    this.scene.stop();
    this.scene.start('MenuScene');
  }
}
