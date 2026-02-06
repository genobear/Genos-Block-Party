import { describe, it, expect, beforeEach } from 'vitest';
import { EndlessModeManager } from '../systems/EndlessModeManager';
import { ENDLESS_MODE } from '../config/Constants';

describe('EndlessModeManager', () => {
  beforeEach(() => {
    localStorage.clear();
    EndlessModeManager.resetInstance();
  });

  // ─── 1. Singleton Pattern ──────────────────────────────────────────

  describe('Singleton Pattern', () => {
    it('getInstance returns the same instance on multiple calls', () => {
      const a = EndlessModeManager.getInstance();
      const b = EndlessModeManager.getInstance();
      expect(a).toBe(b);
    });

    it('resetInstance allows a new instance to be created', () => {
      const first = EndlessModeManager.getInstance();
      EndlessModeManager.resetInstance();
      const second = EndlessModeManager.getInstance();
      expect(first).not.toBe(second);
    });
  });

  // ─── 2. Wave Progression ──────────────────────────────────────────

  describe('Wave Progression', () => {
    it('startSession resets wave to 0', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      manager.nextWave();
      manager.nextWave();
      // Start a new session — wave should reset
      manager.startSession();
      expect(manager.getCurrentWave()).toBe(0);
    });

    it('nextWave increments wave correctly', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      const result = manager.nextWave();
      expect(result).toBe(1);
      expect(manager.getCurrentWave()).toBe(1);
    });

    it('multiple nextWave calls increment sequentially (1, 2, 3...)', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      expect(manager.nextWave()).toBe(1);
      expect(manager.nextWave()).toBe(2);
      expect(manager.nextWave()).toBe(3);
      expect(manager.nextWave()).toBe(4);
      expect(manager.nextWave()).toBe(5);
    });

    it('getCurrentWave returns correct value after multiple advances', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      for (let i = 0; i < 7; i++) {
        manager.nextWave();
      }
      expect(manager.getCurrentWave()).toBe(7);
    });
  });

  // ─── 3. Checkpoint System ─────────────────────────────────────────

  describe('Checkpoint System', () => {
    it('isCheckpointWave returns false for wave 0', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      expect(manager.isCheckpointWave()).toBe(false);
    });

    it('isCheckpointWave returns true for wave 5, 10, 15', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();

      // Advance to wave 5
      for (let i = 0; i < 5; i++) manager.nextWave();
      expect(manager.isCheckpointWave()).toBe(true);

      // Advance to wave 10
      for (let i = 0; i < 5; i++) manager.nextWave();
      expect(manager.isCheckpointWave()).toBe(true);

      // Advance to wave 15
      for (let i = 0; i < 5; i++) manager.nextWave();
      expect(manager.isCheckpointWave()).toBe(true);
    });

    it('isCheckpointWave returns false for non-multiples of 5', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();

      for (const target of [1, 2, 3, 4, 6, 7, 8, 9, 11]) {
        // Reset
        manager.startSession();
        for (let i = 0; i < target; i++) manager.nextWave();
        expect(manager.isCheckpointWave()).toBe(false);
      }
    });

    it('getCheckpoint returns floor(wave / 5)', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();

      expect(manager.getCheckpoint()).toBe(0); // wave 0

      manager.nextWave(); // wave 1
      expect(manager.getCheckpoint()).toBe(0);

      for (let i = 0; i < 4; i++) manager.nextWave(); // wave 5
      expect(manager.getCheckpoint()).toBe(1);

      for (let i = 0; i < 3; i++) manager.nextWave(); // wave 8
      expect(manager.getCheckpoint()).toBe(1);

      for (let i = 0; i < 2; i++) manager.nextWave(); // wave 10
      expect(manager.getCheckpoint()).toBe(2);

      for (let i = 0; i < 7; i++) manager.nextWave(); // wave 17
      expect(manager.getCheckpoint()).toBe(3);
    });
  });

  // ─── 4. Difficulty Scaling ─────────────────────────────────────────

  describe('Difficulty Scaling', () => {
    it('getDifficultyMultiplier at wave 0 = 1.0', () => {
      const manager = EndlessModeManager.getInstance();
      expect(manager.getDifficultyMultiplier(0)).toBe(1.0);
    });

    it('getDifficultyMultiplier at wave 10 = 2.0', () => {
      const manager = EndlessModeManager.getInstance();
      // 1 + (10 * 0.1) = 2.0
      expect(manager.getDifficultyMultiplier(10)).toBe(2.0);
    });

    it('getDifficultyMultiplier uses currentWave when no arg', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      for (let i = 0; i < 5; i++) manager.nextWave();
      // 1 + (5 * 0.1) = 1.5
      expect(manager.getDifficultyMultiplier()).toBe(1.5);
    });

    it('getSpeedMultiplier scales correctly per wave', () => {
      const manager = EndlessModeManager.getInstance();
      // wave 0: 1.0 + 0*0.03 = 1.0
      expect(manager.getSpeedMultiplier(0)).toBeCloseTo(1.0, 2);
      // wave 1: 1.0 + 1*0.03 = 1.03
      expect(manager.getSpeedMultiplier(1)).toBeCloseTo(1.03, 2);
      // wave 10: 1.0 + 10*0.03 = 1.3
      expect(manager.getSpeedMultiplier(10)).toBeCloseTo(1.3, 2);
    });

    it('getSpeedMultiplier caps at MAX_SPEED_MULTIPLIER (1.5)', () => {
      const manager = EndlessModeManager.getInstance();
      // wave 20: 1.0 + 20*0.03 = 1.6 → capped at 1.5
      expect(manager.getSpeedMultiplier(20)).toBe(ENDLESS_MODE.MAX_SPEED_MULTIPLIER);
      // wave 50: way past cap
      expect(manager.getSpeedMultiplier(50)).toBe(ENDLESS_MODE.MAX_SPEED_MULTIPLIER);
      // wave 100
      expect(manager.getSpeedMultiplier(100)).toBe(ENDLESS_MODE.MAX_SPEED_MULTIPLIER);
    });
  });

  // ─── 5. Currency Bonus ─────────────────────────────────────────────

  describe('Currency Bonus', () => {
    it('calculateCurrencyBonus(1) = 3', () => {
      const manager = EndlessModeManager.getInstance();
      expect(manager.calculateCurrencyBonus(1)).toBe(3);
    });

    it('calculateCurrencyBonus(10) = 30', () => {
      const manager = EndlessModeManager.getInstance();
      expect(manager.calculateCurrencyBonus(10)).toBe(30);
    });

    it('calculateCurrencyBonus(0) = 0', () => {
      const manager = EndlessModeManager.getInstance();
      expect(manager.calculateCurrencyBonus(0)).toBe(0);
    });

    it('calculateCurrencyBonus scales linearly', () => {
      const manager = EndlessModeManager.getInstance();
      for (let w = 0; w <= 20; w++) {
        expect(manager.calculateCurrencyBonus(w)).toBe(w * ENDLESS_MODE.CURRENCY_PER_WAVE);
      }
    });
  });

  // ─── 6. Unlock Persistence ─────────────────────────────────────────

  describe('Unlock Persistence', () => {
    it('isUnlocked returns false with empty localStorage', () => {
      const manager = EndlessModeManager.getInstance();
      expect(manager.isUnlocked()).toBe(false);
    });

    it('isUnlocked returns true after unlockEndlessMode()', () => {
      const manager = EndlessModeManager.getInstance();
      manager.unlockEndlessMode();
      expect(manager.isUnlocked()).toBe(true);
    });

    it('isUnlocked returns true when level progress >= 10', () => {
      localStorage.setItem(ENDLESS_MODE.LEVEL_PROGRESS_KEY, '10');
      const manager = EndlessModeManager.getInstance();
      expect(manager.isUnlocked()).toBe(true);
    });

    it('isUnlocked returns true when level progress > 10', () => {
      localStorage.setItem(ENDLESS_MODE.LEVEL_PROGRESS_KEY, '15');
      const manager = EndlessModeManager.getInstance();
      expect(manager.isUnlocked()).toBe(true);
    });

    it('isUnlocked returns false when level progress < 10', () => {
      localStorage.setItem(ENDLESS_MODE.LEVEL_PROGRESS_KEY, '5');
      const manager = EndlessModeManager.getInstance();
      expect(manager.isUnlocked()).toBe(false);
    });

    it('handles corrupted localStorage gracefully (non-numeric progress)', () => {
      localStorage.setItem(ENDLESS_MODE.LEVEL_PROGRESS_KEY, 'garbage');
      const manager = EndlessModeManager.getInstance();
      // parseInt('garbage') = NaN, NaN >= 10 = false
      expect(manager.isUnlocked()).toBe(false);
    });

    it('handles missing localStorage keys gracefully', () => {
      // No keys set at all
      const manager = EndlessModeManager.getInstance();
      expect(manager.isUnlocked()).toBe(false);
    });

    it('unlock persists across singleton resets', () => {
      const manager1 = EndlessModeManager.getInstance();
      manager1.unlockEndlessMode();
      EndlessModeManager.resetInstance();
      const manager2 = EndlessModeManager.getInstance();
      expect(manager2.isUnlocked()).toBe(true);
    });
  });

  // ─── 7. Personal Best Tracking ─────────────────────────────────────

  describe('Personal Best Tracking', () => {
    it('highestWave starts at 0 with empty localStorage', () => {
      const manager = EndlessModeManager.getInstance();
      expect(manager.getHighestWave()).toBe(0);
    });

    it('endSession saves new highest wave', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      for (let i = 0; i < 7; i++) manager.nextWave();
      manager.endSession();
      expect(manager.getHighestWave()).toBe(7);
    });

    it('endSession does NOT overwrite if current < highest', () => {
      const manager = EndlessModeManager.getInstance();

      // First session: reach wave 10
      manager.startSession();
      for (let i = 0; i < 10; i++) manager.nextWave();
      manager.endSession();
      expect(manager.getHighestWave()).toBe(10);

      // Second session: only reach wave 3
      manager.startSession();
      for (let i = 0; i < 3; i++) manager.nextWave();
      manager.endSession();
      expect(manager.getHighestWave()).toBe(10); // still 10
    });

    it('highestWave persists across resetInstance (via localStorage)', () => {
      const manager1 = EndlessModeManager.getInstance();
      manager1.startSession();
      for (let i = 0; i < 12; i++) manager1.nextWave();
      manager1.endSession();

      EndlessModeManager.resetInstance();

      const manager2 = EndlessModeManager.getInstance();
      expect(manager2.getHighestWave()).toBe(12);
    });

    it('handles corrupted localStorage value for highest wave', () => {
      localStorage.setItem('genos-block-party-endless-highest-wave', 'not-a-number');
      const manager = EndlessModeManager.getInstance();
      expect(manager.getHighestWave()).toBe(0);
    });

    it('handles negative localStorage value for highest wave', () => {
      localStorage.setItem('genos-block-party-endless-highest-wave', '-5');
      const manager = EndlessModeManager.getInstance();
      expect(manager.getHighestWave()).toBe(0);
    });

    it('endSession saves to localStorage', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      for (let i = 0; i < 8; i++) manager.nextWave();
      manager.endSession();
      expect(localStorage.getItem('genos-block-party-endless-highest-wave')).toBe('8');
    });
  });

  // ─── 8. Session Lifecycle ──────────────────────────────────────────

  describe('Session Lifecycle', () => {
    it('startSession sets isActive to true', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      expect(manager.isSessionActive()).toBe(true);
    });

    it('endSession sets isActive to false', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      manager.endSession();
      expect(manager.isSessionActive()).toBe(false);
    });

    it('isSessionActive reflects current state', () => {
      const manager = EndlessModeManager.getInstance();
      expect(manager.isSessionActive()).toBe(false); // default
      manager.startSession();
      expect(manager.isSessionActive()).toBe(true);
      manager.endSession();
      expect(manager.isSessionActive()).toBe(false);
      manager.startSession();
      expect(manager.isSessionActive()).toBe(true);
    });

    it('starting new session resets wave to 0', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      manager.nextWave();
      manager.nextWave();
      manager.nextWave();
      expect(manager.getCurrentWave()).toBe(3);

      manager.endSession();
      manager.startSession();
      expect(manager.getCurrentWave()).toBe(0);
    });
  });

  // ─── 9. Wave Generation ────────────────────────────────────────────

  describe('Wave Generation', () => {
    it('generateWave returns a BrickConfig array', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      manager.nextWave();
      const bricks = manager.generateWave();
      expect(Array.isArray(bricks)).toBe(true);
      expect(bricks.length).toBeGreaterThan(0);
      // Each brick should have x, y, type, health
      for (const brick of bricks) {
        expect(brick).toHaveProperty('x');
        expect(brick).toHaveProperty('y');
        expect(brick).toHaveProperty('type');
        expect(brick).toHaveProperty('health');
      }
    });

    it('generateWave uses currentWave by default', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      for (let i = 0; i < 5; i++) manager.nextWave();

      // generateWave() with no arg should use currentWave (5)
      const defaultBricks = manager.generateWave();
      const explicitBricks = manager.generateWave(5);
      expect(defaultBricks).toEqual(explicitBricks);
    });

    it('generateWave with explicit wave number overrides currentWave', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      manager.nextWave(); // wave 1

      const wave10Bricks = manager.generateWave(10);
      const wave1Bricks = manager.generateWave(1);
      // Different waves should produce different patterns
      expect(JSON.stringify(wave10Bricks)).not.toBe(JSON.stringify(wave1Bricks));
    });
  });

  // ─── 10. Display ───────────────────────────────────────────────────

  describe('Display', () => {
    it('getWaveDisplayName returns "Wave N" format', () => {
      const manager = EndlessModeManager.getInstance();
      expect(manager.getWaveDisplayName(1)).toBe('Wave 1');
      expect(manager.getWaveDisplayName(5)).toBe('Wave 5');
      expect(manager.getWaveDisplayName(42)).toBe('Wave 42');
    });

    it('getWaveDisplayName uses currentWave when no arg', () => {
      const manager = EndlessModeManager.getInstance();
      manager.startSession();
      expect(manager.getWaveDisplayName()).toBe('Wave 0');
      manager.nextWave();
      expect(manager.getWaveDisplayName()).toBe('Wave 1');
      for (let i = 0; i < 9; i++) manager.nextWave();
      expect(manager.getWaveDisplayName()).toBe('Wave 10');
    });
  });
});
