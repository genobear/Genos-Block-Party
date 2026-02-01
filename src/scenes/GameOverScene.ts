import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/Constants';
import { AudioManager } from '../systems/AudioManager';
import { CurrencyManager } from '../systems/CurrencyManager';
import { TransitionManager } from '../systems/TransitionManager';
import { AUDIO } from '../config/Constants';

interface HighScoreEntry {
  initials: string;
  score: number;
}

const STORAGE_KEY = 'genos-block-party-leaderboard';
const MAX_LEADERBOARD_ENTRIES = 5;

// Layout constants
const PANEL_WIDTH = 320;
const PANEL_PADDING = 16;
const PANEL_GAP = 16;
const PANEL_RADIUS = 12;

// Colors
const PANEL_BG = 0x1a1a2e;
const PANEL_BORDER = 0x3d3d5c;

// Animation timing
const STAGGER_DELAY = 150;
const PANEL_ANIM_DURATION = 400;

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;
  private isWin: boolean = false;
  private isNewHighScore: boolean = false;
  private highScoreAlreadyEntered: boolean = false;
  private currentInitials: string = '';
  private initialsTexts: Phaser.GameObjects.Text[] = [];
  private cursorBlink!: Phaser.Time.TimerEvent;
  private currencyEarned: number = 0;
  private totalCurrency: number = 0;

  // Track elements for transitions
  private panelElements: Phaser.GameObjects.GameObject[] = [];
  private decorations: Phaser.GameObjects.GameObject[] = [];
  private isTransitioning: boolean = false;

  // Track high score entry elements for dynamic replacement
  private highScoreEntryElements: Phaser.GameObjects.GameObject[] = [];
  private leaderboardPanelY: number = 0;

  constructor() {
    super('GameOverScene');
  }

  init(data: { score: number; isWin: boolean; currencyEarned?: number; skipCurrencyAward?: boolean; highScoreEntered?: boolean }): void {
    this.finalScore = data.score || 0;
    this.isWin = data.isWin || false;
    this.currentInitials = '';
    this.panelElements = [];
    this.decorations = [];
    this.initialsTexts = [];
    this.isTransitioning = false;
    this.highScoreEntryElements = [];
    this.leaderboardPanelY = 0;
    this.highScoreAlreadyEntered = data.highScoreEntered || false;

    // Award currency only on first entry, not on restart after high score submission
    const currencyManager = CurrencyManager.getInstance();
    if (data.skipCurrencyAward) {
      this.currencyEarned = data.currencyEarned || 0;
    } else {
      this.currencyEarned = currencyManager.awardCurrencyFromScore(this.finalScore);
    }
    this.totalCurrency = currencyManager.getTotalCurrency();
  }

  create(): void {
    // Play appropriate sound
    const audioManager = AudioManager.getInstance();
    if (this.isWin) {
      audioManager.playSFX(AUDIO.SFX.AIRHORN);
    } else {
      audioManager.playSFX(AUDIO.SFX.TROMBONE);
    }

    // Check if this is a new high score (unless already entered on previous visit)
    const leaderboard = this.getLeaderboard();
    this.isNewHighScore = !this.highScoreAlreadyEntered && this.checkIsHighScore(this.finalScore, leaderboard);

    // Keep the level background (don't change it) - just set transparent camera
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');

    // Create semi-transparent overlay
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.85
    );
    this.panelElements.push(overlay);

    // Calculate vertical layout
    const centerX = GAME_WIDTH / 2;
    let currentY = 70;

    // 1. Title with glow effect
    currentY = this.createTitle(centerX, currentY);

    // 2. Score panel
    currentY = this.createScorePanel(centerX, currentY, STAGGER_DELAY);

    // 3. Currency panel
    currentY = this.createCurrencyPanel(centerX, currentY, STAGGER_DELAY * 2);

    // 4. Leaderboard panel (or high score entry)
    if (this.isNewHighScore) {
      currentY = this.createHighScoreEntryPanel(centerX, currentY, leaderboard, STAGGER_DELAY * 3);
    } else {
      currentY = this.createLeaderboardPanel(centerX, currentY, leaderboard, STAGGER_DELAY * 3);
    }

    // 5. Action buttons
    this.createActionButtons(centerX, currentY + PANEL_GAP, STAGGER_DELAY * 4);

    // Add decorative particles
    this.createParticles();
  }

  private createTitle(x: number, y: number): number {
    const titleText = this.isWin ? 'YOU WIN!' : 'GAME OVER';
    const titleColor = this.isWin ? '#4ade80' : '#ff6b6b';
    const glowColor = this.isWin ? 0x4ade80 : 0xff6b6b;

    // Single text object with shader-based glow
    const title = this.add.text(x, y, titleText, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '52px',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.panelElements.push(title);

    // Apply GPU-accelerated glow effect
    const glowEffect = title.postFX.addGlow(glowColor, 4, 0, false, 0.1, 24);

    // Entrance animation
    title.setScale(0);
    this.tweens.add({
      targets: title,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Animated glow pulse (much smoother than scaling text layers)
    this.tweens.add({
      targets: glowEffect,
      outerStrength: { from: 4, to: 8 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return y + 70;
  }

  private createScorePanel(x: number, topY: number, delay: number): number {
    const panelHeight = 90;
    const centerY = topY + panelHeight / 2;
    this.createPanel(x, centerY, PANEL_WIDTH, panelHeight, delay);

    // Label
    const label = this.add.text(x, centerY - 15, 'FINAL SCORE', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5).setAlpha(0);
    this.panelElements.push(label);

    // Score value with count-up
    const scoreText = this.add.text(x, centerY + 18, '0', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '42px',
      color: '#ffd93d',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);
    this.panelElements.push(scoreText);

    // Animate panel contents
    this.time.delayedCall(delay + PANEL_ANIM_DURATION * 0.5, () => {
      this.tweens.add({
        targets: [label, scoreText],
        alpha: 1,
        duration: 200,
      });

      // Count up score
      this.tweens.addCounter({
        from: 0,
        to: this.finalScore,
        duration: 1200,
        ease: 'Power2',
        onUpdate: (tween) => {
          const value = tween.getValue();
          if (value !== null) {
            scoreText.setText(Math.floor(value).toLocaleString());
          }
        },
      });
    });

    return topY + panelHeight + PANEL_GAP;
  }

  private createCurrencyPanel(x: number, topY: number, delay: number): number {
    const panelHeight = 115;
    const centerY = topY + panelHeight / 2;
    this.createPanel(x, centerY, PANEL_WIDTH, panelHeight, delay);

    // Earned label
    const earnedLabel = this.add.text(x, centerY - 30, 'COINS EARNED', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5).setAlpha(0);
    this.panelElements.push(earnedLabel);

    // Earned amount (green, prominent)
    const earnedText = this.add.text(x, centerY - 5, '+0', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '32px',
      color: '#4ade80',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);
    this.panelElements.push(earnedText);

    // Divider line
    const divider = this.add.rectangle(x, centerY + 22, PANEL_WIDTH - 60, 1, 0x444444).setAlpha(0);
    this.panelElements.push(divider);

    // Total label and value
    const totalText = this.add.text(x, centerY + 40, 'Total: 0', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5).setAlpha(0);
    this.panelElements.push(totalText);

    // Animate panel contents
    this.time.delayedCall(delay + PANEL_ANIM_DURATION * 0.5, () => {
      this.tweens.add({
        targets: [earnedLabel, earnedText, divider, totalText],
        alpha: 1,
        duration: 200,
      });

      // Count up earned currency
      this.tweens.addCounter({
        from: 0,
        to: this.currencyEarned,
        duration: 1000,
        ease: 'Power2',
        onUpdate: (tween) => {
          const value = tween.getValue();
          if (value !== null) {
            earnedText.setText(`+${Math.floor(value)}`);
          }
        },
        onComplete: () => {
          // Pulse on complete
          this.tweens.add({
            targets: earnedText,
            scale: { from: 1, to: 1.15 },
            yoyo: true,
            duration: 150,
          });
        },
      });

      // Count up total (from previous to new)
      const previousTotal = this.totalCurrency - this.currencyEarned;
      this.time.delayedCall(600, () => {
        this.tweens.addCounter({
          from: previousTotal,
          to: this.totalCurrency,
          duration: 500,
          ease: 'Power2',
          onUpdate: (tween) => {
            const value = tween.getValue();
            if (value !== null) {
              totalText.setText(`Total: ${Math.floor(value).toLocaleString()}`);
            }
          },
        });
      });
    });

    return topY + panelHeight + PANEL_GAP;
  }

  private createLeaderboardPanel(
    x: number,
    topY: number,
    leaderboard: HighScoreEntry[],
    delay: number
  ): number {
    const entryHeight = 28;
    const headerHeight = 35;
    const panelHeight = headerHeight + Math.max(leaderboard.length, 1) * entryHeight + PANEL_PADDING;
    const centerY = topY + panelHeight / 2;
    this.createPanel(x, centerY, PANEL_WIDTH, panelHeight, delay);

    // Header
    const header = this.add.text(x, topY + 20, 'LEADERBOARD', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#a78bfa',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.panelElements.push(header);

    const startY = topY + headerHeight + 10;

    // Animate header
    this.time.delayedCall(delay + PANEL_ANIM_DURATION * 0.5, () => {
      this.tweens.add({
        targets: header,
        alpha: 1,
        duration: 200,
      });
    });

    if (leaderboard.length === 0) {
      const noScores = this.add.text(x, startY + 20, 'No scores yet!', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#666666',
        fontStyle: 'italic',
      }).setOrigin(0.5).setAlpha(0);
      this.panelElements.push(noScores);

      this.time.delayedCall(delay + PANEL_ANIM_DURATION * 0.7, () => {
        this.tweens.add({
          targets: noScores,
          alpha: 1,
          duration: 200,
        });
      });
    } else {
      leaderboard.forEach((entry, index) => {
        const entryY = startY + index * entryHeight;
        const isCurrentScore = entry.score === this.finalScore;
        const textColor = isCurrentScore ? '#ffd93d' : '#ffffff';
        const rankColor = isCurrentScore ? '#ffd93d' : '#666666';

        // Rank
        const rank = this.add.text(x - 120, entryY, `${index + 1}.`, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: rankColor,
          fontStyle: 'bold',
        }).setOrigin(0, 0.5).setAlpha(0);
        this.panelElements.push(rank);

        // Initials
        const initials = this.add.text(x - 80, entryY, entry.initials, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: textColor,
          fontStyle: 'bold',
        }).setOrigin(0, 0.5).setAlpha(0);
        this.panelElements.push(initials);

        // Score
        const score = this.add.text(x + 120, entryY, entry.score.toLocaleString(), {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: textColor,
        }).setOrigin(1, 0.5).setAlpha(0);
        this.panelElements.push(score);

        // Stagger entry animations
        this.time.delayedCall(delay + PANEL_ANIM_DURATION * 0.5 + index * 50, () => {
          this.tweens.add({
            targets: [rank, initials, score],
            alpha: 1,
            y: { from: entryY + 10, to: entryY },
            duration: 250,
            ease: 'Back.easeOut',
          });
        });
      });
    }

    return topY + panelHeight + PANEL_GAP;
  }

  private createHighScoreEntryPanel(
    x: number,
    topY: number,
    _leaderboard: HighScoreEntry[],
    delay: number
  ): number {
    // Store position for later replacement with leaderboard
    this.leaderboardPanelY = topY;

    const panelHeight = 180;
    const centerY = topY + panelHeight / 2;
    const panel = this.createPanel(x, centerY, PANEL_WIDTH, panelHeight, delay);
    this.highScoreEntryElements.push(panel);

    // New high score announcement
    const announcement = this.add.text(x, centerY - 55, 'NEW HIGH SCORE!', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '22px',
      color: '#ff69b4',
    }).setOrigin(0.5).setAlpha(0);
    this.panelElements.push(announcement);
    this.highScoreEntryElements.push(announcement);

    // Flash animation for announcement
    this.time.delayedCall(delay + PANEL_ANIM_DURATION * 0.5, () => {
      this.tweens.add({
        targets: announcement,
        alpha: 1,
        duration: 200,
      });

      this.tweens.add({
        targets: announcement,
        alpha: { from: 1, to: 0.6 },
        duration: 400,
        yoyo: true,
        repeat: -1,
      });
    });

    // Enter initials prompt
    const prompt = this.add.text(x, centerY - 20, 'Enter your initials:', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5).setAlpha(0);
    this.panelElements.push(prompt);
    this.highScoreEntryElements.push(prompt);

    // Initial boxes and text
    const boxWidth = 50;
    const boxSpacing = 12;
    const totalWidth = 3 * boxWidth + 2 * boxSpacing;
    const startBoxX = x - totalWidth / 2 + boxWidth / 2;

    this.initialsTexts = [];
    for (let i = 0; i < 3; i++) {
      const boxX = startBoxX + i * (boxWidth + boxSpacing);
      const box = this.add.rectangle(
        boxX,
        centerY + 25,
        boxWidth,
        55,
        0x2d2d44
      ).setStrokeStyle(2, 0x8b5cf6).setAlpha(0);
      this.panelElements.push(box);
      this.highScoreEntryElements.push(box);

      // Individual text for each initial slot
      const charText = this.add.text(boxX, centerY + 25, '_', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '32px',
        color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0);
      this.initialsTexts.push(charText);
      this.panelElements.push(charText);
      this.highScoreEntryElements.push(charText);
    }

    // Instructions
    const instructions = this.add.text(x, centerY + 70, 'Type 3 letters, then press ENTER', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5).setAlpha(0);
    this.panelElements.push(instructions);
    this.highScoreEntryElements.push(instructions);

    // Animate contents
    this.time.delayedCall(delay + PANEL_ANIM_DURATION * 0.5, () => {
      this.tweens.add({
        targets: [prompt, ...this.initialsTexts, instructions],
        alpha: 1,
        duration: 200,
      });

      // Fade in boxes
      const boxes = this.highScoreEntryElements.filter(
        (el) => el instanceof Phaser.GameObjects.Rectangle && (el as Phaser.GameObjects.Rectangle).fillColor === 0x2d2d44
      );
      this.tweens.add({
        targets: boxes,
        alpha: 1,
        duration: 200,
      });
    });

    // Blinking cursor
    this.cursorBlink = this.time.addEvent({
      delay: 500,
      callback: this.blinkCursor,
      callbackScope: this,
      loop: true,
    });

    // Keyboard input
    this.input.keyboard?.on('keydown', this.handleKeyInput, this);

    return topY + panelHeight + PANEL_GAP;
  }

  private createPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    delay: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(PANEL_BG, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, PANEL_RADIUS);
    bg.lineStyle(2, PANEL_BORDER, 0.8);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, PANEL_RADIUS);
    container.add(bg);

    // Initial state for animation
    container.setAlpha(0);
    container.setY(y + 30);

    // Animate entrance
    this.tweens.add({
      targets: container,
      y: y,
      alpha: 1,
      duration: PANEL_ANIM_DURATION,
      ease: 'Back.easeOut',
      delay: delay,
    });

    this.panelElements.push(container);
    return container;
  }

  private createActionButtons(x: number, y: number, delay: number): void {
    const buttonWidth = 140;
    const buttonHeight = 45;
    const buttonGap = 20;

    // Play Again button
    const playAgainBtn = this.createButton(
      x - buttonWidth / 2 - buttonGap / 2,
      y,
      buttonWidth,
      buttonHeight,
      'PLAY AGAIN',
      COLORS.PADDLE,
      () => this.startGameWithTransition()
    );

    // Menu button
    const menuBtn = this.createButton(
      x + buttonWidth / 2 + buttonGap / 2,
      y,
      buttonWidth,
      buttonHeight,
      'MENU',
      0x4a4a6a,
      () => this.goToMenuWithTransition()
    );

    // Animate buttons
    [playAgainBtn, menuBtn].forEach((btn, i) => {
      btn.setAlpha(0);
      btn.setY(y + 20);

      this.tweens.add({
        targets: btn,
        y: y,
        alpha: 1,
        duration: 300,
        ease: 'Back.easeOut',
        delay: delay + i * 80,
      });
    });

    // Delayed keyboard input
    this.time.delayedCall(1000, () => {
      this.input.keyboard?.on('keydown-SPACE', () => {
        if (!this.isTransitioning && (!this.isNewHighScore || this.currentInitials.length === 3)) {
          this.startGameWithTransition();
        }
      });
    });
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Glow layer
    const glow = this.add.rectangle(0, 0, width + 8, height + 8, color, 0.3);
    container.add(glow);
    glow.setVisible(false);

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    container.add(bg);

    // Button text
    const btnText = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(btnText);

    // Make interactive
    const hitArea = this.add.rectangle(0, 0, width, height, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      if (this.isTransitioning) return;
      glow.setVisible(true);
      container.setScale(1.05);
    });

    hitArea.on('pointerout', () => {
      if (this.isTransitioning) return;
      glow.setVisible(false);
      container.setScale(1);
    });

    hitArea.on('pointerdown', () => {
      if (this.isTransitioning) return;
      onClick();
    });

    this.panelElements.push(container);
    return container;
  }

  private blinkCursor(): void {
    if (this.initialsTexts.length === 0) return;

    const cursorPos = this.currentInitials.length;

    if (cursorPos < 3) {
      const cursorText = this.initialsTexts[cursorPos];
      // Toggle between underscore and empty for cursor blink
      const currentText = cursorText.text;
      cursorText.setText(currentText === '_' ? ' ' : '_');
    }
  }

  private handleKeyInput(event: KeyboardEvent): void {
    if (this.isTransitioning) return;

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
    for (let i = 0; i < 3; i++) {
      if (i < this.currentInitials.length) {
        this.initialsTexts[i].setText(this.currentInitials[i]);
      } else {
        this.initialsTexts[i].setText('_');
      }
    }
  }

  private submitHighScore(): void {
    this.input.keyboard?.off('keydown', this.handleKeyInput, this);
    if (this.cursorBlink) {
      this.cursorBlink.remove();
    }

    // Save to leaderboard
    const leaderboard = this.getLeaderboard();
    leaderboard.push({
      initials: this.currentInitials,
      score: this.finalScore,
    });

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.splice(MAX_LEADERBOARD_ENTRIES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));

    // Flash confirmation
    this.initialsTexts.forEach(text => text.setColor('#4ade80'));
    this.tweens.add({
      targets: this.initialsTexts,
      scale: 1.2,
      duration: 200,
      yoyo: true,
    });

    // Replace the high score entry panel with leaderboard
    this.time.delayedCall(500, () => {
      this.replaceHighScoreEntryWithLeaderboard();
    });
  }

  private replaceHighScoreEntryWithLeaderboard(): void {
    // Fade out and destroy high score entry elements
    this.tweens.add({
      targets: this.highScoreEntryElements,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        // Remove from panelElements array
        this.highScoreEntryElements.forEach(el => {
          const index = this.panelElements.indexOf(el);
          if (index > -1) {
            this.panelElements.splice(index, 1);
          }
          el.destroy();
        });
        this.highScoreEntryElements = [];
        this.initialsTexts = [];

        // Get updated leaderboard and create the panel
        const leaderboard = this.getLeaderboard();
        this.createLeaderboardPanel(
          GAME_WIDTH / 2,
          this.leaderboardPanelY,
          leaderboard,
          0 // No delay - show immediately
        );

        // Mark that high score was entered so isNewHighScore is false
        this.isNewHighScore = false;
      }
    });
  }

  private createParticles(): void {
    if (!this.isWin) return;

    // Confetti particles for win
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(50, GAME_WIDTH - 50);
      const y = Phaser.Math.Between(50, GAME_HEIGHT - 150);
      const colors = [0xff69b4, 0xffa500, 0x00bfff, 0xffd93d, 0x4ade80, 0xa78bfa];
      const color = Phaser.Utils.Array.GetRandom(colors);
      const size = Phaser.Math.Between(4, 10);

      const particle = this.add.rectangle(x, -30, size, size * 1.5, color, 0.9);
      particle.setRotation(Phaser.Math.DegToRad(Phaser.Math.Between(0, 360)));
      this.decorations.push(particle);

      // Fall animation
      this.tweens.add({
        targets: particle,
        y: y,
        rotation: particle.rotation + Phaser.Math.DegToRad(Phaser.Math.Between(-360, 360)),
        duration: Phaser.Math.Between(1500, 2500),
        ease: 'Bounce.easeOut',
        delay: Phaser.Math.Between(0, 800),
      });

      // Fade out
      this.tweens.add({
        targets: particle,
        alpha: 0,
        duration: 2000,
        delay: 3000,
      });
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

  private startGameWithTransition(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const transitionManager = TransitionManager.getInstance();
    transitionManager.init(this);

    const allElements = [...this.panelElements, ...this.decorations];

    transitionManager.transition(
      'menu-to-game',
      1,
      allElements,
      () => {
        this.scene.stop('UIScene');
        this.scene.stop();
        this.scene.start('GameScene');
      }
    );
  }

  private goToMenuWithTransition(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const audioManager = AudioManager.getInstance();
    audioManager.handleReturnToMenu();

    const transitionManager = TransitionManager.getInstance();
    transitionManager.init(this);

    const allElements = [...this.panelElements, ...this.decorations];

    transitionManager.transition(
      'game-over-to-menu',
      1,
      allElements,
      () => {
        this.scene.stop('UIScene');
        this.scene.stop();
        this.scene.start('MenuScene');
      }
    );
  }
}
