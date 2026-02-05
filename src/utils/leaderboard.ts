/**
 * Leaderboard utility functions
 * Pure functions for managing high score leaderboard
 */

export interface HighScoreEntry {
  initials: string;
  score: number;
}

export const DEFAULT_STORAGE_KEY = 'genos-block-party-leaderboard';
export const MAX_ENTRIES = 5;

/**
 * Get leaderboard from storage
 * Returns empty array if key doesn't exist or contains invalid JSON
 */
export function getLeaderboard(
  storage: Storage,
  key: string = DEFAULT_STORAGE_KEY
): HighScoreEntry[] {
  try {
    const data = storage.getItem(key);
    if (data) {
      return JSON.parse(data) as HighScoreEntry[];
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Check if a score qualifies for the leaderboard
 * Score qualifies if:
 * - Score is greater than 0 AND
 * - Leaderboard has fewer than maxEntries OR score beats the lowest entry
 */
export function checkIsHighScore(
  score: number,
  leaderboard: HighScoreEntry[],
  maxEntries: number = MAX_ENTRIES
): boolean {
  if (score === 0) return false;
  if (leaderboard.length < maxEntries) return true;
  return score > leaderboard[leaderboard.length - 1].score;
}

/**
 * Insert a new entry into the leaderboard
 * - Maintains sorted order (descending by score)
 * - Caps entries at maxEntries (removes lowest)
 * - Does not mutate the input array
 */
export function insertScore(
  entry: HighScoreEntry,
  leaderboard: HighScoreEntry[],
  maxEntries: number = MAX_ENTRIES
): HighScoreEntry[] {
  // Create a copy to avoid mutation
  const newLeaderboard = [...leaderboard, entry];
  
  // Sort descending by score (stable sort preserves original order for equal scores)
  newLeaderboard.sort((a, b) => b.score - a.score);
  
  // Cap at maxEntries
  if (newLeaderboard.length > maxEntries) {
    newLeaderboard.splice(maxEntries);
  }
  
  return newLeaderboard;
}

/**
 * Save leaderboard to storage
 */
export function saveLeaderboard(
  leaderboard: HighScoreEntry[],
  storage: Storage,
  key: string = DEFAULT_STORAGE_KEY
): void {
  storage.setItem(key, JSON.stringify(leaderboard));
}
