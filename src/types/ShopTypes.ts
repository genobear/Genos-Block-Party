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
];
