import Phaser from 'phaser';
import { BrickType, BRICK_DROP_CHANCES } from '../types/BrickTypes';
import { BRICK_WIDTH, BRICK_HEIGHT, SCORE_VALUES } from '../config/Constants';

// Debug value stored on window to survive HMR
declare global {
  interface Window {
    __debugDropChance?: number | null;
    __powerBallActive?: boolean;
    __debugShowDropChance?: boolean;
  }
}

export class Brick extends Phaser.Physics.Arcade.Sprite {
  // Debug: override drop chance (null = use default from Constants)
  // Stored on window to survive Vite HMR reloads
  static get debugDropChance(): number | null {
    return window.__debugDropChance ?? null;
  }
  static set debugDropChance(value: number | null) {
    window.__debugDropChance = value;
  }

  // Power Ball active state (doubles drop chance)
  static get powerBallActive(): boolean {
    return window.__powerBallActive ?? false;
  }
  static set powerBallActive(value: boolean) {
    window.__powerBallActive = value;
  }

  // Debug: show drop chance overlay on bricks
  static get debugShowDropChance(): boolean {
    return window.__debugShowDropChance ?? false;
  }
  static set debugShowDropChance(value: boolean) {
    window.__debugShowDropChance = value;
  }

  private health: number;
  private brickType: BrickType;
  private scoreValue: number;
  private dropChanceText: Phaser.GameObjects.Text | null = null;
  private lastPowerBallState: boolean = false;
  private lastDebugDropChance: number | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: BrickType,
    health: number
  ) {
    // Get the texture key based on type and health
    const textureKey = `brick-${type}-${health}`;

    super(scene, x, y, textureKey);

    this.brickType = type;
    this.health = health;

    // Set score value based on type
    switch (type) {
      case BrickType.PRESENT:
        this.scoreValue = SCORE_VALUES.PRESENT;
        break;
      case BrickType.PINATA:
        this.scoreValue = SCORE_VALUES.PINATA;
        break;
      case BrickType.BALLOON:
        this.scoreValue = SCORE_VALUES.BALLOON;
        break;
    }

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    // Set body size
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(BRICK_WIDTH, BRICK_HEIGHT);

    // Create debug drop chance text if enabled
    if (Brick.debugShowDropChance) {
      this.createDropChanceText();
    }
  }

  /**
   * Apply damage to brick. Returns true if brick is destroyed.
   * @param amount Damage amount (default 1)
   */
  takeDamage(amount: number = 1): boolean {
    this.health -= amount;

    if (this.health <= 0) {
      return true; // Brick destroyed
    }

    // Update texture to show damage
    this.updateTexture();

    // Play hit animation
    this.playHitAnimation();

    return false;
  }

  /**
   * Hit the brick (single damage). Returns true if destroyed.
   */
  hit(): boolean {
    return this.takeDamage(1);
  }

  /**
   * Get score value for this hit
   */
  getScoreValue(): number {
    return this.scoreValue;
  }

  /**
   * Get brick type
   */
  getType(): BrickType {
    return this.brickType;
  }

  /**
   * Get current health
   */
  getHealth(): number {
    return this.health;
  }

  /**
   * Check if brick should drop a power-up when destroyed.
   * Uses getDropChance() as single source of truth for the calculation.
   */
  shouldDropPowerUp(): boolean {
    return Math.random() < this.getDropChance();
  }

  /**
   * Get position for power-up drop
   */
  getPowerUpDropPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Update texture based on current health
   */
  private updateTexture(): void {
    const textureKey = `brick-${this.brickType}-${this.health}`;
    this.setTexture(textureKey);
  }

  /**
   * Play hit animation (quick shake/flash)
   */
  private playHitAnimation(): void {
    // Quick scale punch
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Flash white
    this.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      this.clearTint();
    });
  }

  /**
   * Play destruction animation
   */
  playDestroyAnimation(onComplete?: () => void): void {
    // Clean up debug text
    if (this.dropChanceText) {
      this.dropChanceText.destroy();
      this.dropChanceText = null;
    }

    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 150,
      ease: 'Back.easeIn',
      onComplete: () => {
        if (onComplete) onComplete();
        this.destroy();
      },
    });
  }

  /**
   * Get the current calculated drop chance (for debug display)
   */
  getDropChance(): number {
    // Debug override takes absolute precedence
    if (Brick.debugDropChance !== null) {
      return Brick.debugDropChance;
    }

    // Get base chance for this brick type
    let chance = BRICK_DROP_CHANCES[this.brickType];

    // Apply Power Ball multiplier if active (double, cap at 100%)
    if (Brick.powerBallActive) {
      chance = Math.min(chance * 2, 1);
    }

    return chance;
  }

  /**
   * Create debug text showing drop chance
   */
  private createDropChanceText(): void {
    const chance = this.getDropChance();
    const percentage = Math.round(chance * 100);

    this.dropChanceText = this.scene.add.text(this.x, this.y, `${percentage}%`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.dropChanceText.setOrigin(0.5);
    this.dropChanceText.setDepth(100);

    this.lastPowerBallState = Brick.powerBallActive;
    this.lastDebugDropChance = Brick.debugDropChance;

    // Color based on current state
    this.updateDropChanceTextColor();
  }

  /**
   * Update the color of the drop chance text based on active modifiers
   */
  private updateDropChanceTextColor(): void {
    if (!this.dropChanceText) return;

    if (Brick.debugDropChance !== null) {
      this.dropChanceText.setColor('#ff00ff'); // Magenta when debug override active
    } else if (Brick.powerBallActive) {
      this.dropChanceText.setColor('#ffff00'); // Yellow when Power Ball boosted
    } else {
      this.dropChanceText.setColor('#ffffff'); // White normally
    }
  }

  /**
   * Update debug text (call from scene update if debug mode is on)
   */
  updateDropChanceText(): void {
    // Create text if debug was just enabled
    if (Brick.debugShowDropChance && !this.dropChanceText) {
      this.createDropChanceText();
      return;
    }

    // Destroy text if debug was just disabled
    if (!Brick.debugShowDropChance && this.dropChanceText) {
      this.dropChanceText.destroy();
      this.dropChanceText = null;
      return;
    }

    // Update text if Power Ball state or debug override changed
    const powerBallChanged = Brick.powerBallActive !== this.lastPowerBallState;
    const debugChanged = Brick.debugDropChance !== this.lastDebugDropChance;

    if (this.dropChanceText && (powerBallChanged || debugChanged)) {
      const chance = this.getDropChance();
      const percentage = Math.round(chance * 100);
      this.dropChanceText.setText(`${percentage}%`);

      // Update color based on active modifiers
      this.updateDropChanceTextColor();

      this.lastPowerBallState = Brick.powerBallActive;
      this.lastDebugDropChance = Brick.debugDropChance;
    }
  }

  /**
   * Override destroy to clean up debug text
   */
  destroy(fromScene?: boolean): void {
    if (this.dropChanceText) {
      this.dropChanceText.destroy();
      this.dropChanceText = null;
    }
    super.destroy(fromScene);
  }
}
