import { HAND_SIZE, STARTING_ENERGY } from "./constants.js";
import { finishNode } from "./progression.js";
import { drawCards, shuffle } from "./rng.js";
import { getRewardChoices, grantRelicReward } from "./rewards.js";
import { appendLog, getCombat, getCurrentIntent, getNode, getRelicValue } from "./shared.js";
import type { EnemyState, MapNode, RunContent, RunState } from "./types.js";
import { getEnemyDefinition } from "./validate.js";

export function startCombat(content: RunContent, state: RunState, node: MapNode): RunState {
  const enemyId = node.encounterId;

  if (!enemyId) {
    throw new Error(`${node.kind} node ${node.id} must define an encounterId`);
  }

  const enemyDefinition = getEnemyDefinition(content, enemyId);
  const shuffledDeck = shuffle([...state.deck], state.rng);
  const drawn = drawCards(shuffledDeck.items, [], HAND_SIZE, shuffledDeck.rng);
  const playerStartingBlock = getRelicValue(content, state, "combatStartBlock");
  const enemy: EnemyState = {
    id: enemyDefinition.id,
    name: enemyDefinition.name,
    hp: enemyDefinition.maxHp,
    maxHp: enemyDefinition.maxHp,
    block: 0,
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
        energy: STARTING_ENERGY + getRelicValue(content, state, "combatEnergy"),
        block: playerStartingBlock,
        turn: 1,
      },
      reward: undefined,
      shop: undefined,
    },
    { type: "enemyAppeared", enemyId: enemy.id, intent: getCurrentIntent(enemy) },
  );
}

export function finishCombat(content: RunContent, state: RunState): RunState {
  const combat = getCombat(state);
  const currentNode = getNode(content, state.act, state.currentNodeId);
  const reward = combat.enemy.goldReward;

  let nextState: RunState = appendLog(
    {
      ...state,
      gold: state.gold + reward,
      combat: undefined,
    },
    { type: "enemyDefeated", enemyId: combat.enemy.id, gold: reward },
  );

  nextState = grantRelicReward(content, nextState, currentNode);
  const rewardSelection = getRewardChoices(content, nextState);

  if (rewardSelection.cards.length === 0) {
    return finishNode(content, nextState, currentNode);
  }

  return appendLog(
    {
      ...nextState,
      rng: rewardSelection.rng,
      phase: "reward",
      reward: {
        cardChoices: rewardSelection.cards,
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

  if (intent.kind === "attack" || intent.kind === "attackBlock") {
    const attackDamage = intent.damage ?? 0;
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
  const drawn = drawCards(combat.drawPile, combat.discardPile, HAND_SIZE, state.rng);

  return appendLog(
    {
      ...state,
      rng: drawn.rng,
      combat: {
        ...combat,
        drawPile: drawn.drawPile,
        discardPile: drawn.discardPile,
        hand: drawn.drawn,
        energy: STARTING_ENERGY + getRelicValue(content, state, "combatEnergy"),
        block: 0,
        turn: combat.turn + 1,
      },
    },
    { type: "turnStarted", turn: combat.turn + 1, intent: getCurrentIntent(combat.enemy) },
  );
}
