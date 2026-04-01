import { HAND_SIZE, STARTING_ENERGY } from "./constants.js";
import { finishNode } from "./progression.js";
import { drawCards, shuffle } from "./rng.js";
import { getRewardChoices, getSelectableRelicReward } from "./rewards.js";
import {
  advanceEnemyIntent,
  appendLog,
  computeAttackDamage,
  createCombatStatus,
  getCombat,
  getCardNumbers,
  getCurrentIntent,
  getEnemyPhases,
  getNode,
  getRelicValue,
  getTotalPassiveValue,
  syncEnemyPhase,
} from "./shared.js";
import type { CombatTimingWindow, EnemyState, MapNode, RunContent, RunState } from "./types.js";
import { getCard, getEnemyDefinition } from "./validate.js";

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
    strength: 0,
    status: {
      ...createCombatStatus(),
      poison: getRelicValue(content, state, "combatStartPoison"),
    },
    goldReward: enemyDefinition.goldReward,
    phases: getEnemyPhases(enemyDefinition),
    phaseIndex: 0,
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
        passives: [],
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

  const rewardSelection = getRewardChoices(content, nextState, currentNode);
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

export function resolvePlayerTurnEnd(content: RunContent, state: RunState): RunState {
  const window: CombatTimingWindow = "playerTurnEnd";
  const combat = getCombat(state);
  const etherealHand = combat.hand.filter((instance) =>
    getCardNumbers(getCard(content, instance.cardId), instance.upgraded).keywords?.includes("ethereal")
  );
  const retainedHand = combat.hand.filter((instance) => {
    const numbers = getCardNumbers(getCard(content, instance.cardId), instance.upgraded);
    return numbers.retain && !numbers.keywords?.includes("ethereal");
  });
  const discardedHand = combat.hand.filter((instance) => {
    const numbers = getCardNumbers(getCard(content, instance.cardId), instance.upgraded);
    return !numbers.retain && !numbers.keywords?.includes("ethereal");
  });
  const poisonDamage = combat.status.poison;
  const nextHp = Math.max(0, state.hp - poisonDamage);
  const nextState: RunState = {
    ...state,
    hp: nextHp,
    combat: {
      ...combat,
      discardPile: [...combat.discardPile, ...discardedHand],
      exhaustPile: [...combat.exhaustPile, ...etherealHand],
      hand: retainedHand,
      energy: 0,
      status: tickStatusForWindow(combat.status, window),
    },
  };

  if (nextHp <= 0) {
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

export function resolveEnemyTurn(state: RunState): RunState {
  const afterTurnStart = resolveEnemyTurnStart(state);

  if (afterTurnStart.combat?.enemy.hp === 0 || afterTurnStart.phase === "defeat") {
    return afterTurnStart;
  }

  const afterIntent = resolveEnemyIntent(afterTurnStart);

  if (afterIntent.phase === "defeat" || afterIntent.combat?.enemy.hp === 0) {
    return afterIntent;
  }

  return resolveEnemyTurnEnd(afterIntent);
}

export function resolvePlayerTurnStart(content: RunContent, state: RunState): RunState {
  const combat = getCombat(state);
  const cardsToDraw = Math.max(0, HAND_SIZE - combat.hand.length);
  const drawn = drawCards(combat.drawPile, combat.discardPile, cardsToDraw, state.rng);
  const nextBlock = getTotalPassiveValue(content, state, "retainBlock") > 0 ? combat.block : 0;
  const phasedEnemy = syncEnemyPhase(combat.enemy);

  return appendLog(
    {
      ...state,
      rng: drawn.rng,
      combat: {
        ...combat,
        enemy: phasedEnemy,
        drawPile: drawn.drawPile,
        discardPile: drawn.discardPile,
        hand: [...combat.hand, ...drawn.drawn],
        energy: STARTING_ENERGY + getRelicValue(content, state, "combatEnergy"),
        block: nextBlock,
        turn: combat.turn + 1,
        passives: combat.passives,
      },
    },
    { type: "turnStarted", turn: combat.turn + 1, intent: getCurrentIntent(phasedEnemy) },
  );
}

function resolveEnemyTurnStart(state: RunState): RunState {
  const window: CombatTimingWindow = "enemyTurnStart";
  const combat = getCombat(state);
  const enemyPoisonDamage = combat.enemy.status.poison;
  const enemy = syncEnemyPhase({
    ...combat.enemy,
    hp: Math.max(0, combat.enemy.hp - enemyPoisonDamage),
    status: tickStatusForWindow(combat.enemy.status, window),
  });

  return {
    ...state,
    combat: {
      ...combat,
      enemy,
    },
  };
}

function resolveEnemyIntent(state: RunState): RunState {
  const combat = getCombat(state);
  const intent = getCurrentIntent(combat.enemy);
  let enemy = combat.enemy;
  let hp = state.hp;
  let block = combat.block;
  let playerStatus = combat.status;

  if (intent.clearPlayerBlock) {
    block = 0;
  }

  if (intent.kind === "attack" || intent.kind === "attackBlock") {
    const attackDamage = computeAttackDamage((intent.damage ?? 0) + enemy.strength, enemy.status, playerStatus);
    const hits = Math.max(1, intent.hits ?? 1);

    for (let hit = 0; hit < hits; hit += 1) {
      const absorbed = Math.min(block, attackDamage);
      block -= absorbed;
      hp -= attackDamage - absorbed;
    }
  }

  if (intent.kind === "attackBlock" || intent.kind === "block" || intent.kind === "buff") {
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

  if ((intent.selfStrength ?? 0) > 0) {
    enemy = {
      ...enemy,
      strength: enemy.strength + (intent.selfStrength ?? 0),
    };
  }

  if (intent.cleanse) {
    enemy = {
      ...enemy,
      status: createCombatStatus(),
    };
  }

  playerStatus = {
    weak: playerStatus.weak + (intent.weak ?? 0),
    vulnerable: playerStatus.vulnerable + (intent.vulnerable ?? 0),
    poison: playerStatus.poison + (intent.poison ?? 0),
  };

  const nextState = appendLog(
    {
      ...state,
      hp: Math.max(hp, 0),
      combat: {
        ...combat,
        enemy,
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

function resolveEnemyTurnEnd(state: RunState): RunState {
  const window: CombatTimingWindow = "enemyTurnEnd";
  const combat = getCombat(state);
  const phasedEnemy = syncEnemyPhase({
    ...combat.enemy,
    status: tickStatusForWindow(combat.enemy.status, window),
  });
  const nextEnemy: EnemyState = phasedEnemy.phaseIndex === combat.enemy.phaseIndex ? advanceEnemyIntent(phasedEnemy) : phasedEnemy;

  return {
    ...state,
    combat: {
      ...combat,
      enemy: nextEnemy,
    },
  };
}

function tickStatusForWindow(status: EnemyState["status"], window: CombatTimingWindow): EnemyState["status"] {
  switch (window) {
    case "playerTurnEnd":
      return tickStatusForPlayer(status);
    case "enemyTurnStart":
      return tickStatusForPoisonStart(status);
    case "enemyTurnEnd":
      return tickStatusForEnemy(status);
    case "playerTurnStart":
    case "beforeCardResolve":
    case "afterCardResolve":
    case "enemyIntentResolve":
      return status;
    default:
      throw new Error(`unsupported combat timing window: ${window}`);
  }
}

function tickStatusForPlayer(status: EnemyState["status"]): EnemyState["status"] {
  return {
    weak: Math.max(0, status.weak - 1),
    vulnerable: Math.max(0, status.vulnerable - 1),
    poison: Math.max(0, status.poison - 1),
  };
}

function tickStatusForPoisonStart(status: EnemyState["status"]): EnemyState["status"] {
  return {
    ...status,
    poison: Math.max(0, status.poison - 1),
  };
}

function tickStatusForEnemy(status: EnemyState["status"]): EnemyState["status"] {
  return {
    weak: Math.max(0, status.weak - 1),
    vulnerable: Math.max(0, status.vulnerable - 1),
    poison: status.poison,
  };
}
