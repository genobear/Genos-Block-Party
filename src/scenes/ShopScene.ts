/**
 * ShopScene — Full-screen Party Shop UI
 *
 * Players browse and purchase cosmetic paddle skins and ball trails
 * using currency earned from gameplay.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { AudioManager } from '../systems/AudioManager';
import { CurrencyManager } from '../systems/CurrencyManager';
import { ShopManager } from '../systems/ShopManager';
import { UpgradeManager } from '../systems/UpgradeManager';
import { ITEM_TO_MILESTONE, MILESTONES } from '../systems/MilestoneSystem';
import {
  ShopCategory,
  type ShopItem,
  type BallTrailConfig,
  PADDLE_SKINS,
  BALL_TRAILS,
} from '../types/ShopTypes';
import { BackgroundManager } from '../systems/BackgroundManager';

export class ShopScene extends Phaser.Scene {
  private shopManager!: ShopManager;
  private currencyManager!: CurrencyManager;
  private audioManager!: AudioManager;

  private activeCategory: ShopCategory = ShopCategory.PADDLE_SKIN;
  private itemContainer!: Phaser.GameObjects.Container;
  private currencyText!: Phaser.GameObjects.Text;
  private paddleTabBg!: Phaser.GameObjects.Rectangle;
  private trailTabBg!: Phaser.GameObjects.Rectangle;
  private upgradesTabBg!: Phaser.GameObjects.Rectangle;
  private paddleTabText!: Phaser.GameObjects.Text;
  private trailTabText!: Phaser.GameObjects.Text;
  private upgradesTabText!: Phaser.GameObjects.Text;

  // Feedback overlay elements
  private feedbackOverlay: Phaser.GameObjects.Rectangle | null = null;
  private feedbackContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('ShopScene');
  }

  create(): void {
    this.shopManager = ShopManager.getInstance();
    this.currencyManager = CurrencyManager.getInstance();
    this.audioManager = AudioManager.getInstance();
    this.audioManager.init(this);

    // Transparent so CSS background shows
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)');
    BackgroundManager.setLevelBackground(1);

    // Dim backdrop
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

    const centerX = GAME_WIDTH / 2;

    // Title
    this.add.text(centerX, 60, 'PARTY SHOP', {
      font: 'bold 48px Arial',
      color: '#daa520',
    }).setOrigin(0.5);

    // Currency display using HD coin sprite
    const coinIcon = this.add.image(GAME_WIDTH - 130, 60, 'ui-coin');
    coinIcon.setDisplaySize(24, 24);

    this.currencyText = this.add.text(GAME_WIDTH - 100, 60, `${this.currencyManager.getTotalCurrency()}`, {
      font: 'bold 24px Arial',
      color: '#ffd700',
    }).setOrigin(0, 0.5);

    // Category tabs (3 tabs)
    const tabY = 130;
    const tabWidth = 145;
    const tabHeight = 44;
    const tabGap = 12;
    const totalTabWidth = tabWidth * 3 + tabGap * 2;
    const tabStartX = centerX - totalTabWidth / 2 + tabWidth / 2;

    this.paddleTabBg = this.add.rectangle(tabStartX, tabY, tabWidth, tabHeight, 0x8b5cf6)
      .setInteractive({ useHandCursor: true });
    this.paddleTabText = this.add.text(tabStartX, tabY, 'PADDLES', {
      font: 'bold 16px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.trailTabBg = this.add.rectangle(tabStartX + tabWidth + tabGap, tabY, tabWidth, tabHeight, 0x444444)
      .setInteractive({ useHandCursor: true });
    this.trailTabText = this.add.text(tabStartX + tabWidth + tabGap, tabY, 'TRAILS', {
      font: 'bold 16px Arial',
      color: '#999999',
    }).setOrigin(0.5);

    this.upgradesTabBg = this.add.rectangle(tabStartX + (tabWidth + tabGap) * 2, tabY, tabWidth, tabHeight, 0x444444)
      .setInteractive({ useHandCursor: true });
    this.upgradesTabText = this.add.text(tabStartX + (tabWidth + tabGap) * 2, tabY, 'UPGRADES', {
      font: 'bold 16px Arial',
      color: '#999999',
    }).setOrigin(0.5);

    this.paddleTabBg.on('pointerdown', () => this.switchCategory(ShopCategory.PADDLE_SKIN));
    this.trailTabBg.on('pointerdown', () => this.switchCategory(ShopCategory.BALL_TRAIL));
    this.upgradesTabBg.on('pointerdown', () => this.switchCategory(ShopCategory.UPGRADE));

    // Item container (scrollable area placeholder)
    this.itemContainer = this.add.container(0, 0);

    // Back button
    const backBg = this.add.rectangle(centerX, GAME_HEIGHT - 60, 180, 50, 0x555555)
      .setInteractive({ useHandCursor: true });
    const backText = this.add.text(centerX, GAME_HEIGHT - 60, '← BACK', {
      font: 'bold 22px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    backBg.on('pointerover', () => { backBg.setScale(1.05); backText.setScale(1.05); });
    backBg.on('pointerout', () => { backBg.setScale(1); backText.setScale(1); });
    backBg.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // Render initial category
    this.renderItems();
  }

  /**
   * Switch the displayed category tab
   */
  private switchCategory(category: ShopCategory): void {
    if (this.activeCategory === category) return;
    this.activeCategory = category;

    // Reset all tabs to inactive
    this.paddleTabBg.fillColor = 0x444444;
    this.paddleTabText.setColor('#999999');
    this.trailTabBg.fillColor = 0x444444;
    this.trailTabText.setColor('#999999');
    this.upgradesTabBg.fillColor = 0x444444;
    this.upgradesTabText.setColor('#999999');

    // Activate selected tab
    if (category === ShopCategory.PADDLE_SKIN) {
      this.paddleTabBg.fillColor = 0x8b5cf6;
      this.paddleTabText.setColor('#ffffff');
    } else if (category === ShopCategory.BALL_TRAIL) {
      this.trailTabBg.fillColor = 0x0088ff;
      this.trailTabText.setColor('#ffffff');
    } else if (category === ShopCategory.UPGRADE) {
      this.upgradesTabBg.fillColor = 0xdaa520;
      this.upgradesTabText.setColor('#ffffff');
    }

    this.renderItems();
  }

  /**
   * Render the item grid for the active category
   */
  private renderItems(): void {
    // Clear previous items
    this.itemContainer.removeAll(true);

    // Handle upgrades tab separately
    if (this.activeCategory === ShopCategory.UPGRADE) {
      this.renderUpgradeItems();
      return;
    }

    const items: ShopItem[] =
      this.activeCategory === ShopCategory.PADDLE_SKIN
        ? PADDLE_SKINS
        : BALL_TRAILS;

    const startY = 190;
    const cardWidth = 220;
    const cardHeight = 160;
    const cols = 3;
    const paddingX = 30;
    const paddingY = 20;

    const totalWidth = cols * cardWidth + (cols - 1) * paddingX;
    const offsetX = (GAME_WIDTH - totalWidth) / 2 + cardWidth / 2;

    items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = offsetX + col * (cardWidth + paddingX);
      const y = startY + row * (cardHeight + paddingY) + cardHeight / 2;

      this.createItemCard(item, x, y, cardWidth, cardHeight);
    });
  }

  /**
   * Create an individual item card
   */
  private createItemCard(
    item: ShopItem,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const isPurchased = this.shopManager.isPurchased(item.id);
    const isEquipped = this.shopManager.isEquipped(item.id);

    // Card background
    const borderColor = isEquipped ? 0xffd700 : isPurchased ? 0x666666 : 0x444444;
    const bgAlpha = isEquipped ? 0.95 : 0.85;

    const cardBg = this.add.rectangle(x, y, width, height, 0x1a1a2e, bgAlpha);
    cardBg.setStrokeStyle(2, borderColor);
    this.itemContainer.add(cardBg);

    // Preview visual
    if (item.category === ShopCategory.PADDLE_SKIN) {
      // Use the actual paddle skin sprite asset
      const preview = this.add.image(x, y - 35, 'paddle-skin-' + item.id);
      preview.setDisplaySize(80, 20);
      this.itemContainer.add(preview);
    } else {
      // Ball trail preview — ball sprite with trail color dots
      const trail = item as BallTrailConfig;
      if (trail.colors.length > 0) {
        // Trail dots behind the ball
        for (let i = 0; i < Math.min(trail.colors.length, 4); i++) {
          const dot = this.add.circle(
            x - 14 - i * 10,
            y - 35,
            5 - i,
            trail.colors[i],
            0.8 - i * 0.15,
          );
          this.itemContainer.add(dot);
        }
        // Ball sprite in front
        const ballPreview = this.add.image(x, y - 35, 'ball');
        ballPreview.setDisplaySize(16, 16);
        this.itemContainer.add(ballPreview);
      } else {
        // Default "none" — just show the ball sprite
        const ballPreview = this.add.image(x, y - 35, 'ball');
        ballPreview.setDisplaySize(16, 16);
        ballPreview.setAlpha(0.5);
        this.itemContainer.add(ballPreview);
        const noText = this.add.text(x, y - 20, '(no trail)', {
          font: '10px Arial',
          color: '#666666',
        }).setOrigin(0.5);
        this.itemContainer.add(noText);
      }
    }

    // Item name
    const nameText = this.add.text(x, y + 10, item.name, {
      font: 'bold 16px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.itemContainer.add(nameText);

    // Status / price / button
    if (isEquipped) {
      const equippedLabel = this.add.text(x, y + 38, '✓ EQUIPPED', {
        font: 'bold 14px Arial',
        color: '#ffd700',
      }).setOrigin(0.5);
      this.itemContainer.add(equippedLabel);
    } else if (isPurchased) {
      // Equip button
      const equipBg = this.add.rectangle(x, y + 38, 100, 30, 0x3d8b3d)
        .setInteractive({ useHandCursor: true });
      const equipText = this.add.text(x, y + 38, 'EQUIP', {
        font: 'bold 14px Arial',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.itemContainer.add(equipBg);
      this.itemContainer.add(equipText);

      equipBg.on('pointerover', () => equipBg.setFillStyle(0x4a9e4a));
      equipBg.on('pointerout', () => equipBg.setFillStyle(0x3d8b3d));
      equipBg.on('pointerdown', () => this.equipItem(item));
    } else if (item.price < 0) {
      // Milestone-locked item
      const milestoneId = ITEM_TO_MILESTONE[item.id];
      const milestone = MILESTONES.find(m => m.id === milestoneId);
      const milestoneName = milestone?.name || 'Milestone';
      
      const lockedText = this.add.text(x, y + 38, `🔒 ${milestoneName}`, {
        font: '12px Arial',
        color: '#888888',
      }).setOrigin(0.5);
      this.itemContainer.add(lockedText);
    } else if (item.price === 0) {
      // Free item that's not purchased yet (shouldn't happen for default, but just in case)
      const freeBg = this.add.rectangle(x, y + 38, 100, 30, 0x3d8b3d)
        .setInteractive({ useHandCursor: true });
      const freeText = this.add.text(x, y + 38, 'FREE', {
        font: 'bold 14px Arial',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.itemContainer.add(freeBg);
      this.itemContainer.add(freeText);

      freeBg.on('pointerdown', () => this.tryBuy(item));
    } else {
      // Buy button with price
      const canAfford = this.currencyManager.canAfford(item.price);
      const btnColor = canAfford ? 0xdaa520 : 0x664400;

      const buyBg = this.add.rectangle(x, y + 38, 120, 30, btnColor)
        .setInteractive({ useHandCursor: true });
      const buyText = this.add.text(x, y + 38, `¢${item.price} — BUY`, {
        font: 'bold 13px Arial',
        color: canAfford ? '#ffffff' : '#999999',
      }).setOrigin(0.5);
      this.itemContainer.add(buyBg);
      this.itemContainer.add(buyText);

      buyBg.on('pointerover', () => {
        if (canAfford) buyBg.setFillStyle(0xeebb33);
      });
      buyBg.on('pointerout', () => buyBg.setFillStyle(btnColor));
      buyBg.on('pointerdown', () => this.showBuyConfirmation(item));
    }

    // Description
    const descText = this.add.text(x, y + 62, item.description, {
      font: '11px Arial',
      color: '#888888',
    }).setOrigin(0.5);
    this.itemContainer.add(descText);
  }

  /**
   * Render the upgrades tab content
   */
  private renderUpgradeItems(): void {
    const upgradeManager = UpgradeManager.getInstance();
    const tier = upgradeManager.getRemixBoostTier();
    const bonus = upgradeManager.getRemixBoostBonus();
    const nextCost = upgradeManager.getNextRemixBoostCost();
    const isMaxed = upgradeManager.isRemixBoostMaxed();

    // Card at center
    const cardX = GAME_WIDTH / 2;
    const cardY = 300;
    const cardW = 280;
    const cardH = 220;

    // Background
    const cardBg = this.add.rectangle(cardX, cardY, cardW, cardH, 0x1a1a2e, 0.9);
    cardBg.setStrokeStyle(2, isMaxed ? 0xffd700 : 0x444444);
    this.itemContainer.add(cardBg);

    // Icon/emoji
    const icon = this.add.text(cardX, cardY - 70, '🎵', { font: '48px Arial' }).setOrigin(0.5);
    this.itemContainer.add(icon);

    // Title
    const title = this.add.text(cardX, cardY - 25, 'REMIX BOOST', {
      font: 'bold 22px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.itemContainer.add(title);

    // Stars showing tier (★ = filled, ☆ = empty)
    const stars = '★'.repeat(tier) + '☆'.repeat(3 - tier);
    const starsText = this.add.text(cardX, cardY + 10, stars, {
      font: '28px Arial',
      color: '#ffd700',
    }).setOrigin(0.5);
    this.itemContainer.add(starsText);

    // Current bonus
    const bonusPercent = Math.round(bonus * 100);
    const bonusText = this.add.text(cardX, cardY + 45,
      bonusPercent > 0 ? `+${bonusPercent}% Drop Rate` : 'No Bonus', {
        font: '18px Arial',
        color: bonusPercent > 0 ? '#00ff88' : '#888888',
      }).setOrigin(0.5);
    this.itemContainer.add(bonusText);

    // Buy button or MAXED label
    if (isMaxed) {
      const maxedLabel = this.add.text(cardX, cardY + 85, '✓ MAXED', {
        font: 'bold 18px Arial',
        color: '#ffd700',
      }).setOrigin(0.5);
      this.itemContainer.add(maxedLabel);
    } else {
      const canAfford = this.currencyManager.canAfford(nextCost!);
      const btnColor = canAfford ? 0xdaa520 : 0x664400;

      const buyBg = this.add.rectangle(cardX, cardY + 85, 160, 40, btnColor)
        .setInteractive({ useHandCursor: true });
      const buyText = this.add.text(cardX, cardY + 85, `¢${nextCost} — UPGRADE`, {
        font: 'bold 15px Arial',
        color: canAfford ? '#ffffff' : '#999999',
      }).setOrigin(0.5);
      this.itemContainer.add(buyBg);
      this.itemContainer.add(buyText);

      buyBg.on('pointerover', () => { if (canAfford) buyBg.setFillStyle(0xeebb33); });
      buyBg.on('pointerout', () => buyBg.setFillStyle(btnColor));
      buyBg.on('pointerdown', () => this.tryUpgradeRemixBoost());
    }

    // Description
    const desc = this.add.text(cardX, cardY + 125, 'Increases power-up drop chance', {
      font: '13px Arial',
      color: '#888888',
    }).setOrigin(0.5);
    this.itemContainer.add(desc);
  }

  /**
   * Attempt to upgrade Remix Boost
   */
  private tryUpgradeRemixBoost(): void {
    const upgradeManager = UpgradeManager.getInstance();
    const success = upgradeManager.upgradeRemixBoost();
    if (success) {
      this.audioManager.playSFX('sfx-chime');
      this.updateCurrencyDisplay();
      this.showSuccessFeedback('Remix Boost');
      this.time.delayedCall(600, () => this.renderItems());
    } else {
      this.showFailFeedback();
    }
  }

  /**
   * Show a buy confirmation popup
   */
  private showBuyConfirmation(item: ShopItem): void {
    // Dismiss any existing feedback
    this.dismissFeedback();

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Overlay
    this.feedbackOverlay = this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5)
      .setInteractive(); // Block clicks behind
    this.feedbackOverlay.setDepth(100);

    this.feedbackContainer = this.add.container(0, 0).setDepth(101);

    // Panel
    const panel = this.add.rectangle(centerX, centerY, 300, 180, 0x1a1a2e, 0.98);
    panel.setStrokeStyle(2, 0xdaa520);
    this.feedbackContainer.add(panel);

    // Title
    const title = this.add.text(centerX, centerY - 55, `Buy ${item.name}?`, {
      font: 'bold 22px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.feedbackContainer.add(title);

    // Price
    const canAfford = this.currencyManager.canAfford(item.price);
    const priceColor = canAfford ? '#ffd700' : '#ff4444';
    const priceText = this.add.text(centerX, centerY - 15, `Cost: ¢${item.price}`, {
      font: 'bold 18px Arial',
      color: priceColor,
    }).setOrigin(0.5);
    this.feedbackContainer.add(priceText);

    const balanceText = this.add.text(centerX, centerY + 10, `Balance: ¢${this.currencyManager.getTotalCurrency()}`, {
      font: '14px Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.feedbackContainer.add(balanceText);

    // Buttons
    if (canAfford) {
      const confirmBg = this.add.rectangle(centerX - 60, centerY + 55, 100, 36, 0xdaa520)
        .setInteractive({ useHandCursor: true });
      const confirmText = this.add.text(centerX - 60, centerY + 55, 'BUY!', {
        font: 'bold 16px Arial',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.feedbackContainer.add(confirmBg);
      this.feedbackContainer.add(confirmText);

      confirmBg.on('pointerdown', () => {
        this.dismissFeedback();
        this.tryBuy(item);
      });
    }

    const cancelBg = this.add.rectangle(canAfford ? centerX + 60 : centerX, centerY + 55, 100, 36, 0x555555)
      .setInteractive({ useHandCursor: true });
    const cancelText = this.add.text(canAfford ? centerX + 60 : centerX, centerY + 55, 'CANCEL', {
      font: 'bold 16px Arial',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.feedbackContainer.add(cancelBg);
    this.feedbackContainer.add(cancelText);

    cancelBg.on('pointerdown', () => this.dismissFeedback());
  }

  /**
   * Attempt to buy an item
   */
  private tryBuy(item: ShopItem): void {
    const success = this.shopManager.purchase(item);
    if (success) {
      // Success feedback
      this.audioManager.playSFX('sfx-chime');
      this.updateCurrencyDisplay();
      this.showSuccessFeedback(item.name);
      // Refresh after a short delay
      this.time.delayedCall(600, () => this.renderItems());
    } else {
      // Fail feedback
      this.showFailFeedback();
    }
  }

  /**
   * Equip an item
   */
  private equipItem(item: ShopItem): void {
    this.shopManager.equip(item.id, item.category);
    this.audioManager.playSFX('sfx-bounce');
    this.renderItems();
  }

  /**
   * Show success animation
   */
  private showSuccessFeedback(itemName: string): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const text = this.add.text(centerX, centerY, `✓ ${itemName} PURCHASED!`, {
      font: 'bold 24px Arial',
      color: '#00ff88',
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: text,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 1, to: 0 },
      y: centerY - 60,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Show failure animation
   */
  private showFailFeedback(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const text = this.add.text(centerX, centerY, 'NOT ENOUGH COINS!', {
      font: 'bold 22px Arial',
      color: '#ff4444',
    }).setOrigin(0.5).setDepth(200);

    // Shake
    this.tweens.add({
      targets: text,
      x: { from: centerX - 10, to: centerX + 10 },
      duration: 50,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          duration: 400,
          delay: 300,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  /**
   * Dismiss feedback overlay
   */
  private dismissFeedback(): void {
    if (this.feedbackOverlay) {
      this.feedbackOverlay.destroy();
      this.feedbackOverlay = null;
    }
    if (this.feedbackContainer) {
      this.feedbackContainer.destroy(true);
      this.feedbackContainer = null;
    }
  }

  /**
   * Update the currency display text
   */
  private updateCurrencyDisplay(): void {
    this.currencyText.setText(`${this.currencyManager.getTotalCurrency()}`);
  }
}
