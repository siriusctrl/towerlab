export type NodeKind = "battle" | "elite" | "rest" | "shop" | "boss";

export interface MapNode {
  id: string;
  kind: NodeKind;
  nextIds: string[];
}

export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  description: string;
  damage?: number;
  block?: number;
}

export interface RunContent {
  cards: Record<string, CardDefinition>;
  starterDeck: string[];
  map: MapNode[];
}

export interface RunState {
  seed: number;
  hp: number;
  maxHp: number;
  gold: number;
  floor: number;
  currentNodeId: string;
  drawPile: string[];
  hand: string[];
  discardPile: string[];
}

export interface Observation {
  seed: number;
  hp: number;
  maxHp: number;
  gold: number;
  floor: number;
  currentNode: MapNode;
  nextNodes: MapNode[];
  hand: CardDefinition[];
  drawPileCount: number;
  discardPileCount: number;
}

export function createRun(content: RunContent, seed: number): RunState {
  const firstNode = content.map[0];

  if (!firstNode) {
    throw new Error("map must contain at least one node");
  }

  const drawPile = shuffle([...content.starterDeck], seed);
  const hand = drawPile.splice(0, 5);

  return {
    seed,
    hp: 80,
    maxHp: 80,
    gold: 99,
    floor: 0,
    currentNodeId: firstNode.id,
    drawPile,
    hand,
    discardPile: [],
  };
}

export function observeRun(content: RunContent, state: RunState): Observation {
  const currentNode = getNode(content, state.currentNodeId);
  const nextNodes = currentNode.nextIds.map((id) => getNode(content, id));

  return {
    seed: state.seed,
    hp: state.hp,
    maxHp: state.maxHp,
    gold: state.gold,
    floor: state.floor,
    currentNode,
    nextNodes,
    hand: state.hand.map((cardId) => getCard(content, cardId)),
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
  };
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

function shuffle<T>(items: T[], seed: number): T[] {
  const next = mulberry32(seed);

  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(next() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
