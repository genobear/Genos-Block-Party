/**
 * Ball Particle Effects - Type Definitions
 * Defines available effect types and depth layering for z-ordering
 */

/**
 * Types of visual effects that can be applied to balls
 * Add new effect types here when creating new handlers
 */
export enum BallEffectType {
  FIREBALL = 'fireball',
  DISCO_SPARKLE = 'disco_sparkle',
  DANGER_SPARKS = 'danger_sparks',
  ELECTRIC_TRAIL = 'electric_trail',
  // Future effects:
  // BALLOON_TRAIL = 'balloon_trail',
  // ICE_TRAIL = 'ice_trail',
}

/**
 * Depth layers for particle effects
 * Lower values render behind higher values
 * Ball sprite should be set to BALL depth for proper layering
 */
export enum EffectDepth {
  SMOKE = 5,        // Smoke trails, behind everything
  TRAIL = 10,       // Fire trails, standard trails
  BALL = 15,        // Ball sprite depth
  SPARKLE = 20,     // Sparkles, on top of ball
  FIRE_OVERLAY = 22, // Fireball flames above sparkles
  GLOW = 25,        // Outermost glow effects
}
