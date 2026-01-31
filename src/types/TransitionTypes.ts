/**
 * Scene transition configuration types and presets
 */

export enum TransitionType {
  WHIP_LEFT = 'whip-left',      // Current bg exits left, new enters from right
  WHIP_RIGHT = 'whip-right',    // Current bg exits right, new enters from left
  WHIP_DOWN = 'whip-down',      // Party drop effect
  DISSOLVE = 'dissolve',        // Fallback crossfade
}

export enum ElementExitStyle {
  SLIDE_OUT = 'slide-out',      // Elements slide off screen
  EXPLODE = 'explode',          // Elements burst outward from center
  SPIRAL = 'spiral',            // Elements spiral out while shrinking
  DROP = 'drop',                // Elements fall with gravity
  SHATTER = 'shatter',          // Elements break apart and scatter
}

export interface TransitionConfig {
  // Background
  backgroundType: TransitionType;
  backgroundDuration: number;    // ms

  // Game elements (bricks, paddle, ball, UI)
  elementExitStyle: ElementExitStyle;
  elementExitDuration: number;   // ms
  elementExitStagger: number;    // ms between each element starting

  // Audio
  exitSfx?: string;              // SFX key for exit animation start
  enterSfx?: string;             // SFX key for new scene entering

  // Timing
  overlapDuration: number;       // How much new bg overlaps old bg exit
  loadingDelay: number;          // Minimum "hold" time before showing new content
}

export const DEFAULT_TRANSITION: TransitionConfig = {
  backgroundType: TransitionType.WHIP_LEFT,
  backgroundDuration: 500,
  elementExitStyle: ElementExitStyle.EXPLODE,
  elementExitDuration: 400,
  elementExitStagger: 20,
  exitSfx: 'sfx-whoosh',
  enterSfx: 'sfx-swoosh',
  overlapDuration: 200,
  loadingDelay: 100,
};

// Preset transitions for different scenarios
export const TRANSITION_PRESETS: Record<string, Partial<TransitionConfig>> = {
  'menu-to-game': {
    backgroundType: TransitionType.WHIP_LEFT,
    elementExitStyle: ElementExitStyle.EXPLODE,
    backgroundDuration: 600,
    elementExitDuration: 400,
    elementExitStagger: 15,
  },
  'level-complete': {
    backgroundType: TransitionType.WHIP_DOWN,
    elementExitStyle: ElementExitStyle.DROP,
    backgroundDuration: 500,
    elementExitDuration: 350,
    elementExitStagger: 25,
  },
  'game-over-to-menu': {
    backgroundType: TransitionType.WHIP_RIGHT,
    elementExitStyle: ElementExitStyle.SPIRAL,
    backgroundDuration: 700,
    elementExitDuration: 500,
  },
};
