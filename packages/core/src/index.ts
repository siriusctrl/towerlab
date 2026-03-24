export type NodeKind = "battle" | "elite" | "rest" | "shop" | "boss";
export type RunPhase = "combat" | "map" | "rest" | "reward" | "shop" | "victory" | "defeat";
export type RestOptionId = "recover" | "fortify";

export interface MapNode {
  id: string;
  kind: NodeKind;
  nextIds: string[];
  encounterId?: string;
  relicReward?: string;
}

export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  description: string;
  damage?: number;
  block?: number;
}

export interface EnemyIntent {
  kind: "attack" | "attackBlock" | "block" | "heal";
  description: string;
  damage?: number;
  block?: number;
  heal?: number;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  maxHp: number;
  goldReward: number;
  intents: EnemyIntent[];
}

export type RelicKind =
  | "combatEnergy"
  | "combatStartBlock"
  | "maxHp"
  | "restHealBonus"
  | "shopDiscount";

export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
  kind: RelicKind;
  value: number;
}

export interface RunContent {
  cards: Record<string, CardDefinition>;
  enemies: Record<string, EnemyDefinition>;
  relics: Record<string, RelicDefinition>;
  rewardCardPool: string[];
  shopCardPool: string[];
  starterDeck: string[];
  map: MapNode[];
}

export interface EnemyState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  goldReward: number;
  intents: EnemyIntent[];
  intentIndex: number;
}

export interface CombatState {
  enemy: EnemyState;
  drawPile: string[];
  hand: string[];
  discardPile: string[];
  energy: number;
  block: number;
  turn: number;
}

export interface RewardState {
  cardChoices: string[];
}

export interface ShopState {
  forSale: string[];
  removableDeckIndices: number[];
}

export interface RunState {
  seed: number;
  rng: number;
  phase: RunPhase;
  hp: number;
  maxHp: number;
  gold: number;
  floor: number;
  currentNodeId: string;
  deck: string[];
  relics: string[];
  combat?: CombatState;
  reward?: RewardState;
  shop?: ShopState;
  log: string[];
}

export interface RestOption {
  id: RestOptionId;
  label: string;
  description: string;
}

export interface ObservedEnemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  intent: EnemyIntent;
}

interface ObservationBase {
  seed: number;
  phase: RunPhase;
  hp: number;
  maxHp: number;
  gold: number;
  floor: number;
  currentNode: MapNode;
  relics: RelicDefinition[];
  log: string[];
}

export interface CombatObservation extends ObservationBase {
  phase: "combat";
  energy: number;
  block: number;
  hand: CardDefinition[];
  drawPileCount: number;
  discardPileCount: number;
  enemy: ObservedEnemy;
}

export interface MapObservation extends ObservationBase {
  phase: "map";
  nextNodes: MapNode[];
}

export interface RestObservation extends ObservationBase {
  phase: "rest";
  restOptions: RestOption[];
  nextNodes: MapNode[];
}

export interface RewardObservation extends ObservationBase {
  phase: "reward";
  cardChoices: CardDefinition[];
  nextNodes: MapNode[];
}

export interface ShopObservation extends ObservationBase {
  phase: "shop";
  forSale: CardDefinition[];
  removableDeckCards: { deckIndex: number; card: CardDefinition }[];
  removeDeckCardCost: number;
  nextNodes: MapNode[];
}

export interface EndObservation extends ObservationBase {
  phase: "victory" | "defeat";
  nextNodes: MapNode[];
}

export type Observation =
  | CombatObservation
  | MapObservation
  | RestObservation
  | RewardObservation
  | ShopObservation
  | EndObservation;

export type RunAction =
  | { type: "choosePath"; nodeId: string }
  | { type: "playCard"; handIndex: number }
  | { type: "endTurn" }
  | { type: "chooseRest"; optionId: RestOptionId }
  | { type: "skipReward" }
  | { type: "takeReward"; rewardIndex: number }
  | { type: "buyShop"; saleIndex: number }
  | { type: "removeDeckCard"; deckIndex: number }
  | { type: "leaveShop" };

export interface TraceStep {
  action: RunAction | null;
  observation: Observation;
}

export interface RunTrace {
  seed: number;
  actions: RunAction[];
  steps: TraceStep[];
}

const DEFAULT_MAX_HP = 80;
const STARTING_GOLD = 0;
const STARTING_ENERGY = 3;
const HAND_SIZE = 5;
const REST_HEAL = 18;
const REST_FORTIFY = 5;
const LOG_LIMIT = 8;
const REWARD_CARD_COUNT = 3;
const SHOP_CARD_COUNT = 3;
const SHOP_CARD_PRICE = 12;
const SHOP_CARD_REMOVE_PRICE = 12;

const REST_OPTIONS: RestOption[] = [
  {
    id: "recover",
    label: "Recover",
    description: `Heal ${REST_HEAL} HP.`,
  },
  {
    id: "fortify",
    label: "Fortify",
    description: `Gain ${REST_FORTIFY} max HP and heal ${REST_FORTIFY} HP.`,
  },
];

export function createRun(content: RunContent, seed: number): RunState {
  const firstNode = content.map[0];

  if (!firstNode) {
    throw new Error("map must contain at least one node");
  }

  validateContent(content);

  const baseState: RunState = {
    seed,
    rng: normalizeSeed(seed),
    phase: "map",
    hp: DEFAULT_MAX_HP,
    maxHp: DEFAULT_MAX_HP,
    gold: STARTING_GOLD,
    floor: 1,
    currentNodeId: firstNode.id,
    deck: [...content.starterDeck],
    relics: [],
    log: [],
  };

  return enterNode(content, appendLog(baseState, `Entered ${describeNode(firstNode)}.`), firstNode);
}

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

export function replayRun(content: RunContent, seed: number, actions: RunAction[]): RunState {
  let state = createRun(content, seed);

  for (const action of actions) {
    state = applyAction(content, state, action);
  }

  return state;
}

export function traceRun(content: RunContent, seed: number, actions: RunAction[]): RunTrace {
  let state = createRun(content, seed);
  const steps: TraceStep[] = [
    {
      action: null,
      observation: observeRun(content, state),
    },
  ];

  for (const action of actions) {
    state = applyAction(content, state, action);
    steps.push({
      action,
      observation: observeRun(content, state),
    });
  }

  return {
    seed,
    actions: [...actions],
    steps,
  };
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
      floor: state.floor + 1,
      currentNodeId: nextNode.id,
      reward: undefined,
      shop: undefined,
    },
    `Moved to ${describeNode(nextNode)}.`,
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
  const fragments: string[] = [];

  if (card.damage && card.damage > 0) {
    enemy = applyDamageToEnemy(enemy, card.damage);
    fragments.push(`deal ${card.damage}`);
  }

  if (card.block && card.block > 0) {
    block += card.block;
    fragments.push(`gain ${card.block} block`);
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
    fragments.length > 0 ? `Played ${card.name}: ${fragments.join(", ")}.` : `Played ${card.name}.`,
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
      healed > 0 ? `Recovered ${healed} HP.` : "Recovered 0 HP.",
    );
  } else if (optionId === "fortify") {
    nextState = appendLog(
      {
        ...state,
        maxHp: state.maxHp + REST_FORTIFY,
        hp: state.hp + REST_FORTIFY,
      },
      `Fortified for +${REST_FORTIFY} max HP.`,
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
    `Added ${getCard(content, cardId).name} to deck.`,
  );

  return finishNode(content, nextState, getNode(content, state.currentNodeId));
}

function skipReward(content: RunContent, state: RunState): RunState {
  if (state.phase !== "reward") {
    throw new Error("reward choices are only available after combat");
  }

  return finishNode(
    content,
    appendLog({ ...state, reward: undefined }, "Skipped reward."),
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
    `Bought ${getCard(content, cardId).name} for ${price} gold.`,
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
  nextDeck.splice(deckIndex, 1);
  const removedCardName = getCard(content, removedCardId).name;

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
    `Removed ${removedCardName} from deck for ${SHOP_CARD_REMOVE_PRICE} gold.`,
  );
}

function leaveShop(content: RunContent, state: RunState): RunState {
  if (state.phase !== "shop") {
    throw new Error("can only leave when in shop");
  }

  const currentNode = getNode(content, state.currentNodeId);
  return finishNode(content, appendLog({ ...state, shop: undefined }, "Left the shop."), currentNode);
}

function enterNode(content: RunContent, state: RunState, node: MapNode): RunState {
  if (node.kind === "rest") {
    return appendLog(
      {
        ...state,
        phase: "rest",
        combat: undefined,
        reward: undefined,
        shop: undefined,
      },
      "Choose how to use the campfire.",
    );
  }

  if (node.kind === "shop") {
    const shopState = createShopState(content, state);
    return appendLog(
      {
        ...state,
        phase: "shop",
        combat: undefined,
        reward: undefined,
        shop: shopState.shop,
        rng: shopState.rng,
      },
      "You found a shop. Browse the offers.",
    );
  }

  return startCombat(content, state, node);
}

function createShopState(content: RunContent, state: RunState): { shop: ShopState; rng: number } {
  const cardSelection = selectCardsFromPool(content.shopCardPool, SHOP_CARD_COUNT, state.rng);
  const existingForSale = cardSelection.cards.filter((cardId) => content.cards[cardId]);

  return {
    shop: {
      forSale: existingForSale,
      removableDeckIndices: buildRemovableDeckIndices(state.deck),
    },
    rng: cardSelection.rng,
  };
}

function startCombat(content: RunContent, state: RunState, node: MapNode): RunState {
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
    `${enemy.name} appears. Intent: ${getCurrentIntent(enemy).description}.`,
  );
}

function finishCombat(content: RunContent, state: RunState): RunState {
  const combat = getCombat(state);
  const currentNode = getNode(content, state.currentNodeId);
  const reward = combat.enemy.goldReward;

  let nextState: RunState = appendLog(
    {
      ...state,
      gold: state.gold + reward,
      combat: undefined,
    },
    `Defeated ${combat.enemy.name} and gained ${reward} gold.`,
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
    "Won a reward. Choose a card reward or skip.",
  );
}

function finishNode(content: RunContent, state: RunState, currentNode: MapNode): RunState {
  if (currentNode.nextIds.length === 0) {
    const finalPhase = state.hp > 0 ? "victory" : "defeat";
    const message = finalPhase === "victory"
      ? currentNode.kind === "boss"
        ? "The boss falls. The tower is clear."
        : "The path ends in victory."
      : "Your climb ends here.";

    return appendLog(
      {
        ...state,
        phase: finalPhase,
        reward: undefined,
        shop: undefined,
      },
      message,
    );
  }

  return appendLog(
    {
      ...state,
      phase: "map",
      reward: undefined,
      shop: undefined,
    },
    "Choose the next path.",
  );
}

function grantRelicReward(content: RunContent, state: RunState, currentNode: MapNode): RunState {
  const relicId = currentNode.relicReward;

  if (!relicId) {
    return state;
  }

  if (state.relics.includes(relicId)) {
    return appendLog(state, `Relic ${getRelic(content, relicId).name} already acquired.`);
  }

  const relic = getRelic(content, relicId);
  let nextState = {
    ...state,
    relics: [...state.relics, relicId],
  };

  if (relic.kind === "maxHp") {
    nextState = {
      ...nextState,
      maxHp: state.maxHp + relic.value,
      hp: state.hp + relic.value,
    };
  }

  return appendLog(nextState, `Acquired relic ${relic.name}.`);
}

function getRewardChoices(content: RunContent, state: RunState): { cards: string[]; rng: number } {
  const cardSelection = selectCardsFromPool(content.rewardCardPool, REWARD_CARD_COUNT, state.rng);
  const cardChoices = cardSelection.cards.filter((cardId) => content.cards[cardId]);

  return {
    cards: cardChoices,
    rng: cardSelection.rng,
  };
}

function getRelic(content: RunContent, relicId: string): RelicDefinition {
  const relic = content.relics[relicId];

  if (!relic) {
    throw new Error(`unknown relic: ${relicId}`);
  }

  return relic;
}

function getRelicValue(content: RunContent, state: RunState, kind: RelicKind): number {
  return state.relics.reduce((total, relicId) => {
    const relic = getRelic(content, relicId);
    return relic.kind === kind ? total + relic.value : total;
  }, 0);
}

function resolveEnemyTurn(state: RunState): RunState {
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
    `${combat.enemy.name} uses ${intent.description}.`,
  );

  if (hp <= 0) {
    return appendLog(
      {
        ...nextState,
        phase: "defeat",
        combat: undefined,
      },
      "You were defeated.",
    );
  }

  return nextState;
}

function startPlayerTurn(content: RunContent, state: RunState): RunState {
  const combat = getCombat(state);
  const drawn = drawCards(combat.drawPile, combat.discardPile, HAND_SIZE, state.rng);
  const nextEnemy = combat.enemy;

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
        enemy: nextEnemy,
      },
    },
    `Turn ${combat.turn + 1}. Intent: ${getCurrentIntent(nextEnemy).description}.`,
  );
}

function drawCards(drawPile: string[], discardPile: string[], count: number, rng: number): DrawResult {
  let nextDrawPile = [...drawPile];
  let nextDiscardPile = [...discardPile];
  const drawn: string[] = [];
  let nextRng = rng;

  while (drawn.length < count) {
    if (nextDrawPile.length === 0) {
      if (nextDiscardPile.length === 0) {
        break;
      }

      const shuffled = shuffle(nextDiscardPile, nextRng);
      nextDrawPile = shuffled.items;
      nextDiscardPile = [];
      nextRng = shuffled.rng;
    }

    const nextCard = nextDrawPile.shift();

    if (!nextCard) {
      break;
    }

    drawn.push(nextCard);
  }

  return {
    drawPile: nextDrawPile,
    discardPile: nextDiscardPile,
    drawn,
    rng: nextRng,
  };
}

function applyDamageToEnemy(enemy: EnemyState, damage: number): EnemyState {
  const absorbed = Math.min(enemy.block, damage);
  const nextHp = enemy.hp - (damage - absorbed);

  return {
    ...enemy,
    hp: Math.max(nextHp, 0),
    block: enemy.block - absorbed,
  };
}

function getCurrentIntent(enemy: EnemyState): EnemyIntent {
  const intent = enemy.intents[enemy.intentIndex];

  if (!intent) {
    throw new Error(`enemy ${enemy.id} has no intent at index ${enemy.intentIndex}`);
  }

  return intent;
}

function getCombat(state: RunState): CombatState {
  if (!state.combat) {
    throw new Error("combat state is not available");
  }

  return state.combat;
}

function getNode(content: RunContent, nodeId: string): MapNode {
  const node = content.map.find((entry) => entry.id === nodeId);

  if (!node) {
    throw new Error(`unknown node: ${nodeId}`);
  }

  return node;
}

function getCard(content: RunContent, cardId: string): CardDefinition {
  const card = content.cards[cardId];

  if (!card) {
    throw new Error(`unknown card: ${cardId}`);
  }

  return card;
}

function getEnemyDefinition(content: RunContent, enemyId: string): EnemyDefinition {
  const enemy = content.enemies[enemyId];

  if (!enemy) {
    throw new Error(`unknown enemy: ${enemyId}`);
  }

  if (enemy.intents.length === 0) {
    throw new Error(`enemy ${enemyId} must define at least one intent`);
  }

  return enemy;
}

function validateContent(content: RunContent): void {
  validateDeck(content);
  validateMap(content);
  validatePools(content);
  validateRelics(content);
}

function validateDeck(content: RunContent): void {
  if (content.starterDeck.length === 0) {
    throw new Error("starterDeck must contain at least one card");
  }

  for (const cardId of content.starterDeck) {
    getCard(content, cardId);
  }
}

function validateMap(content: RunContent): void {
  const seenNodeIds = new Set<string>();

  for (const node of content.map) {
    if (seenNodeIds.has(node.id)) {
      throw new Error(`duplicate node id: ${node.id}`);
    }

    seenNodeIds.add(node.id);

    if (node.kind === "rest" || node.kind === "shop") {
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

  for (const node of content.map) {
    for (const nextId of node.nextIds) {
      if (!seenNodeIds.has(nextId)) {
        throw new Error(`node ${node.id} references unknown next node ${nextId}`);
      }
    }
  }
}

function validatePools(content: RunContent): void {
  for (const cardId of content.rewardCardPool) {
    getCard(content, cardId);
  }

  for (const cardId of content.shopCardPool) {
    getCard(content, cardId);
  }
}

function validateRelics(content: RunContent): void {
  for (const relic of Object.values(content.relics)) {
    if (relic.value <= 0) {
      throw new Error(`relic ${relic.id} must have a positive value`);
    }

    if (
      relic.kind !== "combatEnergy" &&
      relic.kind !== "combatStartBlock" &&
      relic.kind !== "maxHp" &&
      relic.kind !== "restHealBonus" &&
      relic.kind !== "shopDiscount"
    ) {
      throw new Error(`relic ${relic.id} has unsupported kind: ${String(relic.kind)}`);
    }
  }
}

function selectCardsFromPool(cardPool: string[], count: number, rng: number): { cards: string[]; rng: number } {
  if (cardPool.length === 0 || count <= 0) {
    return {
      cards: [],
      rng,
    };
  }

  const available = [...new Set(cardPool)];
  const shuffled = shuffle(available, rng);
  return {
    cards: shuffled.items.slice(0, Math.min(count, shuffled.items.length)),
    rng: shuffled.rng,
  };
}

function buildRemovableDeckIndices(deck: string[]): number[] {
  return deck.map((_, index) => index);
}

function appendLog(state: RunState, message: string): RunState {
  return {
    ...state,
    log: [...state.log, message].slice(-LOG_LIMIT),
  };
}

function describeNode(node: MapNode): string {
  return `${node.id} (${node.kind})`;
}

function normalizeSeed(seed: number): number {
  const normalized = seed >>> 0;
  return normalized === 0 ? 1 : normalized;
}

function shuffle<T>(items: T[], seed: number): ShuffleResult<T> {
  const nextItems = [...items];
  let nextSeed = seed;

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const value = nextRandom(nextSeed);
    nextSeed = value.seed;
    const swapIndex = Math.floor(value.value * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return {
    items: nextItems,
    rng: nextSeed,
  };
}

function nextRandom(seed: number): { value: number; seed: number } {
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;

  return {
    seed: nextSeed === 0 ? 1 : nextSeed,
    value: nextSeed / 4294967296,
  };
}

function assertNever(value: never): never {
  throw new Error(`unexpected value: ${String(value)}`);
}

interface ShuffleResult<T> {
  items: T[];
  rng: number;
}

interface DrawResult {
  drawPile: string[];
  discardPile: string[];
  drawn: string[];
  rng: number;
}
