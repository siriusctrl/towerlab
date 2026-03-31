import { LOG_LIMIT } from "./constants.js";
import { shuffle } from "./rng.js";
import type {
  CardDefinition,
  CardInstance,
  CardNumbers,
  CardRarity,
  CardRarityBuckets,
  CombatStatus,
  EnemyIntent,
  EnemyPhaseDefinition,
  EnemyState,
  PassiveEffect,
  PassiveEffectKind,
  LogEvent,
  MapNode,
  RelicKind,
  ResolvedCard,
  TowerAct,
  RunContent,
  RunState,
} from "./types.js";
import { getCard, getRelic } from "./validate.js";

export function createCombatStatus(): CombatStatus {
  return { weak: 0, vulnerable: 0, poison: 0 };
}

export function applyDamageToEnemy(enemy: EnemyState, damage: number): EnemyState {
  const absorbed = Math.min(enemy.block, damage);
  const nextHp = enemy.hp - (damage - absorbed);

  return {
    ...enemy,
    hp: Math.max(nextHp, 0),
    block: enemy.block - absorbed,
  };
}

export function applyStatus(status: CombatStatus, effect: Partial<CombatStatus>): CombatStatus {
  return {
    weak: status.weak + (effect.weak ?? 0),
    vulnerable: status.vulnerable + (effect.vulnerable ?? 0),
    poison: status.poison + (effect.poison ?? 0),
  };
}

export function tickStatus(status: CombatStatus): CombatStatus {
  return {
    weak: Math.max(0, status.weak - 1),
    vulnerable: Math.max(0, status.vulnerable - 1),
    poison: Math.max(0, status.poison - 1),
  };
}

export function computeAttackDamage(baseDamage: number, attackerStatus: CombatStatus, targetStatus: CombatStatus): number {
  let damage = baseDamage;

  if (attackerStatus.weak > 0) {
    damage = Math.floor(damage * 0.75);
  }

  if (targetStatus.vulnerable > 0) {
    damage = Math.floor(damage * 1.5);
  }

  return Math.max(0, damage);
}

export function getEnemyPhases(enemy: { intents?: EnemyIntent[]; phases?: EnemyPhaseDefinition[] }): EnemyPhaseDefinition[] {
  if (enemy.phases && enemy.phases.length > 0) {
    return enemy.phases;
  }

  if (enemy.intents && enemy.intents.length > 0) {
    return [{ intents: enemy.intents }];
  }

  throw new Error(`enemy is missing intents and phases`);
}

export function getCurrentEnemyPhase(enemy: EnemyState): EnemyPhaseDefinition {
  const phase = enemy.phases[enemy.phaseIndex];

  if (!phase) {
    throw new Error(`enemy ${enemy.id} has no phase at index ${enemy.phaseIndex}`);
  }

  return phase;
}

export function getCurrentIntent(enemy: EnemyState): EnemyIntent {
  const phase = getCurrentEnemyPhase(enemy);
  const intent = phase.intents[enemy.intentIndex];

  if (!intent) {
    throw new Error(`enemy ${enemy.id} has no intent at index ${enemy.intentIndex} for phase ${enemy.phaseIndex}`);
  }

  return intent;
}

export function syncEnemyPhase(enemy: EnemyState): EnemyState {
  let nextPhaseIndex = enemy.phaseIndex;

  for (let index = enemy.phaseIndex + 1; index < enemy.phases.length; index += 1) {
    const phase = enemy.phases[index]!;
    if (phase.whenHpAtOrBelow !== undefined && enemy.hp <= phase.whenHpAtOrBelow) {
      nextPhaseIndex = index;
    }
  }

  if (nextPhaseIndex === enemy.phaseIndex) {
    return enemy;
  }

  return {
    ...enemy,
    phaseIndex: nextPhaseIndex,
    intentIndex: 0,
  };
}

export function advanceEnemyIntent(enemy: EnemyState): EnemyState {
  const phase = getCurrentEnemyPhase(enemy);

  return {
    ...enemy,
    intentIndex: (enemy.intentIndex + 1) % phase.intents.length,
  };
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

export function createCardInstance(cardId: string, nextCardInstanceId: number, upgraded = false): CardInstance {
  return {
    instanceId: `card-${nextCardInstanceId}`,
    cardId,
    upgraded,
  };
}

export function instantiateDeck(cardIds: string[], startingInstanceId = 1): { deck: CardInstance[]; nextCardInstanceId: number } {
  let nextCardInstanceId = startingInstanceId;
  const deck = cardIds.map((cardId) => {
    const instance = createCardInstance(cardId, nextCardInstanceId);
    nextCardInstanceId += 1;
    return instance;
  });

  return { deck, nextCardInstanceId };
}

export function getCardNumbers(card: CardDefinition, upgraded: boolean): CardNumbers {
  const fallback: CardNumbers = {
    cost: card.cost,
    description: card.description,
    keywords: card.keywords,
    damage: card.damage,
    block: card.block,
    draw: card.draw,
    energy: card.energy,
    heal: card.heal,
    weak: card.weak,
    vulnerable: card.vulnerable,
    poison: card.poison,
    poisonMultiplier: card.poisonMultiplier,
    passives: card.passives,
    exhaust: card.exhaust,
    retain: card.retain,
  };

  if (upgraded) {
    return card.upgraded ?? fallback;
  }

  return card.base ?? fallback;
}

export function materializeCardDefinition(card: CardDefinition, upgraded: boolean, instanceId?: string): ResolvedCard {
  return {
    id: card.id,
    instanceId,
    name: card.name,
    rarity: card.rarity,
    upgraded,
    ...getCardNumbers(card, upgraded),
  };
}

export function addPassiveEffects(base: PassiveEffect[], extra: PassiveEffect[] = []): PassiveEffect[] {
  const totals = new Map<PassiveEffectKind, number>();

  for (const effect of [...base, ...extra]) {
    totals.set(effect.kind, (totals.get(effect.kind) ?? 0) + effect.value);
  }

  return [...totals.entries()]
    .filter(([, value]) => value !== 0)
    .map(([kind, value]) => ({ kind, value }));
}

export function getPassiveEffectValue(effects: PassiveEffect[], kind: PassiveEffectKind): number {
  return effects.reduce((total, effect) => total + (effect.kind === kind ? effect.value : 0), 0);
}

export function getCombatPassiveValue(state: RunState, kind: PassiveEffectKind): number {
  return state.combat ? getPassiveEffectValue(state.combat.passives, kind) : 0;
}

export function getTotalPassiveValue(content: RunContent, state: RunState, kind: PassiveEffectKind): number {
  return getRelicValue(content, state, kind) + getCombatPassiveValue(state, kind);
}

const COMBAT_PASSIVE_KINDS: PassiveEffectKind[] = [
  "retainBlock",
  "strikeBonusDamage",
  "exhaustBlock",
  "attackPoison",
  "debuffBonusDamage",
  "debuffDraw",
];

export function listActiveCombatPassives(content: RunContent, state: RunState): PassiveEffect[] {
  return COMBAT_PASSIVE_KINDS.flatMap((kind) => {
    const value = getTotalPassiveValue(content, state, kind);
    return value > 0 ? [{ kind, value }] : [];
  });
}


export function materializeCardInstance(content: RunContent, instance: CardInstance): ResolvedCard {
  return materializeCardDefinition(getCard(content, instance.cardId), instance.upgraded, instance.instanceId);
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
  for (const rarity of getBucketFallbackOrder(preferred)) {
    const available = [...new Set(buckets[rarity])].filter((cardId) => !selected.has(cardId));

    if (available.length === 0) {
      continue;
    }

    const shuffled = shuffle(available, rng);
    return {
      cardId: shuffled.items[0],
      rng: shuffled.rng,
    };
  }

  return { rng };
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

export function buildRemovableDeckIndices(deck: CardInstance[]): number[] {
  return deck.map((_, index) => index);
}

export function buildUpgradableDeckIndices(deck: CardInstance[]): number[] {
  return deck.flatMap((card, index) => (card.upgraded ? [] : [index]));
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
