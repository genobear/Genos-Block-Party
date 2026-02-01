import Phaser from 'phaser';
import { Brick } from '../objects/Brick';
import { AudioManager } from './AudioManager';
import {
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BRICK_COLS,
  BRICK_ROWS_START_Y,
  GAME_WIDTH,
  AUDIO,
} from '../config/Constants';

/**
 * ElectricArcSystem - Manages electric arc effects and AOE damage
 *
 * When Electric Ball hits a brick:
 * 1. Find adjacent bricks (N, S, E, W)
 * 2. Draw electricity arc to each adjacent brick
 * 3. After arc animation completes, deal damage to adjacent bricks
 */
export class ElectricArcSystem {
  private scene: Phaser.Scene;
  private bricks: Phaser.Physics.Arcade.StaticGroup;
  private audioManager: AudioManager;

  // Arc animation configuration
  private static readonly ARC_DURATION = 150; // ms for arc visual
  private static readonly DAMAGE_DELAY = 100; // ms after arc starts to apply damage

  // Grid offset calculation (cached)
  private offsetX: number;

  constructor(scene: Phaser.Scene, bricks: Phaser.Physics.Arcade.StaticGroup) {
    this.scene = scene;
    this.bricks = bricks;
    this.audioManager = AudioManager.getInstance();

    // Calculate horizontal offset for grid alignment
    const totalWidth = BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING;
    this.offsetX = (GAME_WIDTH - totalWidth) / 2 + BRICK_WIDTH / 2;
  }

  /**
   * Trigger AOE visual effects from source brick position
   * Returns array of adjacent bricks that will receive damage
   * Note: Actual damage application is handled by CollisionHandler
   */
  triggerAOE(sourceBrick: Brick): Brick[] {
    const adjacentBricks = this.findAdjacentBricks(sourceBrick);

    adjacentBricks.forEach((brick) => {
      // Create arc visual effect
      this.createArcEffect(sourceBrick, brick);
    });

    return adjacentBricks;
  }

  /**
   * Get the damage delay constant (for external timing)
   */
  static getDamageDelay(): number {
    return ElectricArcSystem.DAMAGE_DELAY;
  }

  /**
   * Find bricks adjacent to source (N, S, E, W only - not diagonal)
   */
  private findAdjacentBricks(source: Brick): Brick[] {
    const sourceGrid = this.worldToGrid(source.x, source.y);

    const offsets = [
      { dx: 0, dy: -1 }, // North
      { dx: 0, dy: 1 }, // South
      { dx: -1, dy: 0 }, // West
      { dx: 1, dy: 0 }, // East
    ];

    const adjacent: Brick[] = [];

    this.bricks.children.iterate((child) => {
      const brick = child as Brick;
      if (!brick || !brick.active || brick === source) return true;

      const brickGrid = this.worldToGrid(brick.x, brick.y);

      for (const offset of offsets) {
        if (
          brickGrid.x === sourceGrid.x + offset.dx &&
          brickGrid.y === sourceGrid.y + offset.dy
        ) {
          adjacent.push(brick);
          break;
        }
      }
      return true;
    });

    return adjacent;
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  private worldToGrid(worldX: number, worldY: number): { x: number; y: number } {
    const gridX = Math.round((worldX - this.offsetX) / (BRICK_WIDTH + BRICK_PADDING));
    const gridY = Math.round((worldY - BRICK_ROWS_START_Y) / (BRICK_HEIGHT + BRICK_PADDING));
    return { x: gridX, y: gridY };
  }

  /**
   * Create electricity arc visual effect between two brick positions
   */
  private createArcEffect(from: Brick, to: Brick): void {
    // Play zap sound
    this.audioManager.playSFX(AUDIO.SFX.ZAP);

    // Create the lightning bolt graphic
    const graphics = this.scene.add.graphics();
    graphics.setDepth(100); // Above bricks

    // Generate jagged lightning path
    const points = this.generateLightningPath(from.x, from.y, to.x, to.y);

    // Draw the bolt with glow effect
    // Outer glow (cyan)
    graphics.lineStyle(6, 0x00ffff, 0.3);
    this.drawPath(graphics, points);

    // Inner bright line (white)
    graphics.lineStyle(2, 0xffffff, 1);
    this.drawPath(graphics, points);

    // Add particle burst at impact point
    this.createImpactParticles(to.x, to.y);

    // Flash and fade animation
    this.scene.tweens.add({
      targets: graphics,
      alpha: { from: 1, to: 0 },
      duration: ElectricArcSystem.ARC_DURATION,
      ease: 'Quad.easeOut',
      onComplete: () => graphics.destroy(),
    });
  }

  /**
   * Generate a jagged lightning bolt path between two points
   */
  private generateLightningPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const segments = 5; // Number of jagged segments

    points.push({ x: x1, y: y1 });

    // Calculate perpendicular direction for jitter
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);

    // Perpendicular unit vector
    const perpX = -dy / len;
    const perpY = dx / len;

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const baseX = x1 + dx * t;
      const baseY = y1 + dy * t;

      // Add random perpendicular offset for "jaggedness"
      const offset = (Math.random() - 0.5) * 20; // +/- 10px jitter

      points.push({
        x: baseX + perpX * offset,
        y: baseY + perpY * offset,
      });
    }

    points.push({ x: x2, y: y2 });
    return points;
  }

  /**
   * Draw a path through the given points
   */
  private drawPath(
    graphics: Phaser.GameObjects.Graphics,
    points: { x: number; y: number }[]
  ): void {
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.strokePath();
  }

  /**
   * Create particle burst at impact point
   */
  private createImpactParticles(x: number, y: number): void {
    const particles = this.scene.add.particles(x, y, 'particle-electric', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 200,
      quantity: 8,
      tint: [0x00ffff, 0xffffff, 0xff00ff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });

    particles.explode();

    this.scene.time.delayedCall(300, () => particles.destroy());
  }
}
