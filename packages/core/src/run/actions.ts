import { REST_FORTIFY, REST_HEAL, SHOP_CARD_PRICE, SHOP_CARD_REMOVE_PRICE } from "../constants.js";
import { finishCombat, resolveEnemyTurn, startPlayerTurn } from "../combat.js";
import { enterNode } from "../node.js";
import { finishNode } from "../progression.js";
import {
  applyDamageToEnemy,
  appendLog,
  assertNever,
  buildRemovableDeckIndices,
  getCombat,
  getNode,
  getRelicValue,
} from "../shared.js";
import type { LogEffect, RestOptionId, RunAction, RunContent, RunState } from "../types.js";
import { getCard } from "../validate.js";

export function applyAction(content: RunContent, state: RunState, action: RunAction): RunState {
  switch (action.type) {
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

  const currentNode = getNode(content, state.currentNodeId);

  if (!currentNode.nextIds.includes(nodeId)) {
    throw new Error(`node ${nodeId} is not reachable from ${currentNode.id}`);
  }

  const nextNode = getNode(content, nodeId);
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
  const effects: LogEffect[] = [];

  if (card.damage && card.damage > 0) {
    enemy = applyDamageToEnemy(enemy, card.damage);
    effects.push({ type: "damage", amount: card.damage });
  }

  if (card.block && card.block > 0) {
    block += card.block;
    effects.push({ type: "block", amount: card.block });
  }

  const nextState = appendLog(
    {
      ...state,
      combat: {
        ...combat,
        enemy,
        hand: combat.hand.filter((_, index) => index !== handIndex),
        discardPile: [...combat.discardPile, cardId],
        energy: combat.energy - card.cost,
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
  let nextState: RunState = {
    ...state,
    combat: {
      ...combat,
      discardPile: [...combat.discardPile, ...combat.hand],
      hand: [],
      energy: 0,
    },
  };

  nextState = resolveEnemyTurn(nextState);

  if (nextState.phase === "defeat") {
    return nextState;
  }

  return startPlayerTurn(content, nextState);
}

function chooseRest(content: RunContent, state: RunState, optionId: RestOptionId): RunState {
  if (state.phase !== "rest") {
    throw new Error("rest options are only available at rest nodes");
  }

  const currentNode = getNode(content, state.currentNodeId);
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

  return finishNode(nextState, currentNode);
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

  return finishNode(nextState, getNode(content, state.currentNodeId));
}

function skipReward(content: RunContent, state: RunState): RunState {
  if (state.phase !== "reward") {
    throw new Error("reward choices are only available after combat");
  }

  return finishNode(
    appendLog({ ...state, reward: undefined }, { type: "rewardSkipped" }),
    getNode(content, state.currentNodeId),
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

  return finishNode(appendLog({ ...state, shop: undefined }, { type: "shopLeft" }), getNode(content, state.currentNodeId));
}
