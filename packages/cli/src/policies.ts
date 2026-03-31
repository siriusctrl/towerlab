import { sampleContent } from "@towerlab/content";
import { legalActions, observeRun, type RunAction, type RunContent, type RunState } from "@towerlab/core";

export const BASELINE_POLICY_NAMES = ["random", "greedy", "heuristic"] as const;

export type BaselinePolicyName = (typeof BASELINE_POLICY_NAMES)[number];

export interface BaselinePolicy {
  name: BaselinePolicyName;
  chooseAction: (state: RunState, content?: RunContent) => RunAction;
}

export const baselinePolicies: Record<BaselinePolicyName, BaselinePolicy> = {
  random: {
    name: "random",
    chooseAction: (state, content = sampleContent) => chooseRandomAction(content, state),
  },
  greedy: {
    name: "greedy",
    chooseAction: (state, content = sampleContent) => chooseGreedyAction(content, state),
  },
  heuristic: {
    name: "heuristic",
    chooseAction: (state, content = sampleContent) => chooseHeuristicAction(content, state),
  },
};

export function getBaselinePolicy(name: BaselinePolicyName): BaselinePolicy {
  return baselinePolicies[name];
}

export function choosePolicyAction(
  name: BaselinePolicyName,
  state: RunState,
  content: RunContent = sampleContent,
): RunAction {
  return baselinePolicies[name].chooseAction(state, content);
}

function chooseRandomAction(content: RunContent, state: RunState): RunAction {
  const actions = legalActions(content, state);

  if (actions.length === 0) {
    throw new Error(`policy random cannot act during ${state.phase}`);
  }

  const index = state.rng % actions.length;
  return actions[index]!;
}

function chooseGreedyAction(content: RunContent, state: RunState): RunAction {
  const actions = legalActions(content, state);
  const observation = observeRun(content, state);

  if (observation.phase === "combat") {
    return chooseBestCombatAction(observation, actions, false);
  }

  if (observation.phase === "blessing") {
    return chooseBestBlessingAction(content, state, observation.blessings, actions, false);
  }

  if (observation.phase === "map") {
    return chooseBestMapAction(observation.nextNodes, actions, {
      boss: 100,
      elite: 80,
      battle: 60,
      shop: 30,
      rest: 20,
    });
  }

  if (observation.phase === "rest") {
    if (observation.mode === "upgrade") {
      return chooseBestUpgradeAction(content, observation.upgradableDeckCards, actions, false);
    }

    return observation.hp * 2 <= observation.maxHp
      ? { type: "chooseRest", optionId: "recover" }
      : { type: "chooseRest", optionId: "upgrade" };
  }

  if (observation.phase === "reward") {
    return chooseBestRewardAction(content, state, observation.cardChoices, actions, false);
  }

  if (observation.phase === "shop") {
    return chooseGreedyShopAction(content, state, actions);
  }

  return actions[0]!;
}

function chooseHeuristicAction(content: RunContent, state: RunState): RunAction {
  const actions = legalActions(content, state);
  const observation = observeRun(content, state);

  if (observation.phase === "combat") {
    return chooseBestCombatAction(observation, actions, true);
  }

  if (observation.phase === "blessing") {
    return chooseBestBlessingAction(content, state, observation.blessings, actions, true);
  }

  if (observation.phase === "map") {
    const hpRatio = observation.hp / observation.maxHp;
    return chooseBestMapAction(observation.nextNodes, actions, {
      boss: 100,
      elite: hpRatio >= 0.75 ? 90 : 10,
      battle: 50,
      shop: observation.gold >= 12 ? 85 : 30,
      rest: hpRatio <= 0.55 ? 95 : 20,
    });
  }

  if (observation.phase === "rest") {
    if (observation.mode === "upgrade") {
      return chooseBestUpgradeAction(content, observation.upgradableDeckCards, actions, true);
    }

    return observation.hp * 10 <= observation.maxHp * 7
      ? { type: "chooseRest", optionId: "recover" }
      : { type: "chooseRest", optionId: "upgrade" };
  }

  if (observation.phase === "reward") {
    return chooseBestRewardAction(content, state, observation.cardChoices, actions, true);
  }

  if (observation.phase === "shop") {
    return chooseHeuristicShopAction(content, state, actions);
  }

  return actions[0]!;
}

function chooseBestCombatAction(
  observation: ReturnType<typeof observeRun>,
  actions: RunAction[],
  preferDefense: boolean,
): RunAction {
  if (observation.phase !== "combat") {
    return actions[0]!;
  }

  const playableCards = actions.filter((action): action is Extract<RunAction, { type: "playCard" }> => action.type === "playCard");

  if (playableCards.length === 0) {
    return { type: "endTurn" };
  }

  const incomingDamage = observation.enemy.intent.damage ?? 0;
  const blockGap = Math.max(0, incomingDamage - observation.block);

  return playableCards.reduce((best, action) => {
    const card = observation.hand[action.handIndex]!;
    const score = scoreCombatCard(card.damage ?? 0, card.block ?? 0, card.cost, preferDefense ? blockGap : 0);
    const bestCard = observation.hand[best.handIndex]!;
    const bestScore = scoreCombatCard(
      bestCard.damage ?? 0,
      bestCard.block ?? 0,
      bestCard.cost,
      preferDefense ? blockGap : 0,
    );

    return score > bestScore ? action : best;
  });
}

function chooseBestMapAction(
  nextNodes: Array<{ id: string; kind: string }>,
  actions: RunAction[],
  scores: Record<string, number>,
): RunAction {
  const pathActions = actions.filter((action): action is Extract<RunAction, { type: "choosePath" }> => action.type === "choosePath");

  return pathActions.reduce((best, action) => {
    const node = nextNodes.find((candidate) => candidate.id === action.nodeId);
    const bestNode = nextNodes.find((candidate) => candidate.id === best.nodeId);
    const nodeScore = node ? scores[node.kind] ?? 0 : 0;
    const bestScore = bestNode ? scores[bestNode.kind] ?? 0 : 0;

    return nodeScore > bestScore ? action : best;
  });
}

function chooseBestBlessingAction(
  content: RunContent,
  state: RunState,
  blessings: Array<{ id: string; kind: string; value?: number; cardId?: string; relicId?: string }>,
  actions: RunAction[],
  preferSafety: boolean,
): RunAction {
  const blessingActions = actions.filter(
    (action): action is Extract<RunAction, { type: "chooseBlessing" }> => action.type === "chooseBlessing",
  );

  return blessingActions.reduce((best, action) => {
    const blessing = blessings.find((candidate) => candidate.id === action.blessingId);
    const bestBlessing = blessings.find((candidate) => candidate.id === best.blessingId);
    const blessingScore = blessing ? scoreBlessing(content, state, blessing, preferSafety) : Number.NEGATIVE_INFINITY;
    const bestScore = bestBlessing ? scoreBlessing(content, state, bestBlessing, preferSafety) : Number.NEGATIVE_INFINITY;

    return blessingScore > bestScore ? action : best;
  });
}

function chooseBestRewardAction(
  content: RunContent,
  state: RunState,
  cards: Array<{ id: string; damage?: number; block?: number }>,
  actions: RunAction[],
  preferFlexibleCards: boolean,
): RunAction {
  const directRewardActions = actions.filter((action): action is Extract<RunAction, { type: "takeReward" }> => action.type === "takeReward");
  const cardRewardActions = actions.filter(
    (action): action is Extract<RunAction, { type: "takeRewardCard" }> => action.type === "takeRewardCard",
  );

  if (cardRewardActions.length > 0) {
    const bestReward = cardRewardActions.reduce((best, action) => {
      const card = cards[action.rewardIndex]!;
      const score = scoreRewardCard(content, card.id, card.damage ?? 0, card.block ?? 0, preferFlexibleCards);
      const bestCard = cards[best.rewardIndex]!;
      const bestScore = scoreRewardCard(content, bestCard.id, bestCard.damage ?? 0, bestCard.block ?? 0, preferFlexibleCards);

      return score > bestScore ? action : best;
    });

    const bestCard = cards[bestReward.rewardIndex]!;
    const bestScore = scoreRewardCard(content, bestCard.id, bestCard.damage ?? 0, bestCard.block ?? 0, preferFlexibleCards);

    return preferFlexibleCards && bestScore <= 10 ? { type: "skipReward" } : bestReward;
  }

  if (directRewardActions.length === 0) {
    return actions[0]!;
  }

  const rewardItems = state.reward?.items ?? [];
  const goldAction = directRewardActions.find((action) => rewardItems[action.rewardIndex]?.kind === "gold");
  if (goldAction) {
    return goldAction;
  }

  const relicAction = directRewardActions.find((action) => rewardItems[action.rewardIndex]?.kind === "relic");
  if (relicAction) {
    return relicAction;
  }

  const cardMenuAction = directRewardActions.find((action) => rewardItems[action.rewardIndex]?.kind === "cards");
  if (cardMenuAction) {
    return cardMenuAction;
  }

  return actions.find((action) => action.type === "skipReward") ?? actions[0]!;
}

function chooseBestUpgradeAction(
  content: RunContent,
  cards: Array<{ deckIndex: number; card: { id: string; damage?: number; block?: number; draw?: number; energy?: number; heal?: number }; upgradedCard: { id: string; damage?: number; block?: number; draw?: number; energy?: number; heal?: number } }>,
  actions: RunAction[],
  preferFlexibleCards: boolean,
): RunAction {
  const upgradeActions = actions.filter((action): action is Extract<RunAction, { type: "upgradeRestCard" }> => action.type === "upgradeRestCard");

  return upgradeActions.reduce((best, action) => {
    const card = cards.find((entry) => entry.deckIndex === action.deckIndex);
    const bestCard = cards.find((entry) => entry.deckIndex === best.deckIndex);
    const score = card ? scoreUpgrade(card, content, preferFlexibleCards) : Number.NEGATIVE_INFINITY;
    const bestScore = bestCard ? scoreUpgrade(bestCard, content, preferFlexibleCards) : Number.NEGATIVE_INFINITY;
    return score > bestScore ? action : best;
  }, upgradeActions[0] ?? actions[0]!);
}

function chooseGreedyShopAction(content: RunContent, state: RunState, actions: RunAction[]): RunAction {
  const buyActions = actions.filter((action): action is Extract<RunAction, { type: "buyShop" }> => action.type === "buyShop");

  if (buyActions.length > 0 && state.shop) {
    return buyActions.reduce((best, action) => {
      const cardId = state.shop?.forSale[action.saleIndex]?.cardId!;
      const bestCardId = state.shop?.forSale[best.saleIndex]?.cardId!;

      return scoreRewardCard(content, cardId, content.cards[cardId]?.damage ?? 0, content.cards[cardId]?.block ?? 0, false) >
          scoreRewardCard(content, bestCardId, content.cards[bestCardId]?.damage ?? 0, content.cards[bestCardId]?.block ?? 0, false)
        ? action
        : best;
    });
  }

  return chooseRemovalOrLeave(state, actions) ?? { type: "leaveShop" };
}

function chooseHeuristicShopAction(content: RunContent, state: RunState, actions: RunAction[]): RunAction {
  const removal = chooseStarterRemoval(content, state, actions);

  if (removal) {
    return removal;
  }

  const buyActions = actions.filter((action): action is Extract<RunAction, { type: "buyShop" }> => action.type === "buyShop");

  if (buyActions.length === 0 || !state.shop) {
    return { type: "leaveShop" };
  }

  const bestBuy = buyActions.reduce((best, action) => {
    const cardId = state.shop?.forSale[action.saleIndex]?.cardId!;
    const bestCardId = state.shop?.forSale[best.saleIndex]?.cardId!;
    const score = scoreRewardCard(content, cardId, content.cards[cardId]?.damage ?? 0, content.cards[cardId]?.block ?? 0, true);
    const bestScore = scoreRewardCard(
      content,
      bestCardId,
      content.cards[bestCardId]?.damage ?? 0,
      content.cards[bestCardId]?.block ?? 0,
      true,
    );

    return score > bestScore ? action : best;
  });

  const bestCardId = state.shop.forSale[bestBuy.saleIndex]?.cardId!;
  const bestScore = scoreRewardCard(
    content,
    bestCardId,
    content.cards[bestCardId]?.damage ?? 0,
    content.cards[bestCardId]?.block ?? 0,
    true,
  );

  return bestScore >= 22 ? bestBuy : { type: "leaveShop" };
}

function chooseStarterRemoval(content: RunContent, state: RunState, actions: RunAction[]): RunAction | null {
  if (countStarterCards(content, state.deck) < 5) {
    return null;
  }

  const starterPriority = [...new Set(content.character.starterDeck)].sort((left, right) => {
    const leftCard = content.cards[left];
    const rightCard = content.cards[right];
    const leftScore = (leftCard?.damage ?? 0) + (leftCard?.block ?? 0) + (leftCard?.draw ?? 0) + (leftCard?.energy ?? 0) + (leftCard?.heal ?? 0);
    const rightScore = (rightCard?.damage ?? 0) + (rightCard?.block ?? 0) + (rightCard?.draw ?? 0) + (rightCard?.energy ?? 0) + (rightCard?.heal ?? 0);
    return leftScore - rightScore;
  });

  for (const cardId of starterPriority) {
    const action = actions.find(
      (candidate): candidate is Extract<RunAction, { type: "removeDeckCard" }> =>
        candidate.type === "removeDeckCard" && state.deck[candidate.deckIndex]?.cardId === cardId,
    );

    if (action) {
      return action;
    }
  }

  return null;
}

function chooseRemovalOrLeave(state: RunState, actions: RunAction[]): RunAction | null {
  return actions.find((action): action is Extract<RunAction, { type: "removeDeckCard" }> => action.type === "removeDeckCard") ?? null;
}

function scoreCombatCard(damage: number, block: number, cost: number, blockGap: number): number {
  const defenseBonus = Math.min(block, blockGap) * 25;
  return damage * 100 + block * 12 + defenseBonus - cost;
}

function scoreRewardCard(
  content: RunContent,
  id: string,
  damage: number,
  block: number,
  preferFlexibleCards: boolean,
): number {
  const flexibilityBonus = preferFlexibleCards && damage > 0 && block > 0 ? 12 : 0;
  const nonStarterBonus = isStarterCard(content, id) ? 0 : 4;
  return damage * 3 + block * 3 + flexibilityBonus + nonStarterBonus;
}

function countStarterCards(content: RunContent, deck: Array<{ cardId: string }>): number {
  return deck.filter((card) => isStarterCard(content, card.cardId)).filter((card) => content.cards[card.cardId]).length;
}

function isStarterCard(content: RunContent, cardId: string): boolean {
  return content.character.starterDeck.includes(cardId);
}

function scoreBlessing(
  content: RunContent,
  state: RunState,
  blessing: { kind: string; value?: number; cardId?: string; relicId?: string },
  preferSafety: boolean,
): number {
  if (blessing.kind === "card" && blessing.cardId) {
    const card = content.cards[blessing.cardId];

    if (!card) {
      return 0;
    }

    return scoreRewardCard(content, card.id, card.damage ?? 0, card.block ?? 0, preferSafety) + 30;
  }

  if (blessing.kind === "relic" && blessing.relicId) {
    return scoreRelic(content, blessing.relicId, preferSafety) + 30;
  }

  if (blessing.kind === "maxHp") {
    return 55 + (blessing.value ?? 0) * 3;
  }

  if (blessing.kind === "gold") {
    return 40 + (blessing.value ?? 0);
  }

  if (blessing.kind === "heal") {
    const missingHp = state.maxHp - state.hp;
    const effectiveHealing = Math.min(missingHp, blessing.value ?? 0);
    return preferSafety ? effectiveHealing * 5 : effectiveHealing * 2;
  }

  return 0;
}

function scoreRelic(content: RunContent, relicId: string, preferSafety: boolean): number {
  const relic = content.relics[relicId];

  if (!relic) {
    return 0;
  }

  switch (relic.kind) {
    case "combatEnergy":
      return 80 + relic.value * 12;
    case "combatStartDraw":
      return 64 + relic.value * 10;
    case "combatStartBlock":
      return (preferSafety ? 56 : 44) + relic.value * 6;
    case "combatStartPoison":
      return 58 + relic.value * 7;
    case "maxHp":
      return 48 + relic.value * 4;
    case "postCombatHeal":
      return (preferSafety ? 54 : 38) + relic.value * 5;
    case "restHealBonus":
      return (preferSafety ? 42 : 26) + relic.value * 4;
    case "shopDiscount":
      return 28 + relic.value * 5;
    case "retainBlock":
      return (preferSafety ? 62 : 50) + relic.value * 9;
    case "strikeBonusDamage":
      return 66 + relic.value * 8;
    case "exhaustBlock":
      return (preferSafety ? 60 : 52) + relic.value * 8;
    case "attackPoison":
      return 64 + relic.value * 8;
    case "debuffBonusDamage":
      return 68 + relic.value * 8;
    case "debuffDraw":
      return 74 + relic.value * 10;
    default:
      return 0;
  }
}

function scoreUpgrade(
  entry: { card: { id: string; damage?: number; block?: number; draw?: number; energy?: number; heal?: number }; upgradedCard: { id: string; damage?: number; block?: number; draw?: number; energy?: number; heal?: number } },
  content: RunContent,
  preferFlexibleCards: boolean,
): number {
  const before = scoreRewardCard(content, entry.card.id, entry.card.damage ?? 0, entry.card.block ?? 0, preferFlexibleCards)
    + (entry.card.draw ?? 0) * 2
    + (entry.card.energy ?? 0) * 4
    + (entry.card.heal ?? 0) * 2;
  const after = scoreRewardCard(content, entry.upgradedCard.id, entry.upgradedCard.damage ?? 0, entry.upgradedCard.block ?? 0, preferFlexibleCards)
    + (entry.upgradedCard.draw ?? 0) * 2
    + (entry.upgradedCard.energy ?? 0) * 4
    + (entry.upgradedCard.heal ?? 0) * 2;

  return after - before;
}
