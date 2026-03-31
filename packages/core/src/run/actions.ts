import { REST_HEAL_RATIO } from "../constants.js";
import { finishCombat, resolveEnemyTurn, resolvePlayerTurnEnd, resolvePlayerTurnStart } from "../combat.js";
import { enterNode } from "../node.js";
import { finishNode } from "../progression.js";
import { drawCards } from "../rng.js";
import { grantRelicReward } from "../rewards.js";
import { buildShopRemovableDeckIndices, getDeckRemovalPrice } from "../shop.js";
import {
  addPassiveEffects,
  applyDamageToEnemy,
  applyStatus,
  appendLog,
  assertNever,
  buildUpgradableDeckIndices,
  computeAttackDamage,
  createCardInstance,
  getAct,
  getCardNumbers,
  getCombat,
  getNode,
  getRelicValue,
  getTotalPassiveValue,
  syncEnemyPhase,
} from "../shared.js";
import type {
  BlessingDefinition,
  CardDefinition,
  CardInstance,
  CardNumbers,
  CombatTimingWindow,
  EnemyState,
  LogEffect,
  PassiveEffect,
  RestOptionId,
  RunAction,
  RunContent,
  RunState,
} from "../types.js";
import { getCard } from "../validate.js";

type CardResolutionState = {
  enemy: EnemyState;
  block: number;
  hp: number;
  energy: number;
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  hand: CardInstance[];
  nextRng: number;
  effects: LogEffect[];
  addedPassives: PassiveEffect[];
};

type BeforeCardResolveResult = {
  baseDamageBonus: number;
  attackPoison: number;
  debuffDraw: number;
  exhaustBlock: number;
  exhaustsOnPlay: boolean;
};

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
    case "upgradeRestCard":
      return upgradeRestCard(content, state, action.deckIndex);
    case "takeReward":
      return takeReward(content, state, action.rewardIndex);
    case "takeRewardCard":
      return takeRewardCard(content, state, action.rewardIndex);
    case "backReward":
      return backReward(state);
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
      rest: undefined,
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
      rest: undefined,
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
  const cardInstance = combat.hand[handIndex];

  if (!cardInstance) {
    throw new Error(`hand index ${handIndex} is not available`);
  }

  const card = getCard(content, cardInstance.cardId);
  const numbers = getCardNumbers(card, cardInstance.upgraded);

  if (numbers.cost > combat.energy) {
    throw new Error(`${card.name} costs ${numbers.cost} energy`);
  }

  let enemy = combat.enemy;
  let block = combat.block;
  let hp = state.hp;
  let energy = combat.energy - numbers.cost;
  let drawPile = combat.drawPile;
  let discardPile = combat.discardPile;
  let exhaustPile = combat.exhaustPile;
  let hand = combat.hand.filter((_, index) => index !== handIndex);
  let nextRng = state.rng;
  const effects: LogEffect[] = [];
  const beforeCard = resolveBeforeCardResolve(content, state, card, numbers, enemy);
  const exhaustsOnPlay = beforeCard.exhaustsOnPlay;

  if (exhaustsOnPlay) {
    exhaustPile = [...exhaustPile, cardInstance];
  } else {
    discardPile = [...discardPile, cardInstance];
  }

  if (numbers.damage && numbers.damage > 0) {
    const baseDamage = numbers.damage + beforeCard.baseDamageBonus;
    const dealtDamage = computeAttackDamage(baseDamage, combat.status, enemy.status);
    enemy = applyDamageToEnemy(enemy, dealtDamage);
    effects.push({ type: "damage", amount: dealtDamage });
  }

  if (numbers.block && numbers.block > 0) {
    block += numbers.block;
    effects.push({ type: "block", amount: numbers.block });
  }

  if (numbers.draw && numbers.draw > 0) {
    const drawnCards = drawCards(drawPile, discardPile, numbers.draw, nextRng);
    drawPile = drawnCards.drawPile;
    discardPile = drawnCards.discardPile;
    hand = [...hand, ...drawnCards.drawn];
    nextRng = drawnCards.rng;

    if (drawnCards.drawn.length > 0) {
      effects.push({ type: "draw", amount: drawnCards.drawn.length });
    }
  }

  if (numbers.energy && numbers.energy > 0) {
    energy += numbers.energy;
    effects.push({ type: "energy", amount: numbers.energy });
  }

  if (numbers.heal && numbers.heal > 0) {
    const healed = Math.min(numbers.heal, state.maxHp - state.hp);
    hp = Math.min(state.maxHp, state.hp + numbers.heal);

    if (healed > 0) {
      effects.push({ type: "heal", amount: healed });
    }
  }

  if ((numbers.weak ?? 0) > 0) {
    const weak = numbers.weak ?? 0;
    enemy = { ...enemy, status: applyStatus(enemy.status, { weak }) };
    effects.push({ type: "weak", amount: weak });
  }

  if ((numbers.vulnerable ?? 0) > 0) {
    const vulnerable = numbers.vulnerable ?? 0;
    enemy = { ...enemy, status: applyStatus(enemy.status, { vulnerable }) };
    effects.push({ type: "vulnerable", amount: vulnerable });
  }

  if ((numbers.poison ?? 0) > 0) {
    const poison = numbers.poison ?? 0;
    enemy = { ...enemy, status: applyStatus(enemy.status, { poison }) };
    effects.push({ type: "poison", amount: poison });
  }

  if ((numbers.damage ?? 0) > 0 && beforeCard.attackPoison > 0) {
    enemy = { ...enemy, status: applyStatus(enemy.status, { poison: beforeCard.attackPoison }) };
    effects.push({ type: "poison", amount: beforeCard.attackPoison });
  }

  if ((numbers.poisonMultiplier ?? 1) > 1 && enemy.status.poison > 0) {
    const nextPoison = enemy.status.poison * (numbers.poisonMultiplier ?? 1);
    const addedPoison = nextPoison - enemy.status.poison;
    enemy = { ...enemy, status: { ...enemy.status, poison: nextPoison } };
    effects.push({ type: "poison", amount: addedPoison });
  }

  if (numbers.passives && numbers.passives.length > 0) {
    for (const passive of numbers.passives) {
      effects.push({ type: "passive", kind: passive.kind, value: passive.value });
    }
  }

  const afterCard = resolveAfterCardResolve(numbers, beforeCard, {
    enemy,
    block,
    hp,
    energy,
    drawPile,
    discardPile,
    exhaustPile,
    hand,
    nextRng,
    effects,
    addedPassives: numbers.passives ?? [],
  });

  const nextState = appendLog(
    {
      ...state,
      hp: afterCard.hp,
      rng: afterCard.nextRng,
      combat: {
        ...combat,
        enemy: syncEnemyPhase(afterCard.enemy),
        drawPile: afterCard.drawPile,
        hand: afterCard.hand,
        discardPile: afterCard.discardPile,
        exhaustPile: afterCard.exhaustPile,
        energy: afterCard.energy,
        block: afterCard.block,
        passives: addPassiveEffects(combat.passives, afterCard.addedPassives),
      },
    },
    { type: "playedCard", cardId: card.id, upgraded: cardInstance.upgraded, effects: afterCard.effects },
  );

  if (afterCard.enemy.hp <= 0) {
    return finishCombat(content, nextState);
  }

  return nextState;
}

function endTurn(content: RunContent, state: RunState): RunState {
  if (state.phase !== "combat") {
    throw new Error("ending the turn is only available during combat");
  }

  let nextState = resolvePlayerTurnEnd(content, state);

  if (nextState.phase === "defeat") {
    return nextState;
  }

  nextState = resolveEnemyTurn(nextState);

  if (nextState.phase === "defeat") {
    return nextState;
  }

  if (nextState.combat?.enemy.hp === 0) {
    return finishCombat(content, nextState);
  }

  return resolvePlayerTurnStart(content, nextState);
}

function chooseRest(content: RunContent, state: RunState, optionId: RestOptionId): RunState {
  if (state.phase !== "rest") {
    throw new Error("rest options are only available at rest nodes");
  }

  const currentNode = getNode(content, state.act, state.currentNodeId);

  if (optionId === "recover") {
    const healAmount = Math.max(1, Math.floor(state.maxHp * REST_HEAL_RATIO)) + getRelicValue(content, state, "restHealBonus");
    const healed = Math.min(healAmount, state.maxHp - state.hp);

    const nextState = appendLog(
      {
        ...state,
        hp: Math.min(state.maxHp, state.hp + healAmount),
      },
      { type: "recoveredHp", amount: healed },
    );

    return finishNode(content, nextState, currentNode);
  }

  if (optionId === "upgrade") {
    const upgradableDeckIndices = buildUpgradableDeckIndices(state.deck);

    if (upgradableDeckIndices.length === 0) {
      throw new Error("no upgradable cards remain in the deck");
    }

    return {
      ...state,
      rest: {
        mode: "upgrade",
        upgradableDeckIndices,
      },
    };
  }

  return assertNever(optionId);
}

function upgradeRestCard(content: RunContent, state: RunState, deckIndex: number): RunState {
  if (state.phase !== "rest" || state.rest?.mode !== "upgrade") {
    throw new Error("card upgrades are only available after choosing upgrade at a campfire");
  }

  const cardInstance = state.deck[deckIndex];

  if (!cardInstance) {
    throw new Error(`deck index ${deckIndex} is not available`);
  }

  if (cardInstance.upgraded) {
    throw new Error(`deck index ${deckIndex} is already upgraded`);
  }

  if (!state.rest.upgradableDeckIndices.includes(deckIndex)) {
    throw new Error(`deck index ${deckIndex} cannot be upgraded now`);
  }

  const currentNode = getNode(content, state.act, state.currentNodeId);
  const nextDeck = [...state.deck];
  nextDeck[deckIndex] = {
    ...cardInstance,
    upgraded: true,
  };

  return finishNode(
    content,
    appendLog(
      {
        ...state,
        deck: nextDeck,
      },
      { type: "cardUpgraded", cardId: cardInstance.cardId },
    ),
    currentNode,
  );
}

function takeReward(content: RunContent, state: RunState, rewardIndex: number): RunState {
  if (state.phase !== "reward") {
    throw new Error("reward choices are only available after combat");
  }

  if (!state.reward || state.reward.mode !== "menu") {
    throw new Error("reward items can only be claimed from the reward menu");
  }

  const reward = state.reward.items[rewardIndex];

  if (!reward || reward.claimed) {
    throw new Error(`reward index ${rewardIndex} is not available`);
  }

  if (reward.kind === "cards") {
    return {
      ...state,
      reward: {
        ...state.reward,
        mode: "cards",
      },
    };
  }

  let nextState: RunState;

  if (reward.kind === "gold") {
    nextState = appendLog(
      {
        ...state,
        gold: state.gold + reward.amount,
      },
      { type: "goldGained", amount: reward.amount },
    );
  } else {
    nextState = grantRelicReward(content, state, reward.relicId);
  }

  return settleClaimedReward(content, nextState, rewardIndex);
}

function takeRewardCard(content: RunContent, state: RunState, rewardIndex: number): RunState {
  if (state.phase !== "reward") {
    throw new Error("reward choices are only available after combat");
  }

  if (!state.reward || state.reward.mode !== "cards") {
    throw new Error("card rewards can only be chosen from the card reward menu");
  }

  const cardRewardIndex = state.reward.items.findIndex((item) => item.kind === "cards" && !item.claimed);
  const reward = cardRewardIndex >= 0 ? state.reward.items[cardRewardIndex] : null;

  if (!reward || reward.kind !== "cards") {
    throw new Error("card reward is not available");
  }

  const cardId = reward.cardChoices[rewardIndex];

  if (!cardId) {
    throw new Error(`reward index ${rewardIndex} is not available`);
  }

  const cardInstance = createCardInstance(cardId, state.nextCardInstanceId);
  const nextState = appendLog(
    {
      ...state,
      deck: [...state.deck, cardInstance],
      nextCardInstanceId: state.nextCardInstanceId + 1,
    },
    { type: "rewardCardAdded", cardId },
  );

  return settleClaimedReward(content, nextState, cardRewardIndex);
}

function backReward(state: RunState): RunState {
  if (state.phase !== "reward" || state.reward?.mode !== "cards") {
    throw new Error("can only go back while choosing a card reward");
  }

  return {
    ...state,
    reward: {
      ...state.reward,
      mode: "menu",
    },
  };
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

function settleClaimedReward(content: RunContent, state: RunState, rewardIndex: number): RunState {
  const rewardState = state.reward;

  if (!rewardState) {
    throw new Error("reward state is missing");
  }

  const nextItems = rewardState.items.map((item, index) => (index === rewardIndex ? { ...item, claimed: true } : item));
  const nextState: RunState = {
    ...state,
    reward: {
      ...rewardState,
      mode: "menu",
      items: nextItems,
    },
  };

  if (nextItems.every((item) => item.claimed)) {
    return finishNode(content, { ...nextState, reward: undefined }, getNode(content, state.act, state.currentNodeId));
  }

  return nextState;
}

function buyShop(content: RunContent, state: RunState, saleIndex: number): RunState {
  if (state.phase !== "shop") {
    throw new Error("shop actions are only available at shop nodes");
  }

  const shop = state.shop;

  if (!shop) {
    throw new Error("shop state is missing");
  }

  const offer = shop.forSale[saleIndex];
  const cardId = offer?.cardId;

  if (!cardId) {
    throw new Error(`shop card index ${saleIndex} is not available`);
  }

  const price = offer.price;

  if (state.gold < price) {
    throw new Error(`Need ${price} gold to buy ${getCard(content, cardId).name}`);
  }

  const purchasedCard = createCardInstance(cardId, state.nextCardInstanceId);
  const nextDeck = [...state.deck, purchasedCard];

  return appendLog(
    {
      ...state,
      gold: state.gold - price,
      deck: nextDeck,
      nextCardInstanceId: state.nextCardInstanceId + 1,
      shop: {
        ...shop,
        forSale: shop.forSale.filter((_, index) => index !== saleIndex),
        removableDeckIndices: buildShopRemovableDeckIndices(nextDeck, shop.removalsThisShop),
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

  const deckCard = state.deck[deckIndex];

  if (!deckCard) {
    throw new Error(`deck index ${deckIndex} is not available`);
  }

  if (!shop.removableDeckIndices.includes(deckIndex)) {
    throw new Error(`deck index ${deckIndex} cannot be removed now`);
  }

  const removeCost = getDeckRemovalPrice(state.totalDeckRemovals);

  if (state.gold < removeCost) {
    throw new Error(`Need ${removeCost} gold to remove ${getCard(content, deckCard.cardId).name}`);
  }

  const nextDeck = [...state.deck];
  const removedCard = nextDeck[deckIndex];

  if (!removedCard) {
    throw new Error(`deck index ${deckIndex} is not available`);
  }

  nextDeck.splice(deckIndex, 1);

  return appendLog(
    {
      ...state,
      deck: nextDeck,
      gold: state.gold - removeCost,
      totalDeckRemovals: state.totalDeckRemovals + 1,
      shop: {
        ...shop,
        removableDeckIndices: buildShopRemovableDeckIndices(nextDeck, shop.removalsThisShop + 1),
        removalsThisShop: shop.removalsThisShop + 1,
      },
    },
    { type: "deckCardRemoved", cardId: removedCard.cardId, upgraded: removedCard.upgraded, gold: removeCost },
  );
}

function leaveShop(content: RunContent, state: RunState): RunState {
  if (state.phase !== "shop") {
    throw new Error("can only leave when in shop");
  }

  return finishNode(content, appendLog({ ...state, shop: undefined }, { type: "shopLeft" }), getNode(content, state.act, state.currentNodeId));
}

function resolveBeforeCardResolve(
  content: RunContent,
  state: RunState,
  card: CardDefinition,
  numbers: CardNumbers,
  enemy: EnemyState,
): BeforeCardResolveResult {
  const window: CombatTimingWindow = "beforeCardResolve";

  switch (window) {
    case "beforeCardResolve":
      return {
        baseDamageBonus:
          (card.id === "strike" ? getTotalPassiveValue(content, state, "strikeBonusDamage") : 0) +
          (isDebuffed(enemy) ? getTotalPassiveValue(content, state, "debuffBonusDamage") : 0),
        attackPoison: getTotalPassiveValue(content, state, "attackPoison"),
        debuffDraw: getTotalPassiveValue(content, state, "debuffDraw"),
        exhaustBlock: getTotalPassiveValue(content, state, "exhaustBlock"),
        exhaustsOnPlay: numbers.exhaust === true,
      };
    default:
      throw new Error(`unsupported card timing window: ${window}`);
  }
}

function resolveAfterCardResolve(numbers: CardNumbers, beforeCard: BeforeCardResolveResult, resolution: CardResolutionState): CardResolutionState {
  const window: CombatTimingWindow = "afterCardResolve";

  switch (window) {
    case "afterCardResolve": {
      let nextResolution = resolution;

      if (beforeCard.exhaustsOnPlay) {
        if (beforeCard.exhaustBlock > 0) {
          nextResolution = {
            ...nextResolution,
            block: nextResolution.block + beforeCard.exhaustBlock,
            effects: [...nextResolution.effects, { type: "block", amount: beforeCard.exhaustBlock }],
          };
        }

        nextResolution = {
          ...nextResolution,
          effects: [...nextResolution.effects, { type: "exhaust" }],
        };
      }

      const appliedDebuff =
        (numbers.weak ?? 0) > 0 ||
        (numbers.vulnerable ?? 0) > 0 ||
        (numbers.poison ?? 0) > 0 ||
        ((numbers.damage ?? 0) > 0 && beforeCard.attackPoison > 0);

      if (appliedDebuff && beforeCard.debuffDraw > 0) {
        const drawnCards = drawCards(nextResolution.drawPile, nextResolution.discardPile, beforeCard.debuffDraw, nextResolution.nextRng);
        nextResolution = {
          ...nextResolution,
          drawPile: drawnCards.drawPile,
          discardPile: drawnCards.discardPile,
          hand: [...nextResolution.hand, ...drawnCards.drawn],
          nextRng: drawnCards.rng,
          effects:
            drawnCards.drawn.length > 0
              ? [...nextResolution.effects, { type: "draw", amount: drawnCards.drawn.length }]
              : nextResolution.effects,
        };
      }

      return nextResolution;
    }
    default:
      throw new Error(`unsupported card timing window: ${window}`);
  }
}

function isDebuffed(enemy: EnemyState): boolean {
  return enemy.status.weak > 0 || enemy.status.vulnerable > 0 || enemy.status.poison > 0;
}

function applyBlessing(content: RunContent, state: RunState, blessing: BlessingDefinition): RunState {
  if (blessing.kind === "card") {
    const cardId = blessing.cardId;

    if (!cardId) {
      throw new Error(`blessing ${blessing.id} must define cardId`);
    }

    const cardInstance = createCardInstance(cardId, state.nextCardInstanceId, blessing.upgraded === true);

    return appendLog(
      {
        ...state,
        deck: [...state.deck, cardInstance],
        nextCardInstanceId: state.nextCardInstanceId + 1,
      },
      { type: "blessingCardAdded", cardId },
    );
  }

  if (blessing.kind === "relic") {
    if (!blessing.relicId) {
      throw new Error(`blessing ${blessing.id} must define relicId`);
    }

    return grantRelicReward(content, state, blessing.relicId);
  }

  return assertNever(blessing.kind);
}
