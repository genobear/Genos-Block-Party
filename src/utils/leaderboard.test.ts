/**
 * Leaderboard utility tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLeaderboard,
  checkIsHighScore,
  insertScore,
  saveLeaderboard,
  HighScoreEntry,
  DEFAULT_STORAGE_KEY,
  MAX_ENTRIES,
} from './leaderboard';

// Mock localStorage for testing
function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

describe('leaderboard constants', () => {
  it('has correct default storage key', () => {
    expect(DEFAULT_STORAGE_KEY).toBe('genos-block-party-leaderboard');
  });

  it('has correct max entries value', () => {
    expect(MAX_ENTRIES).toBe(5);
  });
});

describe('getLeaderboard', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it('returns empty array when storage key does not exist', () => {
    const result = getLeaderboard(storage);
    expect(result).toEqual([]);
  });

  it('returns empty array when storage contains invalid JSON', () => {
    storage.setItem(DEFAULT_STORAGE_KEY, 'not valid json{{{');
    const result = getLeaderboard(storage);
    expect(result).toEqual([]);
  });

  it('parses valid JSON correctly', () => {
    const entries: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 500 },
    ];
    storage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(entries));
    
    const result = getLeaderboard(storage);
    expect(result).toEqual(entries);
  });

  it('handles empty array in storage', () => {
    storage.setItem(DEFAULT_STORAGE_KEY, '[]');
    const result = getLeaderboard(storage);
    expect(result).toEqual([]);
  });

  it('uses custom storage key when provided', () => {
    const customKey = 'custom-leaderboard-key';
    const entries: HighScoreEntry[] = [{ initials: 'CCC', score: 750 }];
    storage.setItem(customKey, JSON.stringify(entries));
    
    const result = getLeaderboard(storage, customKey);
    expect(result).toEqual(entries);
  });
});

describe('checkIsHighScore', () => {
  it('returns false for score of 0', () => {
    const leaderboard: HighScoreEntry[] = [];
    expect(checkIsHighScore(0, leaderboard)).toBe(false);
  });

  it('returns false for score of 0 even with empty leaderboard', () => {
    expect(checkIsHighScore(0, [])).toBe(false);
  });

  it('returns true when leaderboard has fewer than maxEntries', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 500 },
    ];
    // Default maxEntries is 5, we have 2 entries
    expect(checkIsHighScore(100, leaderboard)).toBe(true);
  });

  it('returns true when leaderboard is empty and score is positive', () => {
    expect(checkIsHighScore(1, [])).toBe(true);
  });

  it('returns true when score beats the lowest entry', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 800 },
      { initials: 'CCC', score: 600 },
      { initials: 'DDD', score: 400 },
      { initials: 'EEE', score: 200 },
    ];
    // Score 300 beats the lowest (200)
    expect(checkIsHighScore(300, leaderboard)).toBe(true);
  });

  it('returns false when score equals the lowest entry', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 800 },
      { initials: 'CCC', score: 600 },
      { initials: 'DDD', score: 400 },
      { initials: 'EEE', score: 200 },
    ];
    // Score 200 equals the lowest, does not beat it
    expect(checkIsHighScore(200, leaderboard)).toBe(false);
  });

  it('returns false when score is below the lowest entry', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 800 },
      { initials: 'CCC', score: 600 },
      { initials: 'DDD', score: 400 },
      { initials: 'EEE', score: 200 },
    ];
    // Score 100 is below the lowest (200)
    expect(checkIsHighScore(100, leaderboard)).toBe(false);
  });

  it('respects custom maxEntries parameter', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 500 },
      { initials: 'CCC', score: 100 },
    ];
    // With maxEntries=3, leaderboard is full
    expect(checkIsHighScore(50, leaderboard, 3)).toBe(false);
    // Score 150 beats the lowest (100)
    expect(checkIsHighScore(150, leaderboard, 3)).toBe(true);
  });
});

describe('insertScore', () => {
  it('inserts first score into empty leaderboard', () => {
    const entry: HighScoreEntry = { initials: 'AAA', score: 500 };
    const result = insertScore(entry, []);
    expect(result).toEqual([{ initials: 'AAA', score: 500 }]);
  });

  it('inserts higher score at correct position (sorted descending)', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'BBB', score: 500 },
    ];
    const entry: HighScoreEntry = { initials: 'AAA', score: 1000 };
    const result = insertScore(entry, leaderboard);
    
    expect(result).toEqual([
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 500 },
    ]);
  });

  it('inserts lower score at end', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
    ];
    const entry: HighScoreEntry = { initials: 'BBB', score: 200 };
    const result = insertScore(entry, leaderboard);
    
    expect(result).toEqual([
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 200 },
    ]);
  });

  it('inserts score in middle of existing entries', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'CCC', score: 300 },
    ];
    const entry: HighScoreEntry = { initials: 'BBB', score: 600 };
    const result = insertScore(entry, leaderboard);
    
    expect(result).toEqual([
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 600 },
      { initials: 'CCC', score: 300 },
    ]);
  });

  it('caps entries at maxEntries (removes lowest when full)', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 800 },
      { initials: 'CCC', score: 600 },
      { initials: 'DDD', score: 400 },
      { initials: 'EEE', score: 200 },
    ];
    // Insert a score that should go in the middle
    const entry: HighScoreEntry = { initials: 'NEW', score: 500 };
    const result = insertScore(entry, leaderboard);
    
    expect(result).toHaveLength(5);
    expect(result).toEqual([
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 800 },
      { initials: 'CCC', score: 600 },
      { initials: 'NEW', score: 500 },
      { initials: 'DDD', score: 400 },
    ]);
    // EEE (200) should be removed
    expect(result.find(e => e.initials === 'EEE')).toBeUndefined();
  });

  it('handles duplicate scores (both kept, maintains relative order)', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 500 },
    ];
    const entry: HighScoreEntry = { initials: 'BBB', score: 500 };
    const result = insertScore(entry, leaderboard);
    
    expect(result).toHaveLength(2);
    // Both entries with score 500 should be present
    expect(result.filter(e => e.score === 500)).toHaveLength(2);
  });

  it('does not mutate original array', () => {
    const original: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 500 },
    ];
    const originalCopy = JSON.stringify(original);
    
    const entry: HighScoreEntry = { initials: 'CCC', score: 750 };
    insertScore(entry, original);
    
    expect(JSON.stringify(original)).toBe(originalCopy);
  });

  it('respects custom maxEntries parameter', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 500 },
      { initials: 'CCC', score: 100 },
    ];
    const entry: HighScoreEntry = { initials: 'NEW', score: 750 };
    const result = insertScore(entry, leaderboard, 3);
    
    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { initials: 'AAA', score: 1000 },
      { initials: 'NEW', score: 750 },
      { initials: 'BBB', score: 500 },
    ]);
  });
});

describe('saveLeaderboard', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it('saves JSON to storage with correct key', () => {
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 500 },
    ];
    
    saveLeaderboard(leaderboard, storage);
    
    const saved = storage.getItem(DEFAULT_STORAGE_KEY);
    expect(saved).toBe(JSON.stringify(leaderboard));
  });

  it('overwrites existing data', () => {
    const oldData: HighScoreEntry[] = [{ initials: 'OLD', score: 100 }];
    storage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(oldData));
    
    const newData: HighScoreEntry[] = [{ initials: 'NEW', score: 999 }];
    saveLeaderboard(newData, storage);
    
    const saved = JSON.parse(storage.getItem(DEFAULT_STORAGE_KEY)!);
    expect(saved).toEqual(newData);
  });

  it('uses custom storage key when provided', () => {
    const customKey = 'custom-key';
    const leaderboard: HighScoreEntry[] = [{ initials: 'XYZ', score: 123 }];
    
    saveLeaderboard(leaderboard, storage, customKey);
    
    expect(storage.getItem(customKey)).toBe(JSON.stringify(leaderboard));
    expect(storage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
  });

  it('saves empty array correctly', () => {
    saveLeaderboard([], storage);
    expect(storage.getItem(DEFAULT_STORAGE_KEY)).toBe('[]');
  });
});

describe('integration tests', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it('full flow: insert multiple scores, save, retrieve, verify order', () => {
    // Start with empty leaderboard
    let leaderboard = getLeaderboard(storage);
    expect(leaderboard).toEqual([]);
    
    // Insert first score
    expect(checkIsHighScore(500, leaderboard)).toBe(true);
    leaderboard = insertScore({ initials: 'AAA', score: 500 }, leaderboard);
    saveLeaderboard(leaderboard, storage);
    
    // Insert second score (higher)
    leaderboard = getLeaderboard(storage);
    expect(checkIsHighScore(1000, leaderboard)).toBe(true);
    leaderboard = insertScore({ initials: 'BBB', score: 1000 }, leaderboard);
    saveLeaderboard(leaderboard, storage);
    
    // Insert third score (middle)
    leaderboard = getLeaderboard(storage);
    expect(checkIsHighScore(750, leaderboard)).toBe(true);
    leaderboard = insertScore({ initials: 'CCC', score: 750 }, leaderboard);
    saveLeaderboard(leaderboard, storage);
    
    // Retrieve and verify final order
    const final = getLeaderboard(storage);
    expect(final).toEqual([
      { initials: 'BBB', score: 1000 },
      { initials: 'CCC', score: 750 },
      { initials: 'AAA', score: 500 },
    ]);
  });

  it('enforces max entries over multiple insertions', () => {
    let leaderboard: HighScoreEntry[] = [];
    
    // Insert 7 scores
    const scores = [300, 700, 100, 900, 500, 200, 800];
    const initials = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    
    for (let i = 0; i < scores.length; i++) {
      const entry = { initials: initials[i].repeat(3), score: scores[i] };
      leaderboard = insertScore(entry, leaderboard);
    }
    
    saveLeaderboard(leaderboard, storage);
    const final = getLeaderboard(storage);
    
    // Should only have top 5 scores
    expect(final).toHaveLength(5);
    expect(final.map(e => e.score)).toEqual([900, 800, 700, 500, 300]);
  });

  it('correctly rejects low scores when leaderboard is full', () => {
    // Create a full leaderboard
    const leaderboard: HighScoreEntry[] = [
      { initials: 'AAA', score: 1000 },
      { initials: 'BBB', score: 800 },
      { initials: 'CCC', score: 600 },
      { initials: 'DDD', score: 400 },
      { initials: 'EEE', score: 200 },
    ];
    saveLeaderboard(leaderboard, storage);
    
    // Score of 150 should not qualify
    const retrieved = getLeaderboard(storage);
    expect(checkIsHighScore(150, retrieved)).toBe(false);
    
    // Score of 0 should not qualify
    expect(checkIsHighScore(0, retrieved)).toBe(false);
    
    // Score of 200 (equals lowest) should not qualify
    expect(checkIsHighScore(200, retrieved)).toBe(false);
    
    // Score of 201 should qualify
    expect(checkIsHighScore(201, retrieved)).toBe(true);
  });
});
