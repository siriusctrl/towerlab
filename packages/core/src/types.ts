export type NodeKind = "battle" | "elite" | "rest" | "shop" | "boss" | "start";
export type RunPhase = "blessing" | "combat" | "map" | "rest" | "reward" | "shop" | "victory" | "defeat";
export type RestOptionId = "recover" | "fortify";
export type CardRarity = "common" | "rare" | "epic";
export type BlessingKind = "heal" | "gold" | "maxHp" | "card";

export interface CardRarityBuckets {
  common: string[];
  rare: string[];
  epic: string[];
}

export interface CharacterRelicPools {
  elite: string[];
  boss: string[];
}

export interface CharacterDefinition {
  id: string;
  name: string;
  summary: string;
  maxHp: number;
  startGold: number;
  starterDeck: string[];
  startingRelicId: string;
  blessingCards: [string, string, string];
  rewardCardPools: CardRarityBuckets;
  shopCardPools: CardRarityBuckets;
  relicPools: CharacterRelicPools;
}

export interface MapNode {
  id: string;
  kind: NodeKind;
  nextIds: string[];
  encounterId?: string;
  relicReward?: string;
}

export interface BlessingDefinition {
  id: string;
  kind: BlessingKind;
  value?: number;
  cardId?: string;
}

export interface TowerAct {
  id: string;
  map: MapNode[];
  blessings: BlessingDefinition[];
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

export type LogEffect =
  | { type: "damage"; amount: number }
  | { type: "block"; amount: number };

export type LogEvent =
  | { type: "actStarted"; act: number }
  | { type: "enteredNode"; nodeId: string; kind: NodeKind }
  | { type: "movedToNode"; nodeId: string; kind: NodeKind }
  | { type: "atEntrance" }
  | { type: "blessingChosen"; blessingId: string }
  | { type: "goldGained"; amount: number }
  | { type: "enemyAppeared"; enemyId: string; intent: EnemyIntent }
  | { type: "playedCard"; cardId: string; effects: LogEffect[] }
  | { type: "enemyDefeated"; enemyId: string; gold: number }
  | { type: "rewardOffered" }
  | { type: "rewardCardAdded"; cardId: string }
  | { type: "blessingCardAdded"; cardId: string }
  | { type: "rewardSkipped" }
  | { type: "chooseNextPath" }
  | { type: "chooseCampfire" }
  | { type: "recoveredHp"; amount: number }
  | { type: "fortified"; maxHp: number }
  | { type: "shopEntered" }
  | { type: "shopCardBought"; cardId: string; gold: number }
  | { type: "deckCardRemoved"; cardId: string; gold: number }
  | { type: "shopLeft" }
  | { type: "relicAlreadyOwned"; relicId: string }
  | { type: "relicAcquired"; relicId: string }
  | { type: "enemyUsedIntent"; enemyId: string; intent: EnemyIntent }
  | { type: "playerDefeated" }
  | { type: "turnStarted"; turn: number; intent: EnemyIntent }
  | { type: "bossCleared" }
  | { type: "pathVictory" }
  | { type: "climbEnded" };

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
  character: CharacterDefinition;
  acts: TowerAct[];
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
  characterId: string;
  act: number;
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
  log: LogEvent[];
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
  characterId: string;
  act: number;
  totalActs: number;
  phase: RunPhase;
  hp: number;
  maxHp: number;
  gold: number;
  floor: number;
  currentNode: MapNode;
  relics: RelicDefinition[];
  log: LogEvent[];
}

export interface BlessingObservation extends ObservationBase {
  phase: "blessing";
  blessings: BlessingDefinition[];
  nextNodes: MapNode[];
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
  | BlessingObservation
  | CombatObservation
  | MapObservation
  | RestObservation
  | RewardObservation
  | ShopObservation
  | EndObservation;

export type RunAction =
  | { type: "chooseBlessing"; blessingId: string }
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
