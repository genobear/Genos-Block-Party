/**
 * AchievementScene — Full-screen Achievement Gallery display
 *
 * Shows all achievements with unlock status, progress bars, and coin rewards
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { BackgroundManager } from '../systems/BackgroundManager';
import {
  AchievementManager,
  ACHIEVEMENT_LIST,
  Achievement,
} from '../systems/AchievementManager';

export class AchievementScene extends Phaser.Scene {
  private scrollY: number = 0;
  private maxScroll: number = 0;
  private contentContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('AchievementScene');
  }

  create(): void {
    // Transparent so CSS background shows
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
    BackgroundManager.setLevelBackground(1);

    // Dim backdrop
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.85
    );

    const centerX = GAME_WIDTH / 2;

    // Title
    this.add
      .text(centerX, 50, '🏆 ACHIEVEMENTS', {
        font: 'bold 42px Arial',
        color: '#ffd700',
      })
      .setOrigin(0.5);

    // Achievement count subtitle
    const achievementManager = AchievementManager.getInstance();
    const unlockedCount = achievementManager.getUnlockedCount();
    const totalCount = achievementManager.getTotalCount();

    this.add
      .text(centerX, 95, `${unlockedCount} / ${totalCount} Unlocked`, {
        font: '18px Arial',
        color: unlockedCount === totalCount ? '#4ade80' : '#a78bfa',
      })
      .setOrigin(0.5);

    // Create scrollable content container
    this.contentContainer = this.add.container(0, 0);

    let yPos = 140;

    // Create achievement cards
    yPos = this.createAchievementsList(achievementManager, centerX, yPos);

    // Calculate max scroll
    this.maxScroll = Math.max(0, yPos - GAME_HEIGHT + 150);

    // Back button (fixed position, not in scroll container)
    const backBg = this.add
      .rectangle(centerX, GAME_HEIGHT - 50, 180, 50, 0x555555)
      .setInteractive({ useHandCursor: true });
    const backText = this.add
      .text(centerX, GAME_HEIGHT - 50, '← BACK', {
        font: 'bold 22px Arial',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    backBg.on('pointerover', () => {
      backBg.setScale(1.05);
      backText.setScale(1.05);
    });
    backBg.on('pointerout', () => {
      backBg.setScale(1);
      backText.setScale(1);
    });
    backBg.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // Scroll handling
    this.input.on('wheel', this.handleWheel, this);
  }

  private createAchievementsList(
    achievementManager: AchievementManager,
    centerX: number,
    startY: number
  ): number {
    let yPos = startY;
    const cardWidth = 380;
    const cardHeight = 90;

    for (const achievement of ACHIEVEMENT_LIST) {
      const isUnlocked = achievementManager.isUnlocked(achievement.id);
      const progress = achievementManager.getProgress(achievement.id);

      // Card background with glow effect for unlocked
      const cardBg = this.add.rectangle(
        centerX,
        yPos + cardHeight / 2,
        cardWidth,
        cardHeight,
        isUnlocked ? 0x1a4d1a : 0x1a1a2e,
        0.9
      );
      cardBg.setStrokeStyle(
        isUnlocked ? 3 : 2,
        isUnlocked ? 0x4ade80 : 0x444444
      );
      this.contentContainer.add(cardBg);

      // Status icon (checkmark or lock)
      const statusIcon = isUnlocked ? '✅' : '🔒';
      const iconText = this.add
        .text(centerX - cardWidth / 2 + 25, yPos + cardHeight / 2, statusIcon, {
          font: '28px Arial',
        })
        .setOrigin(0.5);
      this.contentContainer.add(iconText);

      // Achievement name
      const nameText = this.add
        .text(centerX - cardWidth / 2 + 55, yPos + 20, achievement.name, {
          font: 'bold 18px Arial',
          color: isUnlocked ? '#4ade80' : '#ffffff',
        })
        .setOrigin(0, 0.5);
      this.contentContainer.add(nameText);

      // Description
      const descText = this.add
        .text(centerX - cardWidth / 2 + 55, yPos + 45, achievement.description, {
          font: '13px Arial',
          color: '#888888',
        })
        .setOrigin(0, 0.5);
      this.contentContainer.add(descText);

      // Coin reward display
      const coinText = this.add
        .text(
          centerX + cardWidth / 2 - 15,
          yPos + 20,
          `🪙 ${achievement.coins}`,
          {
            font: 'bold 16px Arial',
            color: isUnlocked ? '#ffd700' : '#666666',
          }
        )
        .setOrigin(1, 0.5);
      this.contentContainer.add(coinText);

      // Progress bar (only show for non-flawless achievements that aren't unlocked)
      const isFlawlessAchievement = achievement.id.startsWith('flawless');
      if (!isUnlocked && !isFlawlessAchievement && achievement.threshold) {
        const barWidth = 120;
        const barHeight = 8;
        const barX = centerX + cardWidth / 2 - barWidth - 15;
        const barY = yPos + 55;

        // Background
        const barBg = this.add.rectangle(
          barX + barWidth / 2,
          barY,
          barWidth,
          barHeight,
          0x333333
        );
        this.contentContainer.add(barBg);

        // Fill based on progress
        const fillWidth = Math.max(2, (progress.percent / 100) * barWidth);
        const barFill = this.add.rectangle(
          barX + fillWidth / 2,
          barY,
          fillWidth,
          barHeight,
          0xffd700
        );
        this.contentContainer.add(barFill);

        // Progress text
        const progressText = this.add
          .text(
            barX + barWidth / 2,
            barY + 14,
            `${this.formatProgressNumber(progress.current)} / ${this.formatProgressNumber(progress.target)}`,
            {
              font: '10px Arial',
              color: '#888888',
            }
          )
          .setOrigin(0.5, 0);
        this.contentContainer.add(progressText);
      } else if (!isUnlocked && isFlawlessAchievement) {
        // For flawless achievements, show "No lives lost" hint
        const hintText = this.add
          .text(
            centerX + cardWidth / 2 - 15,
            yPos + 55,
            '❤️ No lives lost',
            {
              font: '11px Arial',
              color: '#666666',
            }
          )
          .setOrigin(1, 0.5);
        this.contentContainer.add(hintText);
      }

      // Achievement type badge
      const typeBadge = this.getTypeBadge(achievement);
      const badgeText = this.add
        .text(centerX - cardWidth / 2 + 55, yPos + 68, typeBadge, {
          font: '10px Arial',
          color: '#555555',
        })
        .setOrigin(0, 0.5);
      this.contentContainer.add(badgeText);

      yPos += cardHeight + 10;
    }

    return yPos;
  }

  private getTypeBadge(achievement: Achievement): string {
    switch (achievement.type) {
      case 'cumulative':
        return '📊 Lifetime';
      case 'session':
        return '🎮 Single Game';
      case 'skill':
        return '⭐ Skill';
      default:
        return '';
    }
  }

  private handleWheel(
    _pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number
  ): void {
    this.scrollY = Phaser.Math.Clamp(
      this.scrollY + deltaY * 0.5,
      0,
      this.maxScroll
    );
    this.contentContainer.setY(-this.scrollY);
  }

  private formatProgressNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }
}
