// UI Border configuration
export const UI_BORDER_TOP = 50;    // Space for score/level/lives
export const UI_BORDER_BOTTOM = 50; // Space for power-up indicators

// Mobile touch zone (extra height below game for touch input)
export const MOBILE_TOUCH_ZONE_HEIGHT = 300;

// Detect if primary input is touch (not just touch-capable)
// pointer: coarse = finger/touch, pointer: fine = mouse/trackpad
// This prevents touchscreen laptops from getting the mobile layout
export const IS_TOUCH_DEVICE = typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches;

// Playable area dimensions (actual gameplay space)
// Taller aspect ratio works better on mobile portrait screens
export const PLAYABLE_WIDTH = 800;
export const PLAYABLE_HEIGHT = 1000; // 25% taller than original 800

// Total canvas size (playable + borders + mobile touch zone if applicable)
export const GAME_WIDTH = PLAYABLE_WIDTH;
export const GAME_HEIGHT = PLAYABLE_HEIGHT + UI_BORDER_TOP + UI_BORDER_BOTTOM +
  (IS_TOUCH_DEVICE ? MOBILE_TOUCH_ZONE_HEIGHT : 0);

// Playable area origin (offset from canvas top)
export const PLAY_AREA_Y = UI_BORDER_TOP; // 50

// Paddle settings
export const PADDLE_WIDTH = 120;
export const PADDLE_HEIGHT = 20;
export const PADDLE_Y_OFFSET = 50; // Distance from bottom
export const PADDLE_SPEED = 0.15; // Lerp factor for smooth movement

// Ball settings
export const BALL_RADIUS = 10;
export const BALL_SPEED_BASE = 400;
export const BALL_SPEED_INCREMENT = 0.05; // Speed increase per level

// Ball speed effect multipliers (used by BallSpeedManager)
export const SPEED_EFFECTS = {
  BALLOON: 0.6, // Slow ball (60% of normal)
  ELECTRIC: 1.5, // Fast ball (150% of normal)
} as const;

// Brick settings
export const BRICK_WIDTH = 64;
export const BRICK_HEIGHT = 28;
export const BRICK_PADDING = 4;
export const BRICK_ROWS_START_Y = PLAY_AREA_Y + 150; // 150px into playable area for ball bounce space
export const BRICK_COLS = 10;

// Gameplay
export const STARTING_LIVES = 3;
export const POWERUP_DROP_CHANCE = 0.25;
export const POWERUP_FALL_SPEED = 150;

// Colors (hex)
// Note: Power-up colors are defined in POWERUP_CONFIGS (src/types/PowerUpTypes.ts)
export const COLORS = {
  // Brick types
  PRESENT: 0xff69b4,      // Pink/Magenta
  PINATA: 0xffa500,       // Orange/Gold
  BALLOON: 0x00bfff,      // Cyan/Blue

  // UI
  BALL: 0xffffff,         // White
  PADDLE: 0x8b5cf6,       // Purple
  PADDLE_ACCENT: 0xa78bfa, // Light purple

  // Background
  BACKGROUND: 0x1a1a2e,
} as const;

// Score values per hit
export const SCORE_VALUES = {
  PRESENT: 10,
  PINATA: 15,
  BALLOON: 20,
} as const;

// Note: Power-up durations are defined in POWERUP_CONFIGS (src/types/PowerUpTypes.ts)

// Audio settings
export const AUDIO = {
  // Default volumes (0-1)
  DEFAULT_MUSIC_VOLUME: 0.7,
  DEFAULT_SFX_VOLUME: 1.0,

  // Crossfade duration (ms)
  CROSSFADE_DURATION: 500,

  // SFX keys (for type safety)
  SFX: {
    POP: 'sfx-pop',
    HORN: 'sfx-horn',
    BOUNCE: 'sfx-bounce',
    SCRATCH: 'sfx-scratch',
    AIRHORN: 'sfx-airhorn',
    CHIME: 'sfx-chime',
    TROMBONE: 'sfx-trombone',
    WHOOSH: 'sfx-whoosh',
    SWOOSH: 'sfx-swoosh',
    ZAP: 'sfx-zap',
  },

  // LocalStorage key for audio settings
  STORAGE_KEY: 'genos-block-party-audio',
} as const;

// Currency settings
export const CURRENCY = {
  // LocalStorage key
  STORAGE_KEY: 'genos-block-party-currency',

  // Score-to-currency conversion (tiered square root formula)
  SQRT_MULTIPLIER: 0.5,
  TIER_THRESHOLDS: [1000, 5000, 10000, 25000] as const,
  TIER_BONUSES: [5, 10, 20, 30] as const,

  // Award scene timing (ms)
  AWARD_SCENE_DURATION: 5000,  // Cooldown after animations complete
  COUNT_UP_DURATION: 1500,
} as const;

// Multiplier system settings
export const MULTIPLIER = {
  BASE: 1.0,                    // Starting multiplier
  MAX_MULTIPLIER: 5.0,          // Cap to prevent extreme scores
  DECAY_DELAY_MS: 1000,         // Grace period before decay starts (shorter since decay scales)
  DECAY_RATE: 0.5,              // Multiplier drop per second during decay (scales with level)
  MIN_DISPLAY_THRESHOLD: 1.1,   // Only show UI when above this
} as const;

// Lifetime stats settings
export const STATS = {
  STORAGE_KEY: 'geno_lifetime_stats',
  INITIAL: {
    totalBricksDestroyed: 0,
    totalPowerUpsCollected: 0,
    powerUpsByType: {} as Record<string, number>,
    gamesPlayed: 0,
    totalPlayTimeMs: 0,
    highestMultiplier: 1,
    totalScoreEarned: 0,
    highestLevel: 0,
    perfectGames: 0,
  },
} as const;
