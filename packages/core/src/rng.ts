export interface ShuffleResult<T> {
  items: T[];
  rng: number;
}

export interface DrawResult<T> {
  drawPile: T[];
  discardPile: T[];
  drawn: T[];
  rng: number;
}

export function normalizeSeed(seed: number): number {
  const normalized = seed >>> 0;
  return normalized === 0 ? 1 : normalized;
}

export function shuffle<T>(items: T[], seed: number): ShuffleResult<T> {
  const nextItems = [...items];
  let nextSeed = seed;

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const value = nextRandom(nextSeed);
    nextSeed = value.seed;
    const swapIndex = Math.floor(value.value * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return {
    items: nextItems,
    rng: nextSeed,
  };
}

export function drawCards<T>(drawPile: T[], discardPile: T[], count: number, rng: number): DrawResult<T> {
  let nextDrawPile = [...drawPile];
  let nextDiscardPile = [...discardPile];
  const drawn: T[] = [];
  let nextRng = rng;

  while (drawn.length < count) {
    if (nextDrawPile.length === 0) {
      if (nextDiscardPile.length === 0) {
        break;
      }

      const shuffled = shuffle(nextDiscardPile, nextRng);
      nextDrawPile = shuffled.items;
      nextDiscardPile = [];
      nextRng = shuffled.rng;
    }

    const nextCard = nextDrawPile.shift();

    if (!nextCard) {
      break;
    }

    drawn.push(nextCard);
  }

  return {
    drawPile: nextDrawPile,
    discardPile: nextDiscardPile,
    drawn,
    rng: nextRng,
  };
}

function nextRandom(seed: number): { value: number; seed: number } {
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;

  return {
    seed: nextSeed === 0 ? 1 : nextSeed,
    value: nextSeed / 4294967296,
  };
}
