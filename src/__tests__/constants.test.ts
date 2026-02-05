import { describe, it, expect } from 'vitest';
import {
  UI_BORDER_TOP,
  UI_BORDER_BOTTOM,
  PLAYABLE_WIDTH,
  PLAYABLE_HEIGHT,
  GAME_WIDTH,
  GAME_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_SPEED,
  PADDLE_Y_OFFSET,
  BALL_RADIUS,
  BALL_SPEED_BASE,
  BALL_SPEED_INCREMENT,
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BRICK_COLS,
  STARTING_LIVES,
  POWERUP_DROP_CHANCE,
  POWERUP_FALL_SPEED,
  COLORS,
  SCORE_VALUES,
  AUDIO,
  CURRENCY,
  MULTIPLIER,
} from '../config/Constants';

describe('Constants validation', () => {
  describe('UI Borders', () => {
    it('UI_BORDER_TOP should be positive', () => {
      expect(UI_BORDER_TOP).toBeGreaterThan(0);
    });

    it('UI_BORDER_BOTTOM should be positive', () => {
      expect(UI_BORDER_BOTTOM).toBeGreaterThan(0);
    });
  });

  describe('Playable Area', () => {
    it('PLAYABLE_WIDTH should be greater than 0', () => {
      expect(PLAYABLE_WIDTH).toBeGreaterThan(0);
    });

    it('PLAYABLE_HEIGHT should be greater than 0', () => {
      expect(PLAYABLE_HEIGHT).toBeGreaterThan(0);
    });

    it('GAME_WIDTH should be at least PLAYABLE_WIDTH', () => {
      expect(GAME_WIDTH).toBeGreaterThanOrEqual(PLAYABLE_WIDTH);
    });

    it('GAME_HEIGHT should be at least PLAYABLE_HEIGHT', () => {
      expect(GAME_HEIGHT).toBeGreaterThanOrEqual(PLAYABLE_HEIGHT);
    });
  });

  describe('Paddle Settings', () => {
    it('PADDLE_WIDTH should be greater than 0', () => {
      expect(PADDLE_WIDTH).toBeGreaterThan(0);
    });

    it('PADDLE_HEIGHT should be greater than 0', () => {
      expect(PADDLE_HEIGHT).toBeGreaterThan(0);
    });

    it('PADDLE_SPEED should be greater than 0 and at most 1 (lerp factor)', () => {
      expect(PADDLE_SPEED).toBeGreaterThan(0);
      expect(PADDLE_SPEED).toBeLessThanOrEqual(1);
    });

    it('PADDLE_Y_OFFSET should be greater than 0', () => {
      expect(PADDLE_Y_OFFSET).toBeGreaterThan(0);
    });
  });

  describe('Ball Settings', () => {
    it('BALL_RADIUS should be greater than 0', () => {
      expect(BALL_RADIUS).toBeGreaterThan(0);
    });

    it('BALL_SPEED_BASE should be greater than 0', () => {
      expect(BALL_SPEED_BASE).toBeGreaterThan(0);
    });

    it('BALL_SPEED_INCREMENT should be non-negative', () => {
      expect(BALL_SPEED_INCREMENT).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Brick Settings', () => {
    it('BRICK_WIDTH should be greater than 0', () => {
      expect(BRICK_WIDTH).toBeGreaterThan(0);
    });

    it('BRICK_HEIGHT should be greater than 0', () => {
      expect(BRICK_HEIGHT).toBeGreaterThan(0);
    });

    it('BRICK_PADDING should be non-negative', () => {
      expect(BRICK_PADDING).toBeGreaterThanOrEqual(0);
    });

    it('BRICK_PADDING should be less than BRICK_WIDTH', () => {
      expect(BRICK_PADDING).toBeLessThan(BRICK_WIDTH);
    });

    it('BRICK_PADDING should be less than BRICK_HEIGHT', () => {
      expect(BRICK_PADDING).toBeLessThan(BRICK_HEIGHT);
    });

    it('BRICK_COLS should be greater than 0', () => {
      expect(BRICK_COLS).toBeGreaterThan(0);
    });
  });

  describe('Gameplay', () => {
    it('STARTING_LIVES should be greater than 0', () => {
      expect(STARTING_LIVES).toBeGreaterThan(0);
    });

    it('POWERUP_DROP_CHANCE should be between 0 and 1 (inclusive)', () => {
      expect(POWERUP_DROP_CHANCE).toBeGreaterThanOrEqual(0);
      expect(POWERUP_DROP_CHANCE).toBeLessThanOrEqual(1);
    });

    it('POWERUP_FALL_SPEED should be greater than 0', () => {
      expect(POWERUP_FALL_SPEED).toBeGreaterThan(0);
    });
  });

  describe('Colors (COLORS object)', () => {
    it('all color values should be non-negative integers', () => {
      for (const [key, value] of Object.entries(COLORS)) {
        expect(value, `COLORS.${key}`).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(value), `COLORS.${key} should be an integer`).toBe(true);
      }
    });

    it('all color values should be valid hex (at most 0xFFFFFF)', () => {
      for (const [key, value] of Object.entries(COLORS)) {
        expect(value, `COLORS.${key}`).toBeLessThanOrEqual(0xffffff);
      }
    });
  });

  describe('Score Values (SCORE_VALUES object)', () => {
    it('all score values should be positive integers', () => {
      for (const [key, value] of Object.entries(SCORE_VALUES)) {
        expect(value, `SCORE_VALUES.${key}`).toBeGreaterThan(0);
        expect(Number.isInteger(value), `SCORE_VALUES.${key} should be an integer`).toBe(true);
      }
    });
  });

  describe('Audio Settings (AUDIO object)', () => {
    it('DEFAULT_MUSIC_VOLUME should be between 0 and 1 (inclusive)', () => {
      expect(AUDIO.DEFAULT_MUSIC_VOLUME).toBeGreaterThanOrEqual(0);
      expect(AUDIO.DEFAULT_MUSIC_VOLUME).toBeLessThanOrEqual(1);
    });

    it('DEFAULT_SFX_VOLUME should be between 0 and 1 (inclusive)', () => {
      expect(AUDIO.DEFAULT_SFX_VOLUME).toBeGreaterThanOrEqual(0);
      expect(AUDIO.DEFAULT_SFX_VOLUME).toBeLessThanOrEqual(1);
    });

    it('CROSSFADE_DURATION should be greater than 0', () => {
      expect(AUDIO.CROSSFADE_DURATION).toBeGreaterThan(0);
    });
  });

  describe('Currency Settings (CURRENCY object)', () => {
    it('SQRT_MULTIPLIER should be greater than 0', () => {
      expect(CURRENCY.SQRT_MULTIPLIER).toBeGreaterThan(0);
    });

    it('TIER_THRESHOLDS should be in ascending order', () => {
      for (let i = 1; i < CURRENCY.TIER_THRESHOLDS.length; i++) {
        expect(
          CURRENCY.TIER_THRESHOLDS[i],
          `TIER_THRESHOLDS[${i}] should be greater than TIER_THRESHOLDS[${i - 1}]`
        ).toBeGreaterThan(CURRENCY.TIER_THRESHOLDS[i - 1]);
      }
    });

    it('TIER_BONUSES should all be non-negative', () => {
      for (let i = 0; i < CURRENCY.TIER_BONUSES.length; i++) {
        expect(CURRENCY.TIER_BONUSES[i], `TIER_BONUSES[${i}]`).toBeGreaterThanOrEqual(0);
      }
    });

    it('AWARD_SCENE_DURATION should be greater than 0', () => {
      expect(CURRENCY.AWARD_SCENE_DURATION).toBeGreaterThan(0);
    });

    it('COUNT_UP_DURATION should be greater than 0', () => {
      expect(CURRENCY.COUNT_UP_DURATION).toBeGreaterThan(0);
    });
  });

  describe('Multiplier Settings (MULTIPLIER object)', () => {
    it('BASE should be greater than 0', () => {
      expect(MULTIPLIER.BASE).toBeGreaterThan(0);
    });

    it('MAX_MULTIPLIER should be greater than BASE', () => {
      expect(MULTIPLIER.MAX_MULTIPLIER).toBeGreaterThan(MULTIPLIER.BASE);
    });

    it('DECAY_DELAY_MS should be greater than 0', () => {
      expect(MULTIPLIER.DECAY_DELAY_MS).toBeGreaterThan(0);
    });

    it('DECAY_RATE should be greater than 0', () => {
      expect(MULTIPLIER.DECAY_RATE).toBeGreaterThan(0);
    });

    it('MIN_DISPLAY_THRESHOLD should be greater than BASE', () => {
      expect(MULTIPLIER.MIN_DISPLAY_THRESHOLD).toBeGreaterThan(MULTIPLIER.BASE);
    });
  });
});
