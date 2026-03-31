import { HAND_SIZE, STARTING_ENERGY } from "./constants.js";
import { finishNode } from "./progression.js";
import { drawCards, shuffle } from "./rng.js";
import { getRewardChoices, getSelectableRelicReward } from "./rewards.js";
import { appendLog, computeAttackDamage, createCombatStatus, getCombat, getCurrentIntent, getNode, getRelicValue } from "./shared.js";
import type { EnemyState, MapNode, RunContent, RunState } from "./types.js";
import { getEnemyDefinition } from "./validate.js";

export function startCombat(content: RunContent, state: RunState, node: MapNode): RunState {
  const enemyId = node.encounterId;

  if (!enemyId) {
    throw new Error(`${node.kind} node ${node.id} must define an encounterId`);
  }

  const enemyDefinition = getEnemyDefinition(content, enemyId);
  const shuffledDeck = shuffle([...state.deck], state.rng);
  const drawn = drawCards(
    shuffledDeck.items,
    [],
    HAND_SIZE + getRelicValue(content, state, "combatStartDraw"),
    shuffledDeck.rng,
  );
  const playerStartingBlock = getRelicValue(content, state, "combatStartBlock");
  const enemy: EnemyState = {
    id: enemyDefinition.id,
    name: enemyDefinition.name,
    hp: enemyDefinition.maxHp,
    maxHp: enemyDefinition.maxHp,
    block: 0,
    status: {
      ...createCombatStatus(),
      poison: getRelicValue(content, state, "combatStartPoison"),
    },
    goldReward: enemyDefinition.goldReward,
    intents: enemyDefinition.intents,
    intentIndex: 0,
  };

  return appendLog(
    {
      ...state,
      phase: "combat",
      rng: drawn.rng,
      combat: {
        enemy,
        drawPile: drawn.drawPile,
        hand: drawn.drawn,
        discardPile: drawn.discardPile,
        exhaustPile: [],
        energy: STARTING_ENERGY + getRelicValue(content, state, "combatEnergy"),
        block: playerStartingBlock,
        status: createCombatStatus(),
        turn: 1,
      },
      rest: undefined,
      reward: undefined,
      shop: undefined,
    },
    { type: "enemyAppeared", enemyId: enemy.id, intent: getCurrentIntent(enemy) },
  );
}

export function finishCombat(content: RunContent, state: RunState): RunState {
  const combat = getCombat(state);
  const currentNode = getNode(content, state.act, state.currentNodeId);
  const goldReward = combat.enemy.goldReward;

  let nextState: RunState = appendLog(
    {
      ...state,
      hp: Math.min(state.maxHp, state.hp + getRelicValue(content, state, "postCombatHeal")),
      combat: undefined,
    },
    { type: "enemyDefeated", enemyId: combat.enemy.id, gold: goldReward },
  );

  const rewardSelection = getRewardChoices(content, nextState);
  const rewardItems: NonNullable<RunState["reward"]>["items"] = [];
  const relicReward = getSelectableRelicReward(nextState, currentNode);

  if (goldReward > 0) {
    rewardItems.push({ kind: "gold" as const, amount: goldReward, claimed: false });
  }

  if (relicReward) {
    rewardItems.push({ kind: "relic" as const, relicId: relicReward, claimed: false });
  }

  if (rewardSelection.cards.length > 0) {
    rewardItems.push({ kind: "cards" as const, cardChoices: rewardSelection.cards, claimed: false });
  }

  if (rewardItems.length === 0) {
    return finishNode(content, nextState, currentNode);
  }

  return appendLog(
    {
      ...nextState,
      rng: rewardSelection.rng,
      phase: "reward",
      reward: {
        mode: "menu",
        items: rewardItems,
      },
    },
    { type: "rewardOffered" },
  );
}

export function resolveEnemyTurn(state: RunState): RunState {
  const combat = getCombat(state);
  const intent = getCurrentIntent(combat.enemy);
  let enemy = combat.enemy;
  let hp = state.hp;
  let block = combat.block;
  let playerStatus = combat.status;

  if (intent.kind === "attack" || intent.kind === "attackBlock") {
    const attackDamage = computeAttackDamage(intent.damage ?? 0, enemy.status, playerStatus);
    const absorbed = Math.min(block, attackDamage);
    block -= absorbed;
    hp -= attackDamage - absorbed;
  }

  if (intent.kind === "attackBlock" || intent.kind === "block") {
    enemy = {
      ...enemy,
      block: enemy.block + (intent.block ?? 0),
    };
  }

  if (intent.kind === "heal") {
    enemy = {
      ...enemy,
      hp: Math.min(enemy.maxHp, enemy.hp + (intent.heal ?? 0)),
    };
  }

  playerStatus = {
    weak: playerStatus.weak + (intent.weak ?? 0),
    vulnerable: playerStatus.vulnerable + (intent.vulnerable ?? 0),
    poison: playerStatus.poison + (intent.poison ?? 0),
  };

  const enemyPoisonDamage = enemy.status.poison;
  enemy = {
    ...enemy,
    hp: Math.max(0, enemy.hp - enemyPoisonDamage),
    status: {
      weak: Math.max(0, enemy.status.weak - 1),
      vulnerable: Math.max(0, enemy.status.vulnerable - 1),
      poison: Math.max(0, enemy.status.poison - 1),
    },
  };

  const nextEnemy: EnemyState = {
    ...enemy,
    intentIndex: (enemy.intentIndex + 1) % enemy.intents.length,
  };

  const nextState = appendLog(
    {
      ...state,
      hp: Math.max(hp, 0),
      combat: {
        ...combat,
        enemy: nextEnemy,
        block,
        status: playerStatus,
      },
    },
    { type: "enemyUsedIntent", enemyId: combat.enemy.id, intent },
  );

  if (hp <= 0) {
    return appendLog(
      {
        ...nextState,
        phase: "defeat",
        combat: undefined,
      },
      { type: "playerDefeated" },
    );
  }

  return nextState;
}

export function startPlayerTurn(content: RunContent, state: RunState): RunState {
  const combat = getCombat(state);
  const cardsToDraw = Math.max(0, HAND_SIZE - combat.hand.length);
  const drawn = drawCards(combat.drawPile, combat.discardPile, cardsToDraw, state.rng);

  return appendLog(
    {
      ...state,
      rng: drawn.rng,
      combat: {
        ...combat,
        drawPile: drawn.drawPile,
        discardPile: drawn.discardPile,
        hand: [...combat.hand, ...drawn.drawn],
        energy: STARTING_ENERGY + getRelicValue(content, state, "combatEnergy"),
        block: 0,
        turn: combat.turn + 1,
      },
    },
    { type: "turnStarted", turn: combat.turn + 1, intent: getCurrentIntent(combat.enemy) },
  );
}
