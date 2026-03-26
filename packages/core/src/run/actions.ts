import { REST_FORTIFY, REST_HEAL, SHOP_CARD_PRICE, SHOP_CARD_REMOVE_PRICE } from "../constants.js";
import { finishCombat, resolveEnemyTurn, startPlayerTurn } from "../combat.js";
import { enterNode } from "../node.js";
import { finishNode } from "../progression.js";
import { drawCards } from "../rng.js";
import {
  applyDamageToEnemy,
  applyStatus,
  appendLog,
  assertNever,
  buildRemovableDeckIndices,
  computeAttackDamage,
  getAct,
  getCombat,
  getNode,
  getRelicValue,
  tickStatus,
} from "../shared.js";
import type { BlessingDefinition, LogEffect, RestOptionId, RunAction, RunContent, RunState } from "../types.js";
import { getCard } from "../validate.js";

export function applyAction(content: RunContent, state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "chooseBlessing":
      return chooseBlessing(content, state, action.blessingId);
    case "choosePath":
      return choosePath(content, state, action.nodeId);
    case "playCard":
      return playCard(content, state, action.handIndex);
    case "endTurn":
      return endTurn(content, state);
    case "chooseRest":
      return chooseRest(content, state, action.optionId);
    case "takeReward":
      return takeReward(content, state, action.rewardIndex);
    case "skipReward":
      return skipReward(content, state);
    case "buyShop":
      return buyShop(content, state, action.saleIndex);
    case "removeDeckCard":
      return removeDeckCard(content, state, action.deckIndex);
    case "leaveShop":
      return leaveShop(content, state);
    default:
      return assertNever(action);
  }
}

function choosePath(content: RunContent, state: RunState, nodeId: string): RunState {
  if (state.phase !== "map") {
    throw new Error("path choices are only available on the map");
  }

  const currentNode = getNode(content, state.act, state.currentNodeId);

  if (!currentNode.nextIds.includes(nodeId)) {
    throw new Error(`node ${nodeId} is not reachable from ${currentNode.id}`);
  }

  const nextNode = getNode(content, state.act, nodeId);
  const nextState = appendLog(
    {
      ...state,
      floor: currentNode.kind === "start" ? state.floor : state.floor + 1,
      currentNodeId: nextNode.id,
      reward: undefined,
      shop: undefined,
    },
    { type: "movedToNode", nodeId: nextNode.id, kind: nextNode.kind },
  );

  return enterNode(content, nextState, nextNode);
}

function chooseBlessing(content: RunContent, state: RunState, blessingId: string): RunState {
  if (state.phase !== "blessing") {
    throw new Error("blessings are only available at the start of an act");
  }

  const blessing = getAct(content, state.act).blessings.find((candidate) => candidate.id === blessingId);

  if (!blessing) {
    throw new Error(`unknown blessing: ${blessingId}`);
  }

  let nextState = appendLog(state, { type: "blessingChosen", blessingId });

  nextState = applyBlessing(content, nextState, blessing);

  return appendLog(
    {
      ...nextState,
      phase: "map",
      reward: undefined,
      shop: undefined,
    },
    { type: "chooseNextPath" },
  );
}

function playCard(content: RunContent, state: RunState, handIndex: number): RunState {
  if (state.phase !== "combat") {
    throw new Error("cards can only be played during combat");
  }

  const combat = getCombat(state);
  const cardId = combat.hand[handIndex];

  if (!cardId) {
    throw new Error(`hand index ${handIndex} is not available`);
  }

  const card = getCard(content, cardId);

  if (card.cost > combat.energy) {
    throw new Error(`${card.name} costs ${card.cost} energy`);
  }

  let enemy = combat.enemy;
  let block = combat.block;
  let hp = state.hp;
  let energy = combat.energy - card.cost;
  let drawPile = combat.drawPile;
  let discardPile = card.exhaust ? combat.discardPile : [...combat.discardPile, cardId];
  let hand = combat.hand.filter((_, index) => index !== handIndex);
  let nextRng = state.rng;
  const effects: LogEffect[] = [];

  if (card.damage && card.damage > 0) {
    const dealtDamage = computeAttackDamage(card.damage, combat.status, enemy.status);
    enemy = applyDamageToEnemy(enemy, dealtDamage);
    effects.push({ type: "damage", amount: dealtDamage });
  }

  if (card.block && card.block > 0) {
    block += card.block;
    effects.push({ type: "block", amount: card.block });
  }

  if (card.draw && card.draw > 0) {
    const drawnCards = drawCards(drawPile, discardPile, card.draw, nextRng);
    drawPile = drawnCards.drawPile;
    discardPile = drawnCards.discardPile;
    hand = [...hand, ...drawnCards.drawn];
    nextRng = drawnCards.rng;

    if (drawnCards.drawn.length > 0) {
      effects.push({ type: "draw", amount: drawnCards.drawn.length });
    }
  }

  if (card.energy && card.energy > 0) {
    energy += card.energy;
    effects.push({ type: "energy", amount: card.energy });
  }

  if (card.heal && card.heal > 0) {
    const healed = Math.min(card.heal, state.maxHp - state.hp);
    hp = Math.min(state.maxHp, state.hp + card.heal);

    if (healed > 0) {
      effects.push({ type: "heal", amount: healed });
    }
  }

  if ((card.weak ?? 0) > 0) {
    const weak = card.weak ?? 0;
    enemy = { ...enemy, status: applyStatus(enemy.status, { weak }) };
    effects.push({ type: "weak", amount: weak });
  }

  if ((card.vulnerable ?? 0) > 0) {
    const vulnerable = card.vulnerable ?? 0;
    enemy = { ...enemy, status: applyStatus(enemy.status, { vulnerable }) };
    effects.push({ type: "vulnerable", amount: vulnerable });
  }

  if ((card.poison ?? 0) > 0) {
    const poison = card.poison ?? 0;
    enemy = { ...enemy, status: applyStatus(enemy.status, { poison }) };
    effects.push({ type: "poison", amount: poison });
  }

  if ((card.poisonMultiplier ?? 1) > 1 && enemy.status.poison > 0) {
    const nextPoison = enemy.status.poison * card.poisonMultiplier!;
    const addedPoison = nextPoison - enemy.status.poison;
    enemy = { ...enemy, status: { ...enemy.status, poison: nextPoison } };
    effects.push({ type: "poison", amount: addedPoison });
  }

  if (card.exhaust) {
    effects.push({ type: "exhaust" });
  }

  const nextState = appendLog(
    {
      ...state,
      hp,
      rng: nextRng,
      combat: {
        ...combat,
        enemy,
        drawPile,
        hand,
        discardPile,
        energy,
        block,
      },
    },
    { type: "playedCard", cardId, effects },
  );

  if (enemy.hp <= 0) {
    return finishCombat(content, nextState);
  }

  return nextState;
}

function endTurn(content: RunContent, state: RunState): RunState {
  if (state.phase !== "combat") {
    throw new Error("ending the turn is only available during combat");
  }

  const combat = getCombat(state);
  const retainedHand = combat.hand.filter((cardId) => getCard(content, cardId).retain);
  const discardedHand = combat.hand.filter((cardId) => !getCard(content, cardId).retain);
  const poisonDamage = combat.status.poison;
  const nextHp = Math.max(0, state.hp - poisonDamage);
  let nextState: RunState = {
    ...state,
    hp: nextHp,
    combat: {
      ...combat,
      discardPile: [...combat.discardPile, ...discardedHand],
      hand: retainedHand,
      energy: 0,
      status: tickStatus(combat.status),
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

  nextState = resolveEnemyTurn(nextState);

  if (nextState.phase === "defeat") {
    return nextState;
  }

  if (nextState.combat?.enemy.hp === 0) {
    return finishCombat(content, nextState);
  }

  return startPlayerTurn(content, nextState);
}

function chooseRest(content: RunContent, state: RunState, optionId: RestOptionId): RunState {
  if (state.phase !== "rest") {
    throw new Error("rest options are only available at rest nodes");
  }

  const currentNode = getNode(content, state.act, state.currentNodeId);
  let nextState = state;

  if (optionId === "recover") {
    const healAmount = REST_HEAL + getRelicValue(content, state, "restHealBonus");
    const healed = Math.min(healAmount, state.maxHp - state.hp);

    nextState = appendLog(
      {
        ...state,
        hp: Math.min(state.maxHp, state.hp + healAmount),
      },
      { type: "recoveredHp", amount: healed },
    );
  } else if (optionId === "fortify") {
    nextState = appendLog(
      {
        ...state,
        maxHp: state.maxHp + REST_FORTIFY,
        hp: state.hp + REST_FORTIFY,
      },
      { type: "fortified", maxHp: REST_FORTIFY },
    );
  } else {
    return assertNever(optionId);
  }

  return finishNode(content, nextState, currentNode);
}

function takeReward(content: RunContent, state: RunState, rewardIndex: number): RunState {
  if (state.phase !== "reward") {
    throw new Error("reward choices are only available after combat");
  }

  const choices = state.reward?.cardChoices ?? [];
  const cardId = choices[rewardIndex];

  if (!cardId) {
    throw new Error(`reward index ${rewardIndex} is not available`);
  }

  const nextState = appendLog(
    {
      ...state,
      deck: [...state.deck, cardId],
      reward: undefined,
    },
    { type: "rewardCardAdded", cardId },
  );

  return finishNode(content, nextState, getNode(content, state.act, state.currentNodeId));
}

function skipReward(content: RunContent, state: RunState): RunState {
  if (state.phase !== "reward") {
    throw new Error("reward choices are only available after combat");
  }

  return finishNode(
    content,
    appendLog({ ...state, reward: undefined }, { type: "rewardSkipped" }),
    getNode(content, state.act, state.currentNodeId),
  );
}

function buyShop(content: RunContent, state: RunState, saleIndex: number): RunState {
  if (state.phase !== "shop") {
    throw new Error("shop actions are only available at shop nodes");
  }

  const shop = state.shop;

  if (!shop) {
    throw new Error("shop state is missing");
  }

  const cardId = shop.forSale[saleIndex];

  if (!cardId) {
    throw new Error(`shop card index ${saleIndex} is not available`);
  }

  const price = Math.max(1, SHOP_CARD_PRICE - getRelicValue(content, state, "shopDiscount"));

  if (state.gold < price) {
    throw new Error(`Need ${price} gold to buy ${getCard(content, cardId).name}`);
  }

  return appendLog(
    {
      ...state,
      gold: state.gold - price,
      deck: [...state.deck, cardId],
      shop: {
        ...shop,
        forSale: shop.forSale.filter((_, index) => index !== saleIndex),
        removableDeckIndices: buildRemovableDeckIndices([...state.deck, cardId]),
      },
    },
    { type: "shopCardBought", cardId, gold: price },
  );
}

function removeDeckCard(content: RunContent, state: RunState, deckIndex: number): RunState {
  if (state.phase !== "shop") {
    throw new Error("deck removal is only available at shop nodes");
  }

  const shop = state.shop;

  if (!shop) {
    throw new Error("shop state is missing");
  }

  if (state.deck[deckIndex] === undefined) {
    throw new Error(`deck index ${deckIndex} is not available`);
  }

  if (!shop.removableDeckIndices.includes(deckIndex)) {
    throw new Error(`deck index ${deckIndex} cannot be removed now`);
  }

  if (state.gold < SHOP_CARD_REMOVE_PRICE) {
    throw new Error(`Need ${SHOP_CARD_REMOVE_PRICE} gold to remove ${getCard(content, state.deck[deckIndex]).name}`);
  }

  const nextDeck = [...state.deck];
  const removedCardId = nextDeck[deckIndex];

  if (!removedCardId) {
    throw new Error(`deck index ${deckIndex} is not available`);
  }

  nextDeck.splice(deckIndex, 1);

  return appendLog(
    {
      ...state,
      deck: nextDeck,
      gold: state.gold - SHOP_CARD_REMOVE_PRICE,
      shop: {
        ...shop,
        removableDeckIndices: buildRemovableDeckIndices(nextDeck),
      },
    },
    { type: "deckCardRemoved", cardId: removedCardId, gold: SHOP_CARD_REMOVE_PRICE },
  );
}

function leaveShop(content: RunContent, state: RunState): RunState {
  if (state.phase !== "shop") {
    throw new Error("can only leave when in shop");
  }

  return finishNode(content, appendLog({ ...state, shop: undefined }, { type: "shopLeft" }), getNode(content, state.act, state.currentNodeId));
}

function applyBlessing(content: RunContent, state: RunState, blessing: BlessingDefinition): RunState {
  if (blessing.kind === "heal") {
    const amount = Math.min(blessing.value ?? 0, state.maxHp - state.hp);
    return appendLog(
      {
        ...state,
        hp: Math.min(state.maxHp, state.hp + (blessing.value ?? 0)),
      },
      { type: "recoveredHp", amount },
    );
  }

  if (blessing.kind === "gold") {
    const amount = blessing.value ?? 0;
    return appendLog(
      {
        ...state,
        gold: state.gold + amount,
      },
      { type: "goldGained", amount },
    );
  }

  if (blessing.kind === "maxHp") {
    const amount = blessing.value ?? 0;
    return appendLog(
      {
        ...state,
        hp: state.hp + amount,
        maxHp: state.maxHp + amount,
      },
      { type: "fortified", maxHp: amount },
    );
  }

  if (blessing.kind === "card") {
    const cardId = blessing.cardId;

    if (!cardId) {
      throw new Error(`blessing ${blessing.id} must define cardId`);
    }

    return appendLog(
      {
        ...state,
        deck: [...state.deck, cardId],
      },
      { type: "blessingCardAdded", cardId },
    );
  }

  return assertNever(blessing.kind);
}
