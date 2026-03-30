import type { CardDefinition, EnemyDefinition, RelicDefinition, RelicKind, RunContent } from "./types.js";
import { getCardNumbers } from "./shared.js";

export function validateContent(content: RunContent): void {
  validateCards(content);
  validateCharacter(content);
  validateMap(content);
  validatePools(content);
  validateRelics(content);
}

function validateCharacter(content: RunContent): void {
  if (content.character.starterDeck.length === 0) {
    throw new Error("starterDeck must contain at least one card");
  }

  for (const cardId of content.character.starterDeck) {
    getCard(content, cardId);
  }

  getRelic(content, content.character.startingRelicId);
}

function validateMap(content: RunContent): void {
  for (const act of content.acts) {
    const firstNode = act.map[0];

    if (!firstNode) {
      throw new Error(`act ${act.id} must contain at least one node`);
    }

    if (firstNode.kind !== "start") {
      throw new Error(`act ${act.id} must begin with a start node`);
    }

    const seenNodeIds = new Set<string>();

    for (const node of act.map) {
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

    for (const node of act.map) {
      for (const nextId of node.nextIds) {
        if (!seenNodeIds.has(nextId)) {
          throw new Error(`node ${node.id} references unknown next node ${nextId}`);
        }
      }
    }
  }
}

function validatePools(content: RunContent): void {
  validateCardBuckets(content.character.rewardCardPools, content);
  validateCardBuckets(content.character.shopCardPools, content);

  for (const relicId of content.character.relicPools.elite) {
    getRelic(content, relicId);
  }

  for (const relicId of content.character.relicPools.boss) {
    getRelic(content, relicId);
  }

  for (const cardId of [
    ...content.character.blessingCardPools.act1,
    ...content.character.blessingCardPools.act2,
    ...content.character.blessingCardPools.act3,
  ]) {
    getCard(content, cardId);
  }

  for (const act of content.acts) {
    if (act.blessings.length === 0) {
      throw new Error(`act ${act.id} must define at least one blessing`);
    }

    for (const blessing of act.blessings) {
      if (blessing.kind === "card") {
        if (!blessing.cardId) {
          throw new Error(`blessing ${blessing.id} must define cardId`);
        }

        getCard(content, blessing.cardId);
        continue;
      }

      if (!blessing.value || blessing.value <= 0) {
        throw new Error(`blessing ${blessing.id} must define a positive value`);
      }
    }
  }
}

const VALID_RELIC_KINDS: ReadonlySet<RelicKind> = new Set([
  "combatEnergy",
  "combatStartDraw",
  "combatStartBlock",
  "combatStartPoison",
  "maxHp",
  "postCombatHeal",
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

function validateCards(content: RunContent): void {
  for (const card of Object.values(content.cards)) {
    validateCardNumbers(card.id, "base", getCardNumbers(card, false));
    validateCardNumbers(card.id, "upgraded", getCardNumbers(card, true));
  }
}

function validateCardNumbers(cardId: string, label: "base" | "upgraded", numbers: CardDefinition["base"]): void {
  if (numbers.cost < 0) {
    throw new Error(`card ${cardId} ${label} cost must be non-negative`);
  }
}

export function validateCardBuckets(
  buckets: RunContent["character"]["rewardCardPools"],
  content: RunContent,
): void {
  for (const cardId of [...buckets.common, ...buckets.rare, ...buckets.epic]) {
    getCard(content, cardId);
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
