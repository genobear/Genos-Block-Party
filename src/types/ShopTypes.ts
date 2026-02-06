/**
 * Shop Types — Type definitions and item catalogs for the Party Shop
 */

export enum ShopCategory {
  PADDLE_SKIN = 'paddleSkin',
  BALL_TRAIL = 'ballTrail',
}

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  price: number; // 0 = free/default
  description: string;
}

export interface PaddleSkinConfig extends ShopItem {
  category: ShopCategory.PADDLE_SKIN;
  color: number;        // Main fill color
  accentColor: number;  // Accent circle color
  alpha?: number;       // For invisible skin
  borderColor?: number; // Optional border override
}

export interface BallTrailConfig extends ShopItem {
  category: ShopCategory.BALL_TRAIL;
  colors: number[];     // Particle tint colors
  blendMode: number;    // Phaser.BlendModes value
  speed: { min: number; max: number };
  scale: { start: number; end: number };
  alpha: { start: number; end: number };
  lifespan: number;
  frequency: number;
  quantity: number;
}

/**
 * Paddle Skins Catalog
 */
export const PADDLE_SKINS: PaddleSkinConfig[] = [
  {
    id: 'default',
    name: 'Default',
    category: ShopCategory.PADDLE_SKIN,
    price: 0,
    description: 'The classic purple paddle',
    color: 0x8b5cf6,
    accentColor: 0xa78bfa,
  },
  {
    id: 'neon',
    name: 'Neon',
    category: ShopCategory.PADDLE_SKIN,
    price: 50,
    description: 'Bright green neon glow',
    color: 0x00ff88,
    accentColor: 0x00ffcc,
  },
  {
    id: 'gold',
    name: 'Gold',
    category: ShopCategory.PADDLE_SKIN,
    price: 100,
    description: 'Pure gold luxury',
    color: 0xffd700,
    accentColor: 0xffed4a,
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    category: ShopCategory.PADDLE_SKIN,
    price: 200,
    description: 'Color-cycling rainbow paddle',
    color: 0xff0000,
    accentColor: 0xff69b4,
  },
  {
    id: 'invisible',
    name: 'Invisible',
    category: ShopCategory.PADDLE_SKIN,
    price: 300,
    description: 'Nearly invisible — flex only!',
    color: 0x333333,
    accentColor: 0x555555,
    alpha: 0.15,
  },
  // Milestone-exclusive paddle skins (price: -1 = milestone unlock only)
  {
    id: 'bash',
    name: 'Bash',
    category: ShopCategory.PADDLE_SKIN,
    price: -1,
    description: 'Brick Basher reward',
    color: 0xff4500,
    accentColor: 0xff6600,
  },
  {
    id: 'destroyer',
    name: 'Destroyer',
    category: ShopCategory.PADDLE_SKIN,
    price: -1,
    description: 'Demolition Expert reward',
    color: 0x1a0033,
    accentColor: 0x6600cc,
  },
  {
    id: 'master',
    name: 'Master',
    category: ShopCategory.PADDLE_SKIN,
    price: -1,
    description: 'Combo Master reward',
    color: 0xe5e4e2,
    accentColor: 0xc0c0c0,
  },
  {
    id: 'time',
    name: 'Time',
    category: ShopCategory.PADDLE_SKIN,
    price: -1,
    description: 'Endurance reward',
    color: 0x4169e1,
    accentColor: 0x87ceeb,
  },
];

/**
 * Ball Trails Catalog
 */
export const BALL_TRAILS: BallTrailConfig[] = [
  {
    id: 'default',
    name: 'None',
    category: ShopCategory.BALL_TRAIL,
    price: 0,
    description: 'No trail effect',
    colors: [],
    blendMode: 0, // NORMAL
    speed: { min: 0, max: 0 },
    scale: { start: 0, end: 0 },
    alpha: { start: 0, end: 0 },
    lifespan: 0,
    frequency: 0,
    quantity: 0,
  },
  {
    id: 'sparkle',
    name: 'Sparkle',
    category: ShopCategory.BALL_TRAIL,
    price: 75,
    description: 'Sparkling star trail',
    colors: [0xffffff, 0xffffaa, 0xffff00],
    blendMode: 1, // ADD
    speed: { min: 20, max: 60 },
    scale: { start: 0.4, end: 0 },
    alpha: { start: 0.8, end: 0 },
    lifespan: 400,
    frequency: 50,
    quantity: 1,
  },
  {
    id: 'fire',
    name: 'Fire',
    category: ShopCategory.BALL_TRAIL,
    price: 150,
    description: 'Orange flame trail',
    colors: [0xff4500, 0xff6600, 0xff8800],
    blendMode: 1, // ADD
    speed: { min: 10, max: 40 },
    scale: { start: 0.6, end: 0 },
    alpha: { start: 0.7, end: 0 },
    lifespan: 300,
    frequency: 30,
    quantity: 2,
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    category: ShopCategory.BALL_TRAIL,
    price: 250,
    description: 'Multi-color rainbow trail',
    colors: [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0xff00ff],
    blendMode: 1, // ADD
    speed: { min: 15, max: 50 },
    scale: { start: 0.5, end: 0 },
    alpha: { start: 0.75, end: 0 },
    lifespan: 350,
    frequency: 35,
    quantity: 2,
  },
  // Milestone-exclusive ball trails (price: -1 = milestone unlock only)
  {
    id: 'crusher',
    name: 'Crusher',
    category: ShopCategory.BALL_TRAIL,
    price: -1,
    description: 'Block Buster reward',
    colors: [0x8b4513, 0xa0522d, 0x6b4423],
    blendMode: 0, // NORMAL
    speed: { min: 30, max: 80 },
    scale: { start: 0.5, end: 0.1 },
    alpha: { start: 0.8, end: 0 },
    lifespan: 350,
    frequency: 40,
    quantity: 2,
  },
  {
    id: 'power',
    name: 'Power',
    category: ShopCategory.BALL_TRAIL,
    price: -1,
    description: 'Power Hungry reward',
    colors: [0x00bfff, 0x1e90ff, 0x4169e1],
    blendMode: 1, // ADD
    speed: { min: 20, max: 60 },
    scale: { start: 0.45, end: 0 },
    alpha: { start: 0.85, end: 0 },
    lifespan: 320,
    frequency: 35,
    quantity: 2,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    category: ShopCategory.BALL_TRAIL,
    price: -1,
    description: 'Party Veteran reward',
    colors: [0x556b2f, 0x6b8e23, 0x228b22],
    blendMode: 0, // NORMAL
    speed: { min: 15, max: 45 },
    scale: { start: 0.4, end: 0 },
    alpha: { start: 0.7, end: 0 },
    lifespan: 380,
    frequency: 45,
    quantity: 1,
  },
  {
    id: 'flawless',
    name: 'Flawless',
    category: ShopCategory.BALL_TRAIL,
    price: -1,
    description: 'Perfect Run reward',
    colors: [0xffffff, 0xe0ffff, 0xb9f2ff],
    blendMode: 1, // ADD
    speed: { min: 25, max: 70 },
    scale: { start: 0.55, end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: 400,
    frequency: 30,
    quantity: 3,
  },
];
