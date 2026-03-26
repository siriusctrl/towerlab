import { LOG_LIMIT } from "./constants.js";
import { shuffle } from "./rng.js";
import type { EnemyIntent, EnemyState, MapNode, RelicKind, RunContent, RunState } from "./types.js";
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

export function getNode(content: RunContent, nodeId: string): MapNode {
  const node = content.map.find((entry) => entry.id === nodeId);

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

export function buildRemovableDeckIndices(deck: string[]): number[] {
  return deck.map((_, index) => index);
}

export function appendLog(state: RunState, message: string): RunState {
  return {
    ...state,
    log: [...state.log, message].slice(-LOG_LIMIT),
  };
}

export function describeNode(node: MapNode): string {
  return `${node.id} (${node.kind})`;
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
