export type NodeKind = "battle" | "elite" | "rest" | "boss";
export type RunPhase = "combat" | "map" | "rest" | "victory" | "defeat";
export type RestOptionId = "recover" | "fortify";

export interface MapNode {
  id: string;
  kind: NodeKind;
  nextIds: string[];
  encounterId?: string;
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

export interface RunContent {
  cards: Record<string, CardDefinition>;
  enemies: Record<string, EnemyDefinition>;
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
  combat?: CombatState;
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

export interface EndObservation extends ObservationBase {
  phase: "victory" | "defeat";
  nextNodes: MapNode[];
}

export type Observation = CombatObservation | MapObservation | RestObservation | EndObservation;

export type RunAction =
  | { type: "choosePath"; nodeId: string }
  | { type: "playCard"; handIndex: number }
  | { type: "endTurn" }
  | { type: "chooseRest"; optionId: RestOptionId };

const DEFAULT_MAX_HP = 80;
const STARTING_GOLD = 0;
const STARTING_ENERGY = 3;
const HAND_SIZE = 5;
const REST_HEAL = 18;
const REST_FORTIFY = 5;
const LOG_LIMIT = 8;

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

  if (state.phase === "rest") {
    return {
      ...base,
      phase: "rest",
      restOptions: REST_OPTIONS,
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

  return {
    ...base,
    phase: state.phase,
    nextNodes,
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

  const nextHand = combat.hand.filter((_, index) => index !== handIndex);
  const nextState = appendLog(
    {
      ...state,
      combat: {
        ...combat,
        enemy,
        hand: nextHand,
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

  return startPlayerTurn(nextState);
}

function chooseRest(content: RunContent, state: RunState, optionId: RestOptionId): RunState {
  if (state.phase !== "rest") {
    throw new Error("rest options are only available at rest nodes");
  }

  const currentNode = getNode(content, state.currentNodeId);
  let nextState = state;

  if (optionId === "recover") {
    const healed = Math.min(REST_HEAL, state.maxHp - state.hp);
    nextState = appendLog(
      {
        ...state,
        hp: Math.min(state.maxHp, state.hp + REST_HEAL),
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

  return finishNode(nextState, currentNode);
}

function enterNode(content: RunContent, state: RunState, node: MapNode): RunState {
  if (node.kind === "rest") {
    return appendLog(
      {
        ...state,
        phase: "rest",
        combat: undefined,
      },
      "Choose how to use the campfire.",
    );
  }

  return startCombat(content, state, node);
}

function startCombat(content: RunContent, state: RunState, node: MapNode): RunState {
  const enemyId = node.encounterId;

  if (!enemyId) {
    throw new Error(`${node.kind} node ${node.id} must define an encounterId`);
  }

  const enemyDefinition = getEnemyDefinition(content, enemyId);
  const shuffledDeck = shuffle([...state.deck], state.rng);
  const drawn = drawCards(shuffledDeck.items, [], HAND_SIZE, shuffledDeck.rng);
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
        energy: STARTING_ENERGY,
        block: 0,
        turn: 1,
      },
    },
    `${enemy.name} appears. Intent: ${getCurrentIntent(enemy).description}.`,
  );
}

function finishCombat(content: RunContent, state: RunState): RunState {
  const combat = getCombat(state);
  const currentNode = getNode(content, state.currentNodeId);
  const reward = combat.enemy.goldReward;
  const nextState = appendLog(
    {
      ...state,
      gold: state.gold + reward,
      combat: undefined,
    },
    `Defeated ${combat.enemy.name} and gained ${reward} gold.`,
  );

  return finishNode(nextState, currentNode);
}

function finishNode(state: RunState, currentNode: MapNode): RunState {
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
      },
      message,
    );
  }

  return appendLog(
    {
      ...state,
      phase: "map",
    },
    "Choose the next path.",
  );
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

function startPlayerTurn(state: RunState): RunState {
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
        energy: STARTING_ENERGY,
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

    if (node.kind === "rest") {
      if (node.encounterId) {
        throw new Error(`rest node ${node.id} must not define an encounterId`);
      }

      continue;
    }

    if (!node.encounterId) {
      throw new Error(`${node.kind} node ${node.id} must define an encounterId`);
    }

    getEnemyDefinition(content, node.encounterId);
  }

  for (const node of content.map) {
    for (const nextId of node.nextIds) {
      if (!seenNodeIds.has(nextId)) {
        throw new Error(`node ${node.id} references unknown next node ${nextId}`);
      }
    }
  }
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
  let nextSeed = seed;

  for (let index = items.length - 1; index > 0; index -= 1) {
    const value = nextRandom(nextSeed);
    nextSeed = value.seed;
    const swapIndex = Math.floor(value.value * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return {
    items,
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
