import { REST_OPTIONS, SHOP_CARD_PRICE, SHOP_CARD_REMOVE_PRICE } from "../constants.js";
import { getCombat, getCurrentIntent, getNode, getRelicValue } from "../shared.js";
import type { Observation, RunAction, RunContent, RunState } from "../types.js";
import { getCard, getRelic } from "../validate.js";

export function observeRun(content: RunContent, state: RunState): Observation {
  const currentNode = getNode(content, state.currentNodeId);
  const base = {
    seed: state.seed,
    phase: state.phase,
    hp: state.hp,
    maxHp: state.maxHp,
    gold: state.gold,
    floor: state.floor,
    currentNode,
    relics: state.relics.map((id) => getRelic(content, id)),
    log: state.log,
  };

  if (state.phase === "combat") {
    const combat = getCombat(state);
    const currentIntent = getCurrentIntent(combat.enemy);

    return {
      ...base,
      phase: "combat",
      energy: combat.energy,
      block: combat.block,
      hand: combat.hand.map((cardId) => getCard(content, cardId)),
      drawPileCount: combat.drawPile.length,
      discardPileCount: combat.discardPile.length,
      enemy: {
        id: combat.enemy.id,
        name: combat.enemy.name,
        hp: combat.enemy.hp,
        maxHp: combat.enemy.maxHp,
        block: combat.enemy.block,
        intent: currentIntent,
      },
    };
  }

  const nextNodes = currentNode.nextIds.map((nodeId) => getNode(content, nodeId));

  if (state.phase === "map") {
    return {
      ...base,
      phase: "map",
      nextNodes,
    };
  }

  if (state.phase === "rest") {
    return {
      ...base,
      phase: "rest",
      restOptions: REST_OPTIONS,
      nextNodes,
    };
  }

  if (state.phase === "reward") {
    const choices = state.reward?.cardChoices ?? [];

    return {
      ...base,
      phase: "reward",
      cardChoices: choices.map((cardId) => getCard(content, cardId)),
      nextNodes,
    };
  }

  if (state.phase === "shop") {
    const forSale = state.shop?.forSale ?? [];
    const removableDeckCards = (state.shop?.removableDeckIndices ?? [])
      .filter((index) => index >= 0 && index < state.deck.length)
      .map((deckIndex) => ({ deckIndex, card: getCard(content, state.deck[deckIndex]) }));

    return {
      ...base,
      phase: "shop",
      forSale: forSale.map((cardId) => getCard(content, cardId)),
      removableDeckCards,
      removeDeckCardCost: SHOP_CARD_REMOVE_PRICE,
      nextNodes,
    };
  }

  return {
    ...base,
    phase: state.phase,
    nextNodes,
  };
}

export function legalActions(content: RunContent, state: RunState): RunAction[] {
  if (state.phase === "combat") {
    const combat = getCombat(state);
    const actions: RunAction[] = combat.hand.flatMap((cardId, handIndex) => {
      const card = getCard(content, cardId);
      return card.cost <= combat.energy ? [{ type: "playCard", handIndex }] : [];
    });

    return [...actions, { type: "endTurn" }];
  }

  if (state.phase === "map") {
    const currentNode = getNode(content, state.currentNodeId);
    return currentNode.nextIds.map((nodeId) => ({ type: "choosePath", nodeId }));
  }

  if (state.phase === "rest") {
    return REST_OPTIONS.map((option) => ({ type: "chooseRest", optionId: option.id }));
  }

  if (state.phase === "reward") {
    const choices = state.reward?.cardChoices ?? [];
    return [
      ...choices.map((_, rewardIndex): RunAction => ({ type: "takeReward", rewardIndex })),
      { type: "skipReward" },
    ];
  }

  if (state.phase === "shop") {
    const shop = state.shop;

    if (!shop) {
      throw new Error("shop state is missing");
    }

    const cardPrice = Math.max(1, SHOP_CARD_PRICE - getRelicValue(content, state, "shopDiscount"));
    const cardActions = shop.forSale.flatMap((_, saleIndex): RunAction[] =>
      state.gold >= cardPrice ? [{ type: "buyShop", saleIndex }] : [],
    );
    const removeActions = shop.removableDeckIndices.flatMap((deckIndex): RunAction[] =>
      state.gold >= SHOP_CARD_REMOVE_PRICE ? [{ type: "removeDeckCard", deckIndex }] : [],
    );

    return [...cardActions, ...removeActions, { type: "leaveShop" }];
  }

  return [];
}
