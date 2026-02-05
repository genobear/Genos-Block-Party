/**
 * Power-up types in Geno's Block Party
 */
export enum PowerUpType {
  BALLOON = 'balloon',   // Slow ball (10s)
  CAKE = 'cake',         // Wide paddle (15s)
  DRINKS = 'drinks',     // Wobbly paddle debuff (8s)
  DISCO = 'disco',       // Spawn 2 extra balls (instant)
  MYSTERY = 'mystery',   // Random effect
  POWERBALL = 'powerball', // Double power-up drop chance (12s)
  FIREBALL = 'fireball', // Piercing ball with stacking damage (10s)
  ELECTRICBALL = 'electricball', // Electric ball with AOE damage (8s)
  PARTY_POPPER = 'partypopper', // 3x3 bomb explosion on next brick hit (one-shot)
  BOUNCE_HOUSE = 'bouncehouse', // Safety net saves ball once
  PARTY_FAVOR = 'partyfavor', // Extra life (instant, very rare)
}

/**
 * Power-up configuration
 */
export interface PowerUpConfig {
  type: PowerUpType;
  color: number;
  duration: number;    // 0 for instant effects
  dropWeight: number;  // Higher = more likely to drop
  emoji: string;       // For visual indicator
}

/**
 * Consolidated power-up configuration - single source of truth
 */
export const POWERUP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  [PowerUpType.BALLOON]: {
    type: PowerUpType.BALLOON,
    color: 0xff6b6b,
    duration: 10000,
    dropWeight: 20,
    emoji: '🎈',
  },
  [PowerUpType.CAKE]: {
    type: PowerUpType.CAKE,
    color: 0xffd93d,
    duration: 15000,
    dropWeight: 15,
    emoji: '🎂',
  },
  [PowerUpType.DRINKS]: {
    type: PowerUpType.DRINKS,
    color: 0x6bcb77,
    duration: 8000,
    dropWeight: 15,
    emoji: '🍹',
  },
  [PowerUpType.DISCO]: {
    type: PowerUpType.DISCO,
    color: 0xc084fc,
    duration: 0,  // Instant effect
    dropWeight: 10,
    emoji: '🪩',
  },
  [PowerUpType.MYSTERY]: {
    type: PowerUpType.MYSTERY,
    color: 0x4ade80,
    duration: 0,  // Depends on revealed effect
    dropWeight: 10,
    emoji: '❓',
  },
  [PowerUpType.POWERBALL]: {
    type: PowerUpType.POWERBALL,
    color: 0xff9500,      // Orange/gold
    duration: 12000,      // 12 seconds
    dropWeight: 12,
    emoji: '💪',
  },
  [PowerUpType.FIREBALL]: {
    type: PowerUpType.FIREBALL,
    color: 0xff4500,      // OrangeRed
    duration: 10000,      // 10 seconds
    dropWeight: 10,
    emoji: '🔥',
  },
  [PowerUpType.ELECTRICBALL]: {
    type: PowerUpType.ELECTRICBALL,
    color: 0x00ffff,      // Electric cyan
    duration: 8000,       // 8 seconds
    dropWeight: 12,
    emoji: '⚡',
  },
  [PowerUpType.PARTY_POPPER]: {
    type: PowerUpType.PARTY_POPPER,
    color: 0xff4500,
    duration: 0,
    dropWeight: 10,
    emoji: '💣',
  },
  [PowerUpType.BOUNCE_HOUSE]: {
    type: PowerUpType.BOUNCE_HOUSE,
    color: 0x90ee90,      // Light green
    duration: 0,          // Until used (one-shot)
    dropWeight: 10,
    emoji: '🛡️',
  },
  [PowerUpType.PARTY_FAVOR]: {
    type: PowerUpType.PARTY_FAVOR,
    color: 0xff69b4,      // Hot pink
    duration: 0,          // Instant effect
    dropWeight: 3,        // Very rare
    emoji: '🎁',
  },
};

/**
 * Get total weight for probability calculation
 */
function getTotalDropWeight(): number {
  return Object.values(POWERUP_CONFIGS).reduce((sum, config) => sum + config.dropWeight, 0);
}

/**
 * Select a random power-up type based on weighted drop chances
 */
export function selectRandomPowerUpType(): PowerUpType {
  const totalWeight = getTotalDropWeight();
  let random = Math.random() * totalWeight;

  for (const config of Object.values(POWERUP_CONFIGS)) {
    random -= config.dropWeight;
    if (random <= 0) {
      return config.type;
    }
  }

  // Fallback
  return PowerUpType.BALLOON;
}

/**
 * Select a random effect type for Mystery power-up (uniform distribution, excludes Mystery and PowerBall)
 */
export function selectRandomEffectType(): PowerUpType {
  const effectTypes = Object.values(PowerUpType).filter(
    t => t !== PowerUpType.MYSTERY
  );
  return effectTypes[Math.floor(Math.random() * effectTypes.length)];
}
