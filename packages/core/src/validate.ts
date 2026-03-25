import type { CardDefinition, EnemyDefinition, RelicDefinition, RelicKind, RunContent } from "./types.js";

export function validateContent(content: RunContent): void {
  validateDeck(content);
  validateMap(content);
  validatePools(content);
  validateRelics(content);
}

function validateDeck(content: RunContent): void {
  if (content.starterDeck.length === 0) {
    throw new Error("starterDeck must contain at least one card");
  }

  for (const cardId of content.starterDeck) {
    getCard(content, cardId);
  }
}

function validateMap(content: RunContent): void {
  const seenNodeIds = new Set<string>();

  for (const node of content.map) {
    if (seenNodeIds.has(node.id)) {
      throw new Error(`duplicate node id: ${node.id}`);
    }

    seenNodeIds.add(node.id);

    if (node.kind === "rest" || node.kind === "shop" || node.kind === "start") {
      if (node.encounterId) {
        throw new Error(`${node.kind} node ${node.id} must not define an encounterId`);
      }
    } else {
      if (!node.encounterId) {
        throw new Error(`${node.kind} node ${node.id} must define an encounterId`);
      }

      getEnemyDefinition(content, node.encounterId);
    }

    if (node.relicReward) {
      getRelic(content, node.relicReward);
    }
  }

  for (const node of content.map) {
    for (const nextId of node.nextIds) {
      if (!seenNodeIds.has(nextId)) {
        throw new Error(`node ${node.id} references unknown next node ${nextId}`);
      }
    }
  }
}

function validatePools(content: RunContent): void {
  for (const cardId of content.rewardCardPool) {
    getCard(content, cardId);
  }

  for (const cardId of content.shopCardPool) {
    getCard(content, cardId);
  }
}

const VALID_RELIC_KINDS: ReadonlySet<RelicKind> = new Set([
  "combatEnergy",
  "combatStartBlock",
  "maxHp",
  "restHealBonus",
  "shopDiscount",
]);

function validateRelics(content: RunContent): void {
  for (const relic of Object.values(content.relics)) {
    if (relic.value <= 0) {
      throw new Error(`relic ${relic.id} must have a positive value`);
    }

    if (!VALID_RELIC_KINDS.has(relic.kind)) {
      throw new Error(`relic ${relic.id} has unsupported kind: ${String(relic.kind)}`);
    }
  }
}

export function getCard(content: RunContent, cardId: string): CardDefinition {
  const card = content.cards[cardId];

  if (!card) {
    throw new Error(`unknown card: ${cardId}`);
  }

  return card;
}

export function getEnemyDefinition(content: RunContent, enemyId: string): EnemyDefinition {
  const enemy = content.enemies[enemyId];

  if (!enemy) {
    throw new Error(`unknown enemy: ${enemyId}`);
  }

  if (enemy.intents.length === 0) {
    throw new Error(`enemy ${enemyId} must define at least one intent`);
  }

  return enemy;
}

export function getRelic(content: RunContent, relicId: string): RelicDefinition {
  const relic = content.relics[relicId];

  if (!relic) {
    throw new Error(`unknown relic: ${relicId}`);
  }

  return relic;
}
