export function normalizeSeed(seed: number): number {
  const normalized = seed >>> 0;
  return normalized === 0 ? 1 : normalized;
}

export function nextSeed(seed: number): number {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return next === 0 ? 1 : next;
}

export function pickFrom<const T>(items: readonly T[], seed: number): { value: T; rng: number } {
  const next = nextSeed(seed);
  const index = next % items.length;

  return {
    value: items[index]!,
    rng: next,
  };
}

export function shuffle<T>(items: readonly T[], seed: number): { items: T[]; rng: number } {
  const shuffled = [...items];
  let rng = seed;

  for (let index = shuffled.length - 1; index > 0; index--) {
    const next = nextSeed(rng);
    const swapIndex = next % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
    rng = next;
  }

  return { items: shuffled, rng };
}
