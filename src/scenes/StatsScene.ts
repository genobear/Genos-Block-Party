/**
 * StatsScene — Full-screen Lifetime Stats display
 *
 * Shows player's all-time statistics and milestone progress
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { BackgroundManager } from '../systems/BackgroundManager';
import { LifetimeStatsManager, LifetimeStats } from '../systems/LifetimeStatsManager';
import { MilestoneSystem, MILESTONES, Milestone } from '../systems/MilestoneSystem';

export class StatsScene extends Phaser.Scene {
  private scrollY: number = 0;
  private maxScroll: number = 0;
  private contentContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('StatsScene');
  }

  create(): void {
    // Transparent so CSS background shows
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
    BackgroundManager.setLevelBackground(1);

    // Dim backdrop
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);

    const centerX = GAME_WIDTH / 2;

    // Title
    this.add.text(centerX, 50, 'LIFETIME STATS', {
      font: 'bold 42px Arial',
      color: '#a78bfa',
    }).setOrigin(0.5);

    // Create scrollable content container
    this.contentContainer = this.add.container(0, 0);

    // Get stats
    const stats = LifetimeStatsManager.getInstance().getStats();
    const milestoneSystem = MilestoneSystem.getInstance();

    let yPos = 110;

    // Stats section
    yPos = this.createStatsSection(stats, centerX, yPos);

    // Spacing
    yPos += 30;

    // Milestones header
    const milestonesHeader = this.add.text(centerX, yPos, '— MILESTONES —', {
      font: 'bold 24px Arial',
      color: '#ffd700',
    }).setOrigin(0.5);
    this.contentContainer.add(milestonesHeader);
    yPos += 40;

    // Milestones
    yPos = this.createMilestonesSection(milestoneSystem, centerX, yPos);

    // Calculate max scroll
    this.maxScroll = Math.max(0, yPos - GAME_HEIGHT + 150);

    // Back button (fixed position, not in scroll container)
    const backBg = this.add.rectangle(centerX, GAME_HEIGHT - 50, 180, 50, 0x555555)
      .setInteractive({ useHandCursor: true });
    const backText = this.add.text(centerX, GAME_HEIGHT - 50, '← BACK', {
      font: 'bold 22px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

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

  private createStatsSection(stats: LifetimeStats, centerX: number, startY: number): number {
    let yPos = startY;
    const leftX = centerX - 150;
    const rightX = centerX + 150;

    // Create stat rows
    const statRows: { icon: string; label: string; value: string }[] = [
      { icon: '🧱', label: 'Bricks Destroyed', value: this.formatNumber(stats.totalBricksDestroyed) },
      { icon: '⚡', label: 'Power-Ups Collected', value: this.formatNumber(stats.totalPowerUpsCollected) },
      { icon: '🎮', label: 'Games Played', value: this.formatNumber(stats.gamesPlayed) },
      { icon: '⏱️', label: 'Time Played', value: this.formatTime(stats.totalPlayTimeMs) },
      { icon: '🔥', label: 'Highest Multiplier', value: `${stats.highestMultiplier.toFixed(1)}×` },
      { icon: '📊', label: 'Total Score', value: this.formatNumber(stats.totalScoreEarned) },
      { icon: '🏆', label: 'Highest Level', value: stats.highestLevel.toString() },
      { icon: '⭐', label: 'Perfect Games', value: stats.perfectGames.toString() },
    ];

    for (const row of statRows) {
      // Icon
      const iconText = this.add.text(leftX - 100, yPos, row.icon, {
        font: '24px Arial',
      }).setOrigin(0.5);
      this.contentContainer.add(iconText);

      // Label
      const labelText = this.add.text(leftX - 60, yPos, row.label, {
        font: '18px Arial',
        color: '#cccccc',
      }).setOrigin(0, 0.5);
      this.contentContainer.add(labelText);

      // Value
      const valueText = this.add.text(rightX + 80, yPos, row.value, {
        font: 'bold 20px Arial',
        color: '#ffffff',
      }).setOrigin(1, 0.5);
      this.contentContainer.add(valueText);

      yPos += 40;
    }

    return yPos;
  }

  private createMilestonesSection(milestoneSystem: MilestoneSystem, centerX: number, startY: number): number {
    let yPos = startY;
    const cardWidth = 340;
    const cardHeight = 80;

    for (const milestone of MILESTONES) {
      const isAchieved = milestoneSystem.isAchieved(milestone.id);
      const progress = milestoneSystem.getProgress(milestone.id);

      // Card background
      const cardBg = this.add.rectangle(
        centerX,
        yPos + cardHeight / 2,
        cardWidth,
        cardHeight,
        isAchieved ? 0x1a4d1a : 0x1a1a2e,
        0.9
      );
      cardBg.setStrokeStyle(2, isAchieved ? 0x4ade80 : 0x444444);
      this.contentContainer.add(cardBg);

      // Checkmark or lock icon
      const statusIcon = isAchieved ? '✅' : '🔒';
      const iconText = this.add.text(centerX - cardWidth / 2 + 25, yPos + cardHeight / 2, statusIcon, {
        font: '24px Arial',
      }).setOrigin(0.5);
      this.contentContainer.add(iconText);

      // Milestone name
      const nameText = this.add.text(centerX - cardWidth / 2 + 55, yPos + 18, milestone.name, {
        font: 'bold 16px Arial',
        color: isAchieved ? '#4ade80' : '#ffffff',
      }).setOrigin(0, 0.5);
      this.contentContainer.add(nameText);

      // Description
      const descText = this.add.text(centerX - cardWidth / 2 + 55, yPos + 40, milestone.description, {
        font: '12px Arial',
        color: '#888888',
      }).setOrigin(0, 0.5);
      this.contentContainer.add(descText);

      // Progress bar (only show if not achieved)
      if (!isAchieved) {
        const barWidth = 120;
        const barHeight = 8;
        const barX = centerX + cardWidth / 2 - barWidth - 15;
        const barY = yPos + 25;

        // Background
        const barBg = this.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x333333);
        this.contentContainer.add(barBg);

        // Fill
        const fillWidth = Math.max(2, (progress.percent / 100) * barWidth);
        const barFill = this.add.rectangle(
          barX + fillWidth / 2,
          barY,
          fillWidth,
          barHeight,
          0x8b5cf6
        );
        this.contentContainer.add(barFill);

        // Progress text
        const progressText = this.add.text(barX + barWidth / 2, barY + 15, 
          `${this.formatProgressNumber(progress.current)} / ${this.formatProgressNumber(progress.target)}`,
          {
            font: '10px Arial',
            color: '#888888',
          }
        ).setOrigin(0.5, 0);
        this.contentContainer.add(progressText);
      }

      // Reward preview
      const rewardLabel = this.getRewardLabel(milestone);
      const rewardText = this.add.text(centerX + cardWidth / 2 - 15, yPos + cardHeight - 15, 
        `🎁 ${rewardLabel}`,
        {
          font: '11px Arial',
          color: isAchieved ? '#ffd700' : '#666666',
        }
      ).setOrigin(1, 0.5);
      this.contentContainer.add(rewardText);

      yPos += cardHeight + 10;
    }

    return yPos;
  }

  private handleWheel(_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number): void {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, this.maxScroll);
    this.contentContainer.setY(-this.scrollY);
  }

  private formatNumber(num: number): string {
    return num.toLocaleString();
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

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private getRewardLabel(milestone: Milestone): string {
    const { type, id } = milestone.reward;
    const typeName = type === 'paddleSkin' ? 'Paddle' : type === 'ballTrail' ? 'Trail' : 'Title';
    // Capitalize first letter of id
    const itemName = id.charAt(0).toUpperCase() + id.slice(1);
    return `${itemName} ${typeName}`;
  }
}
