import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Phaser EventEmitter
vi.mock('phaser', () => ({
  default: {
    Events: {
      EventEmitter: class MockEventEmitter {
        emit = vi.fn();
        on = vi.fn();
        off = vi.fn();
      },
    },
  },
}));

// Mock LifetimeStatsManager
const mockGetStats = vi.fn();
vi.mock('../systems/LifetimeStatsManager', () => ({
  LifetimeStatsManager: {
    getInstance: () => ({
      getStats: mockGetStats,
    }),
  },
}));

// Mock CurrencyManager
const mockAddCurrency = vi.fn();
vi.mock('../systems/CurrencyManager', () => ({
  CurrencyManager: {
    getInstance: () => ({
      addCurrency: mockAddCurrency,
    }),
  },
}));

import { AchievementManager, ACHIEVEMENT_LIST } from '../systems/AchievementManager';

function defaultStats() {
  return {
    totalBricksDestroyed: 0,
    totalPowerUpsCollected: 0,
    gamesPlayed: 0,
    totalPlayTimeMs: 0,
    highestMultiplier: 1,
    totalScoreEarned: 0,
    highestLevel: 0,
    perfectGames: 0,
    powerUpsByType: {},
  };
}

beforeEach(() => {
  localStorage.clear();
  AchievementManager.resetInstance();
  mockGetStats.mockReset();
  mockAddCurrency.mockReset();
  mockGetStats.mockReturnValue(defaultStats());
});

// ─── 1. Achievement Definitions ──────────────────────────────────────────────

describe('Achievement Definitions', () => {
  it('all 14 achievements have valid id, name, description, coins, and type', () => {
    expect(ACHIEVEMENT_LIST).toHaveLength(14);
    for (const a of ACHIEVEMENT_LIST) {
      expect(a.id).toBeTruthy();
      expect(a.name).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.coins).toBeGreaterThan(0);
      expect(['session', 'skill', 'cumulative']).toContain(a.type);
    }
  });

  it('all achievements have a threshold', () => {
    for (const a of ACHIEVEMENT_LIST) {
      expect(a.threshold).toBeDefined();
      expect(a.threshold).toBeGreaterThan(0);
    }
  });

  it('cumulative achievements have a stat field', () => {
    const cumulative = ACHIEVEMENT_LIST.filter((a) => a.type === 'cumulative');
    expect(cumulative.length).toBeGreaterThan(0);
    for (const a of cumulative) {
      expect(a.stat).toBeTruthy();
    }
  });
});

// ─── 2. Session Achievements ─────────────────────────────────────────────────

describe('Session Achievements', () => {
  it('party_starter unlocks at level 1', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordLevelComplete(1, false);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'party_starter')).toBe(true);
  });

  it('halfway_there unlocks at level 5', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    for (let i = 1; i <= 5; i++) mgr.recordLevelComplete(i, true);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'halfway_there')).toBe(true);
  });

  it('party_master unlocks at level 10', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    for (let i = 1; i <= 10; i++) mgr.recordLevelComplete(i, true);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'party_master')).toBe(true);
  });

  it('score_hunter unlocks at 10000+ score', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.endSession(10000, 5);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'score_hunter')).toBe(true);
  });

  it('endless_five unlocks at wave 5 in endless mode', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession(true);
    mgr.recordEndlessWave(5);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'endless_five')).toBe(true);
  });

  it('endless_ten does NOT unlock if not in endless mode', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession(false);
    mgr.recordEndlessWave(10);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'endless_ten')).toBe(false);
  });

  it('level below threshold does not unlock halfway_there', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    for (let i = 1; i <= 4; i++) mgr.recordLevelComplete(i, false);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'halfway_there')).toBe(false);
  });

  it('score below 10000 does not unlock score_hunter', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.endSession(9999, 5);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'score_hunter')).toBe(false);
  });
});

// ─── 3. Flawless Detection ──────────────────────────────────────────────────

describe('Flawless Detection', () => {
  it('flawless_one unlocks when level 1 completed with livesLost=false', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordLevelComplete(1, false);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'flawless_one')).toBe(true);
  });

  it('flawless_one does NOT unlock when level 1 completed with livesLost=true', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordLevelComplete(1, true);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'flawless_one')).toBe(false);
  });

  it('flawless_five requires reaching and completing level 5 flawlessly', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    for (let i = 1; i <= 4; i++) mgr.recordLevelComplete(i, true);
    mgr.recordLevelComplete(5, false);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'flawless_five')).toBe(true);
  });

  it('flawless requires the level to have been recorded', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    // Reach level 5 via endSession but never call recordLevelComplete for level 5
    mgr.endSession(5000, 5);
    const unlocked = mgr.checkAchievements();
    // Level 5 was never recorded with livesLostPerLevel, so flawless_five shouldn't unlock
    expect(unlocked.some((a) => a.id === 'flawless_five')).toBe(false);
  });
});

// ─── 4. Skill Achievements ──────────────────────────────────────────────────

describe('Skill Achievements', () => {
  it('fire_lord unlocks at fireball stack 5', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordFireballStack(5);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'fire_lord')).toBe(true);
  });

  it('fire_lord does not unlock at stack 4', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordFireballStack(4);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'fire_lord')).toBe(false);
  });

  it('combo_king unlocks at multiplier 5', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordMultiplier(5);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'combo_king')).toBe(true);
  });

  it('combo_king does not unlock at multiplier 4', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordMultiplier(4);
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'combo_king')).toBe(false);
  });
});

// ─── 5. Cumulative Achievements ─────────────────────────────────────────────

describe('Cumulative Achievements', () => {
  it('power_collector unlocks with totalPowerUpsCollected >= 100', () => {
    mockGetStats.mockReturnValue({ ...defaultStats(), totalPowerUpsCollected: 100 });
    const mgr = AchievementManager.getInstance();
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'power_collector')).toBe(true);
  });

  it('brick_breaker unlocks with totalBricksDestroyed >= 500', () => {
    mockGetStats.mockReturnValue({ ...defaultStats(), totalBricksDestroyed: 500 });
    const mgr = AchievementManager.getInstance();
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'brick_breaker')).toBe(true);
  });

  it('party_animal unlocks with gamesPlayed >= 10', () => {
    mockGetStats.mockReturnValue({ ...defaultStats(), gamesPlayed: 10 });
    const mgr = AchievementManager.getInstance();
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'party_animal')).toBe(true);
  });

  it('below threshold does not unlock cumulative achievements', () => {
    mockGetStats.mockReturnValue({
      ...defaultStats(),
      totalPowerUpsCollected: 99,
      totalBricksDestroyed: 499,
      gamesPlayed: 9,
    });
    const mgr = AchievementManager.getInstance();
    const unlocked = mgr.checkAchievements();
    expect(unlocked.some((a) => a.id === 'power_collector')).toBe(false);
    expect(unlocked.some((a) => a.id === 'brick_breaker')).toBe(false);
    expect(unlocked.some((a) => a.id === 'party_animal')).toBe(false);
  });
});

// ─── 6. Coin Rewards ────────────────────────────────────────────────────────

describe('Coin Rewards', () => {
  it('checkAchievements calls addCurrency with correct coin amount', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordLevelComplete(1, false);
    mgr.checkAchievements();
    // party_starter = 10c, flawless_one = 20c
    expect(mockAddCurrency).toHaveBeenCalledWith(10);
    expect(mockAddCurrency).toHaveBeenCalledWith(20);
  });

  it('multiple achievements unlocked = multiple addCurrency calls', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordLevelComplete(1, false);
    mgr.recordFireballStack(5);
    mgr.recordMultiplier(5);
    mgr.checkAchievements();
    // party_starter(10) + flawless_one(20) + fire_lord(75) + combo_king(50)
    expect(mockAddCurrency).toHaveBeenCalledTimes(4);
  });

  it('no addCurrency calls when nothing new unlocks', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    // No progress → nothing unlocks
    mgr.checkAchievements();
    expect(mockAddCurrency).not.toHaveBeenCalled();
  });
});

// ─── 7. Persistence ─────────────────────────────────────────────────────────

describe('Persistence', () => {
  it('unlocked achievements are saved to localStorage', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordLevelComplete(1, true);
    mgr.checkAchievements();
    const stored = JSON.parse(localStorage.getItem('genos-block-party-achievements')!);
    expect(stored).toContain('party_starter');
  });

  it('unlocked achievements are loaded on new instance', () => {
    // First instance: unlock party_starter
    const mgr1 = AchievementManager.getInstance();
    mgr1.startSession();
    mgr1.recordLevelComplete(1, true);
    mgr1.checkAchievements();

    // Reset instance but keep localStorage
    AchievementManager.resetInstance();

    // Second instance should load saved state
    const mgr2 = AchievementManager.getInstance();
    expect(mgr2.isUnlocked('party_starter')).toBe(true);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('genos-block-party-achievements', '{not-valid-json');
    // Should not throw
    const mgr = AchievementManager.getInstance();
    expect(mgr.getUnlockedCount()).toBe(0);
  });

  it('resetAchievements clears localStorage', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordLevelComplete(1, true);
    mgr.checkAchievements();
    expect(mgr.isUnlocked('party_starter')).toBe(true);

    mgr.resetAchievements();
    const stored = JSON.parse(localStorage.getItem('genos-block-party-achievements')!);
    expect(stored).toEqual([]);
    expect(mgr.isUnlocked('party_starter')).toBe(false);
  });
});

// ─── 8. Duplicate Prevention ────────────────────────────────────────────────

describe('Duplicate Prevention', () => {
  it('same achievement cannot unlock twice', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordLevelComplete(1, true);
    const first = mgr.checkAchievements();
    expect(first.some((a) => a.id === 'party_starter')).toBe(true);

    // Check again — same session, same state
    const second = mgr.checkAchievements();
    expect(second.some((a) => a.id === 'party_starter')).toBe(false);
  });

  it('checkAchievements skips already-unlocked across instances', () => {
    const mgr1 = AchievementManager.getInstance();
    mgr1.startSession();
    mgr1.recordLevelComplete(1, true);
    mgr1.checkAchievements();

    // New instance loads saved state
    AchievementManager.resetInstance();
    const mgr2 = AchievementManager.getInstance();
    mgr2.startSession();
    mgr2.recordLevelComplete(1, true);
    const unlocked = mgr2.checkAchievements();
    expect(unlocked.some((a) => a.id === 'party_starter')).toBe(false);
  });
});

// ─── 9. Progress Tracking ───────────────────────────────────────────────────

describe('Progress Tracking', () => {
  it('getProgress returns correct current/target/percent for cumulative', () => {
    mockGetStats.mockReturnValue({ ...defaultStats(), totalPowerUpsCollected: 50 });
    const mgr = AchievementManager.getInstance();
    const progress = mgr.getProgress('power_collector');
    expect(progress.current).toBe(50);
    expect(progress.target).toBe(100);
    expect(progress.percent).toBe(50);
  });

  it('getProgress returns session state for session achievements', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordLevelComplete(3, false);
    const progress = mgr.getProgress('halfway_there');
    expect(progress.current).toBe(3);
    expect(progress.target).toBe(5);
    expect(progress.percent).toBe(60);
  });

  it('getProgress returns 0 for unknown achievement', () => {
    const mgr = AchievementManager.getInstance();
    const progress = mgr.getProgress('nonexistent_achievement');
    expect(progress.current).toBe(0);
    expect(progress.target).toBe(0);
    expect(progress.percent).toBe(0);
  });
});

// ─── 10. Event Emission ─────────────────────────────────────────────────────

describe('Event Emission', () => {
  it('achievementUnlocked event emitted with achievement data', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.recordLevelComplete(1, true);
    mgr.checkAchievements();
    // The mock EventEmitter's emit should have been called
    expect(mgr.emit).toHaveBeenCalledWith(
      'achievementUnlocked',
      expect.objectContaining({ id: 'party_starter' })
    );
  });

  it('no events emitted when nothing new unlocks', () => {
    const mgr = AchievementManager.getInstance();
    mgr.startSession();
    mgr.checkAchievements();
    expect(mgr.emit).not.toHaveBeenCalled();
  });
});
