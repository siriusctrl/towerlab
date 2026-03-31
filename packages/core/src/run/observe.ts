import { REST_HEAL_RATIO, REST_OPTION_IDS, STARTING_ENERGY } from "../constants.js";
import { getDeckRemovalPrice, getRemainingDeckRemovals } from "../shop.js";
import { getAct, getCombat, getCurrentIntent, getNode, getRelicValue, listActiveCombatPassives, materializeCardDefinition, materializeCardInstance } from "../shared.js";
import type { Observation, RewardItemObservation, RunAction, RunContent, RunState } from "../types.js";
import { getCard, getRelic } from "../validate.js";

export function observeRun(content: RunContent, state: RunState): Observation {
  const currentNode = getNode(content, state.act, state.currentNodeId);
  const base = {
    seed: state.seed,
    characterId: state.characterId,
    act: state.act,
    totalActs: content.acts.length,
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
      baseEnergy: STARTING_ENERGY + getRelicValue(content, state, "combatEnergy"),
      block: combat.block,
      status: combat.status,
      activePassives: listActiveCombatPassives(content, state),
      hand: combat.hand.map((card) => materializeCardInstance(content, card)),
      drawPileCount: combat.drawPile.length,
      discardPileCount: combat.discardPile.length,
      exhaustPileCount: combat.exhaustPile.length,
      enemy: {
        id: combat.enemy.id,
        name: combat.enemy.name,
        hp: combat.enemy.hp,
        maxHp: combat.enemy.maxHp,
        block: combat.enemy.block,
        status: combat.enemy.status,
        intent: currentIntent,
      },
    };
  }

  const nextNodes = currentNode.nextIds.map((nodeId) => getNode(content, state.act, nodeId));

  if (state.phase === "blessing") {
    return {
      ...base,
      phase: "blessing",
      blessings: getAct(content, state.act).blessings,
      nextNodes,
    };
  }

  if (state.phase === "map") {
    return {
      ...base,
      phase: "map",
      nextNodes,
    };
  }

  if (state.phase === "rest") {
    const healAmount = Math.max(1, Math.floor(state.maxHp * REST_HEAL_RATIO)) + getRelicValue(content, state, "restHealBonus");
    const restOptions = REST_OPTION_IDS.map((optionId) => {
      if (optionId === "recover") {
        return {
          id: optionId,
          label: "Recover",
          description: `Heal ${healAmount} HP.`,
        };
      }

      return {
        id: optionId,
        label: "Upgrade",
        description: "Upgrade a card in your deck.",
      };
    });
    const upgradableDeckCards = (state.rest?.upgradableDeckIndices ?? [])
      .filter((index) => index >= 0 && index < state.deck.length)
      .map((deckIndex) => {
        const card = state.deck[deckIndex]!;
        const cardDefinition = getCard(content, card.cardId);
        return {
          deckIndex,
          card: materializeCardInstance(content, card),
          upgradedCard: materializeCardDefinition(cardDefinition, true, card.instanceId),
        };
      });

    return {
      ...base,
      phase: "rest",
      mode: state.rest?.mode ?? "menu",
      restOptions,
      upgradableDeckCards,
      nextNodes,
    };
  }

  if (state.phase === "reward") {
    const rewardItems = (state.reward?.items ?? []).reduce<RewardItemObservation[]>((items, item, rewardIndex) => {
      if (item.claimed) {
        return items;
      }

      if (item.kind === "gold") {
        items.push({ kind: "gold", rewardIndex, amount: item.amount });
        return items;
      }

      if (item.kind === "relic") {
        items.push({ kind: "relic", rewardIndex, relic: getRelic(content, item.relicId) });
        return items;
      }

      items.push({
        kind: "cards",
        rewardIndex,
        cardChoices: item.cardChoices.map((cardId) => materializeCardDefinition(getCard(content, cardId), false)),
      });
      return items;
    }, []);
    const activeCardReward = state.reward?.mode === "cards"
      ? state.reward.items.find((item) => item.kind === "cards" && !item.claimed)
      : null;
    const cardChoices = activeCardReward?.kind === "cards"
      ? activeCardReward.cardChoices.map((cardId) => materializeCardDefinition(getCard(content, cardId), false))
      : [];

    return {
      ...base,
      phase: "reward",
      mode: state.reward?.mode ?? "menu",
      rewardItems,
      cardChoices,
      nextNodes,
    };
  }

  if (state.phase === "shop") {
    const forSale = state.shop?.forSale ?? [];
    const nextRemoveCost = getDeckRemovalPrice(state.totalDeckRemovals);
    const removableDeckCards = (state.shop?.removableDeckIndices ?? [])
      .filter((index) => index >= 0 && index < state.deck.length)
      .map((deckIndex) => ({ deckIndex, card: materializeCardInstance(content, state.deck[deckIndex]!) }));

    return {
      ...base,
      phase: "shop",
      forSale: forSale.map((offer) => ({
        card: materializeCardDefinition(getCard(content, offer.cardId), false),
        price: offer.price,
      })),
      removableDeckCards,
      removeDeckCardCost: nextRemoveCost,
      remainingDeckRemovals: getRemainingDeckRemovals(state.shop?.removalsThisShop ?? 0),
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
  if (state.phase === "blessing") {
    return getAct(content, state.act).blessings.map((blessing) => ({ type: "chooseBlessing", blessingId: blessing.id }));
  }

  if (state.phase === "combat") {
    const combat = getCombat(state);
    const actions: RunAction[] = combat.hand.flatMap((instance, handIndex) => {
      const card = materializeCardInstance(content, instance);
      return card.cost <= combat.energy ? [{ type: "playCard", handIndex }] : [];
    });

    return [...actions, { type: "endTurn" }];
  }

  if (state.phase === "map") {
    const currentNode = getNode(content, state.act, state.currentNodeId);
    return currentNode.nextIds.map((nodeId) => ({ type: "choosePath", nodeId }));
  }

  if (state.phase === "rest") {
    if (state.rest?.mode === "upgrade") {
      return state.rest.upgradableDeckIndices.map((deckIndex): RunAction => ({ type: "upgradeRestCard", deckIndex }));
    }

    return REST_OPTION_IDS.map((optionId) => ({ type: "chooseRest", optionId }));
  }

  if (state.phase === "reward") {
    if (state.reward?.mode === "cards") {
      const cardReward = state.reward.items.find((item) => item.kind === "cards" && !item.claimed);
      const choices = cardReward?.kind === "cards" ? cardReward.cardChoices : [];
      return [
        ...choices.map((_, rewardIndex): RunAction => ({ type: "takeRewardCard", rewardIndex })),
        { type: "backReward" },
        { type: "skipReward" },
      ];
    }

    return [
      ...(state.reward?.items.flatMap((item, rewardIndex): RunAction[] => (item.claimed ? [] : [{ type: "takeReward", rewardIndex }])) ?? []),
      { type: "skipReward" },
    ];
  }

  if (state.phase === "shop") {
    const shop = state.shop;

    if (!shop) {
      throw new Error("shop state is missing");
    }

    const removeCost = getDeckRemovalPrice(state.totalDeckRemovals);
    const cardActions = shop.forSale.flatMap((offer, saleIndex): RunAction[] =>
      state.gold >= offer.price ? [{ type: "buyShop", saleIndex }] : [],
    );
    const removeActions = shop.removableDeckIndices.flatMap((deckIndex): RunAction[] =>
      state.gold >= removeCost ? [{ type: "removeDeckCard", deckIndex }] : [],
    );

    return [...cardActions, ...removeActions, { type: "leaveShop" }];
  }

  return [];
}
