export interface WeightedItem<T> {
  value: T;
  weight: number;
}

/**
 * Select item from weighted list using provided random value (0-1)
 * @param items Array of items with weights
 * @param randomValue Number between 0 and 1 (exclusive)
 * @returns Selected item value, or null if no valid items
 */
export function weightedSelect<T>(items: WeightedItem<T>[], randomValue: number): T | null {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (totalWeight <= 0) return null;

  let threshold = randomValue * totalWeight;
  for (const item of items) {
    if (item.weight <= 0) continue;
    threshold -= item.weight;
    if (threshold <= 0) {
      return item.value;
    }
  }
  return items[items.length - 1]?.value ?? null;
}

/**
 * Get total weight of all items (convenience helper)
 */
export function getTotalWeight<T>(items: WeightedItem<T>[]): number {
  return items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
}
