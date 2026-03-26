import { LOG_LIMIT } from "./constants.js";
import { shuffle } from "./rng.js";
import type {
  CardRarity,
  CardRarityBuckets,
  EnemyIntent,
  EnemyState,
  LogEvent,
  MapNode,
  RelicKind,
  TowerAct,
  RunContent,
  RunState,
} from "./types.js";
import { getRelic } from "./validate.js";

export function applyDamageToEnemy(enemy: EnemyState, damage: number): EnemyState {
  const absorbed = Math.min(enemy.block, damage);
  const nextHp = enemy.hp - (damage - absorbed);

  return {
    ...enemy,
    hp: Math.max(nextHp, 0),
    block: enemy.block - absorbed,
  };
}

export function getCurrentIntent(enemy: EnemyState): EnemyIntent {
  const intent = enemy.intents[enemy.intentIndex];

  if (!intent) {
    throw new Error(`enemy ${enemy.id} has no intent at index ${enemy.intentIndex}`);
  }

  return intent;
}

export function getCombat(state: RunState): NonNullable<RunState["combat"]> {
  if (!state.combat) {
    throw new Error("combat state is not available");
  }

  return state.combat;
}

export function getAct(content: RunContent, act: number): TowerAct {
  const currentAct = content.acts[act - 1];

  if (!currentAct) {
    throw new Error(`unknown act: ${act}`);
  }

  return currentAct;
}

export function getNode(content: RunContent, act: number, nodeId: string): MapNode {
  const node = getAct(content, act).map.find((entry) => entry.id === nodeId);

  if (!node) {
    throw new Error(`unknown node: ${nodeId}`);
  }

  return node;
}

export function selectCardsFromPool(cardPool: string[], count: number, rng: number): { cards: string[]; rng: number } {
  if (cardPool.length === 0 || count <= 0) {
    return {
      cards: [],
      rng,
    };
  }

  const available = [...new Set(cardPool)];
  const shuffled = shuffle(available, rng);

  return {
    cards: shuffled.items.slice(0, Math.min(count, shuffled.items.length)),
    rng: shuffled.rng,
  };
}

export function selectCardsFromBuckets(
  buckets: CardRarityBuckets,
  plan: CardRarity[],
  rng: number,
): { cards: string[]; rng: number } {
  const selected = new Set<string>();
  const cards: string[] = [];
  let nextRng = rng;

  for (const rarity of plan) {
    const pick = selectCardFromBucketChain(buckets, rarity, selected, nextRng);
    nextRng = pick.rng;

    if (!pick.cardId) {
      continue;
    }

    selected.add(pick.cardId);
    cards.push(pick.cardId);
  }

  return { cards, rng: nextRng };
}

function selectCardFromBucketChain(
  buckets: CardRarityBuckets,
  preferred: CardRarity,
  selected: Set<string>,
  rng: number,
): { cardId?: string; rng: number } {
  let nextRng = rng;

  for (const rarity of getBucketFallbackOrder(preferred)) {
    const available = [...new Set(buckets[rarity])].filter((cardId) => !selected.has(cardId));

    if (available.length === 0) {
      continue;
    }

    const shuffled = shuffle(available, nextRng);
    return {
      cardId: shuffled.items[0],
      rng: shuffled.rng,
    };
  }

  return { rng: nextRng };
}

function getBucketFallbackOrder(preferred: CardRarity): CardRarity[] {
  if (preferred === "epic") {
    return ["epic", "rare", "common"];
  }

  if (preferred === "rare") {
    return ["rare", "common", "epic"];
  }

  return ["common", "rare", "epic"];
}

export function buildRemovableDeckIndices(deck: string[]): number[] {
  return deck.map((_, index) => index);
}

export function appendLog(state: RunState, event: LogEvent): RunState {
  return {
    ...state,
    log: [...state.log, event].slice(-LOG_LIMIT),
  };
}

export function getRelicValue(content: RunContent, state: RunState, kind: RelicKind): number {
  return state.relics.reduce((total, relicId) => {
    const relic = getRelic(content, relicId);
    return relic.kind === kind ? total + relic.value : total;
  }, 0);
}

export function assertNever(value: never): never {
  throw new Error(`unexpected value: ${String(value)}`);
}
