import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LifetimeStatsManager } from '../systems/LifetimeStatsManager';
import { STATS } from '../config/Constants';

beforeEach(() => {
  localStorage.clear();
  LifetimeStatsManager.resetInstance();
});

// ─── 1. Singleton ────────────────────────────────────────────────

describe('Singleton', () => {
  it('getInstance returns the same instance', () => {
    const a = LifetimeStatsManager.getInstance();
    const b = LifetimeStatsManager.getInstance();
    expect(a).toBe(b);
  });

  it('resetInstance creates a fresh instance', () => {
    const a = LifetimeStatsManager.getInstance();
    LifetimeStatsManager.resetInstance();
    const b = LifetimeStatsManager.getInstance();
    expect(a).not.toBe(b);
  });
});

// ─── 2. Stat Initialization ─────────────────────────────────────

describe('Stat Initialization', () => {
  it('fresh instance has all values matching STATS.INITIAL', () => {
    const stats = LifetimeStatsManager.getInstance().getStats();
    expect(stats.totalBricksDestroyed).toBe(0);
    expect(stats.totalPowerUpsCollected).toBe(0);
    expect(stats.gamesPlayed).toBe(0);
    expect(stats.totalPlayTimeMs).toBe(0);
    expect(stats.totalScoreEarned).toBe(0);
    expect(stats.highestLevel).toBe(0);
    expect(stats.perfectGames).toBe(0);
  });

  it('highestMultiplier starts at 1 (not 0)', () => {
    const stats = LifetimeStatsManager.getInstance().getStats();
    expect(stats.highestMultiplier).toBe(1);
  });

  it('powerUpsByType starts as empty object', () => {
    const stats = LifetimeStatsManager.getInstance().getStats();
    expect(stats.powerUpsByType).toEqual({});
  });
});

// ─── 3. Brick Tracking ──────────────────────────────────────────

describe('Brick Tracking', () => {
  it('recordBrickDestroyed() increments by 1 (default)', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordBrickDestroyed();
    expect(mgr.getStats().totalBricksDestroyed).toBe(1);
  });

  it('recordBrickDestroyed(5) increments by 5', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordBrickDestroyed(5);
    expect(mgr.getStats().totalBricksDestroyed).toBe(5);
  });

  it('multiple calls accumulate', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordBrickDestroyed(3);
    mgr.recordBrickDestroyed(7);
    mgr.recordBrickDestroyed();
    expect(mgr.getStats().totalBricksDestroyed).toBe(11);
  });
});

// ─── 4. Power-Up Tracking ───────────────────────────────────────

describe('Power-Up Tracking', () => {
  it('recordPowerUpCollected increments totalPowerUpsCollected', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordPowerUpCollected('fireball');
    expect(mgr.getStats().totalPowerUpsCollected).toBe(1);
  });

  it('recordPowerUpCollected tracks by type in powerUpsByType', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordPowerUpCollected('fireball');
    expect(mgr.getStats().powerUpsByType['fireball']).toBe(1);
  });

  it('multiple types tracked independently', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordPowerUpCollected('fireball');
    mgr.recordPowerUpCollected('fireball');
    mgr.recordPowerUpCollected('multiball');
    const stats = mgr.getStats();
    expect(stats.totalPowerUpsCollected).toBe(3);
    expect(stats.powerUpsByType['fireball']).toBe(2);
    expect(stats.powerUpsByType['multiball']).toBe(1);
  });
});

// ─── 5. Game Session ─────────────────────────────────────────────

describe('Game Session', () => {
  it('recordGameStart increments gamesPlayed', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordGameStart();
    expect(mgr.getStats().gamesPlayed).toBe(1);
    mgr.recordGameStart();
    expect(mgr.getStats().gamesPlayed).toBe(2);
  });

  it('recordGameStart resets currentGameLivesLost', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordLifeLost();
    mgr.recordLifeLost();
    expect(mgr.getCurrentGameLivesLost()).toBe(2);
    mgr.recordGameStart();
    expect(mgr.getCurrentGameLivesLost()).toBe(0);
  });

  it('recordGameEnd adds score to totalScoreEarned', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordGameEnd(500, 3, 1);
    expect(mgr.getStats().totalScoreEarned).toBe(500);
    mgr.recordGameEnd(300, 2, 0);
    expect(mgr.getStats().totalScoreEarned).toBe(800);
  });

  it('recordGameEnd updates highestLevel only if higher', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordGameEnd(100, 5, 0);
    expect(mgr.getStats().highestLevel).toBe(5);
    mgr.recordGameEnd(100, 3, 0);
    expect(mgr.getStats().highestLevel).toBe(5); // stays at 5
    mgr.recordGameEnd(100, 8, 0);
    expect(mgr.getStats().highestLevel).toBe(8);
  });

  it('recordGameEnd records perfect game when level>=10 and livesLost===0', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordGameEnd(1000, 10, 0);
    expect(mgr.getStats().perfectGames).toBe(1);
  });
});

// ─── 6. Perfect Game Detection ──────────────────────────────────

describe('Perfect Game Detection', () => {
  it('perfect game: level 10, 0 lives lost → perfectGames++', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordGameEnd(1000, 10, 0);
    expect(mgr.getStats().perfectGames).toBe(1);
  });

  it('not perfect: level 10, 1 life lost → no increment', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordGameEnd(1000, 10, 1);
    expect(mgr.getStats().perfectGames).toBe(0);
  });

  it('not perfect: level 9, 0 lives lost → no increment', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordGameEnd(1000, 9, 0);
    expect(mgr.getStats().perfectGames).toBe(0);
  });
});

// ─── 7. Multiplier Tracking ─────────────────────────────────────

describe('Multiplier Tracking', () => {
  it('updateHighestMultiplier updates when higher', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.updateHighestMultiplier(5);
    expect(mgr.getStats().highestMultiplier).toBe(5);
  });

  it('updateHighestMultiplier does NOT update when lower', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.updateHighestMultiplier(5);
    mgr.updateHighestMultiplier(3);
    expect(mgr.getStats().highestMultiplier).toBe(5);
  });

  it('updateHighestMultiplier does NOT update when equal', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.updateHighestMultiplier(5);
    mgr.updateHighestMultiplier(5);
    expect(mgr.getStats().highestMultiplier).toBe(5);
  });
});

// ─── 8. Play Time ───────────────────────────────────────────────

describe('Play Time', () => {
  it('updatePlayTime accumulates time', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.updatePlayTime(5000);
    expect(mgr.getStats().totalPlayTimeMs).toBe(5000);
  });

  it('multiple calls accumulate correctly', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.updatePlayTime(3000);
    mgr.updatePlayTime(4000);
    mgr.updatePlayTime(6000);
    expect(mgr.getStats().totalPlayTimeMs).toBe(13000);
  });
});

// ─── 9. Lives Lost ──────────────────────────────────────────────

describe('Lives Lost', () => {
  it('recordLifeLost increments counter', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordLifeLost();
    expect(mgr.getCurrentGameLivesLost()).toBe(1);
  });

  it('getCurrentGameLivesLost returns correct count', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordLifeLost();
    mgr.recordLifeLost();
    mgr.recordLifeLost();
    expect(mgr.getCurrentGameLivesLost()).toBe(3);
  });
});

// ─── 10. Persistence ────────────────────────────────────────────

describe('Persistence', () => {
  it('stats saved to localStorage after each recording method', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordBrickDestroyed(10);

    const raw = localStorage.getItem(STATS.STORAGE_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored.totalBricksDestroyed).toBe(10);
  });

  it('stats loaded from localStorage on new instance', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordBrickDestroyed(42);
    mgr.recordGameStart();

    // Create new instance — should load persisted data
    LifetimeStatsManager.resetInstance();
    const mgr2 = LifetimeStatsManager.getInstance();
    const stats = mgr2.getStats();
    expect(stats.totalBricksDestroyed).toBe(42);
    expect(stats.gamesPlayed).toBe(1);
  });

  it('handles missing localStorage gracefully (defaults)', () => {
    // localStorage is already clear from beforeEach
    const mgr = LifetimeStatsManager.getInstance();
    const stats = mgr.getStats();
    expect(stats.totalBricksDestroyed).toBe(0);
    expect(stats.highestMultiplier).toBe(1);
  });

  it('handles corrupted JSON gracefully (defaults)', () => {
    localStorage.setItem(STATS.STORAGE_KEY, '{not valid json!!!');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mgr = LifetimeStatsManager.getInstance();
    const stats = mgr.getStats();
    expect(stats.totalBricksDestroyed).toBe(0);
    expect(stats.highestMultiplier).toBe(1);
    warnSpy.mockRestore();
  });

  it('merges partial data with defaults (handles new fields)', () => {
    // Simulate older save that's missing some fields
    const partial = { totalBricksDestroyed: 99, gamesPlayed: 5 };
    localStorage.setItem(STATS.STORAGE_KEY, JSON.stringify(partial));

    const mgr = LifetimeStatsManager.getInstance();
    const stats = mgr.getStats();
    // Preserved fields
    expect(stats.totalBricksDestroyed).toBe(99);
    expect(stats.gamesPlayed).toBe(5);
    // Default-filled fields
    expect(stats.highestMultiplier).toBe(1);
    expect(stats.totalPlayTimeMs).toBe(0);
    expect(stats.powerUpsByType).toEqual({});
  });
});

// ─── 11. Reset ──────────────────────────────────────────────────

describe('Reset', () => {
  it('resetStats returns all to STATS.INITIAL values', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordBrickDestroyed(50);
    mgr.recordGameStart();
    mgr.recordPowerUpCollected('fireball');
    mgr.updateHighestMultiplier(8);

    mgr.resetStats();
    const stats = mgr.getStats();
    expect(stats.totalBricksDestroyed).toBe(0);
    expect(stats.gamesPlayed).toBe(0);
    expect(stats.totalPowerUpsCollected).toBe(0);
    expect(stats.highestMultiplier).toBe(1);
    expect(stats.powerUpsByType).toEqual({});
  });

  it('resetStats persists the reset to localStorage', () => {
    const mgr = LifetimeStatsManager.getInstance();
    mgr.recordBrickDestroyed(50);
    mgr.resetStats();

    // New instance should also see the reset
    LifetimeStatsManager.resetInstance();
    const mgr2 = LifetimeStatsManager.getInstance();
    expect(mgr2.getStats().totalBricksDestroyed).toBe(0);
  });
});
