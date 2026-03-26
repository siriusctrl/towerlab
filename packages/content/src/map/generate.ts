import type { CharacterDefinition, MapNode, TowerAct } from "@towerlab/core";

import {
  ACT_CONFIGS,
  REGULAR_ROW_PATTERNS,
  EARLY_KIND_POOL,
  LATE_KIND_POOL,
  MID_KIND_POOL,
  OPENING_KINDS,
  TRANSITION_STYLES,
  type ActGenerationConfig,
  type RegularNodeKind,
  type TransitionStyle,
} from "./config.js";
import { nextSeed, normalizeSeed, pickFrom, shuffle } from "./rng.js";

type GeneratedNode = MapNode & {
  row: number;
  position: number;
};

export function generateActs(seed: number, character: CharacterDefinition): TowerAct[] {
  let rng = normalizeSeed(seed);

  return ACT_CONFIGS.map((config, index) => {
    const generated = generateAct(index + 1, rng, character, config);
    rng = generated.rng;
    return generated.act;
  });
}

function generateAct(
  actNumber: number,
  seed: number,
  character: CharacterDefinition,
  config: ActGenerationConfig,
): { act: TowerAct; rng: number } {
  let rng = seed;
  const patternPick = pickFrom(REGULAR_ROW_PATTERNS, rng);
  rng = patternPick.rng;

  const rows: GeneratedNode[][] = [];
  rows.push([
    {
      id: `act${actNumber}-start-r0`,
      kind: "start",
      nextIds: [],
      row: 0,
      position: 1,
    },
  ]);

  patternPick.value.forEach((count, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const builtRow = buildRegularRow(actNumber, rowNumber, count, character, config, rng);
    rng = builtRow.rng;
    rows.push(builtRow.nodes);
  });

  const bossPick = pickFrom(config.bossPool, rng);
  rng = bossPick.rng;
  const bossRelicPick = pickFrom(character.relicPools.boss, rng);
  rng = bossRelicPick.rng;
  rows.push([
    {
      id: `act${actNumber}-boss-r${rows.length}`,
      kind: "boss",
      encounterId: bossPick.value,
      relicReward: bossRelicPick.value,
      nextIds: [],
      row: rows.length,
      position: 1,
    },
  ]);

  for (let rowIndex = 0; rowIndex < rows.length - 1; rowIndex++) {
    rng = connectRows(rows[rowIndex]!, rows[rowIndex + 1]!, rng);
  }

  const nodeById = new Map(rows.flat().map((node) => [node.id, node]));
  for (const row of rows) {
    for (const node of row) {
      node.nextIds.sort((leftId, rightId) => {
        const left = nodeById.get(leftId);
        const right = nodeById.get(rightId);
        if (!left || !right) return leftId.localeCompare(rightId);
        if (left.row !== right.row) return left.row - right.row;
        return left.position - right.position;
      });
    }
  }

  return {
    act: {
      id: `act-${actNumber}`,
      map: rows.flat().map(({ row, position, ...node }) => node),
      blessings: createActBlessings(actNumber, character),
    },
    rng,
  };
}

function createActBlessings(actNumber: number, character: CharacterDefinition): TowerAct["blessings"] {
  if (actNumber === 1) {
    return [
      { id: `act${actNumber}-gold`, kind: "gold", value: 30 },
      { id: `act${actNumber}-maxhp`, kind: "maxHp", value: 6 },
      { id: `act${actNumber}-card`, kind: "card", cardId: character.blessingCards[0] },
    ];
  }

  if (actNumber === 2) {
    return [
      { id: `act${actNumber}-heal`, kind: "heal", value: 18 },
      { id: `act${actNumber}-gold`, kind: "gold", value: 40 },
      { id: `act${actNumber}-card`, kind: "card", cardId: character.blessingCards[1] },
    ];
  }

  return [
    { id: `act${actNumber}-heal`, kind: "heal", value: 24 },
    { id: `act${actNumber}-maxhp`, kind: "maxHp", value: 8 },
    { id: `act${actNumber}-card`, kind: "card", cardId: character.blessingCards[2] },
  ];
}

function buildRegularRow(
  actNumber: number,
  rowNumber: number,
  count: number,
  character: CharacterDefinition,
  config: ActGenerationConfig,
  seed: number,
): { nodes: GeneratedNode[]; rng: number } {
  const kindsResult = buildRowKinds(rowNumber, count, seed);
  let rng = kindsResult.rng;
  const nodes = kindsResult.kinds.map((kind, index) => {
    const node = createRegularNode(actNumber, kind, rowNumber, index + 1, character, config, rng);
    rng = node.rng;
    return node.node;
  });

  return { nodes, rng };
}

function buildRowKinds(rowNumber: number, count: number, seed: number): { kinds: RegularNodeKind[]; rng: number } {
  if (rowNumber === 1) {
    const shuffled = shuffle(OPENING_KINDS, seed);
    return { kinds: shuffled.items.slice(0, count), rng: shuffled.rng };
  }

  const pool = rowNumber >= 5 ? LATE_KIND_POOL : rowNumber >= 3 ? MID_KIND_POOL : EARLY_KIND_POOL;
  const shuffled = shuffle(pool, seed);
  const kinds = shuffled.items.slice(0, count);

  if (!kinds.includes("shop")) {
    kinds[kinds.length - 1] = "shop";
  }

  if (!kinds.includes("rest")) {
    kinds[Math.min(1, kinds.length - 1)] = "rest";
  }

  if (rowNumber <= 4 && !kinds.includes("elite")) {
    kinds[0] = "elite";
  }

  return {
    kinds,
    rng: shuffled.rng,
  };
}

function createRegularNode(
  actNumber: number,
  kind: RegularNodeKind,
  row: number,
  position: number,
  character: CharacterDefinition,
  config: ActGenerationConfig,
  seed: number,
): { node: GeneratedNode; rng: number } {
  const id = `act${actNumber}-${kind}-r${row}-p${position}`;

  if (kind === "battle") {
    const encounterPick = pickFrom(config.battlePool, seed);
    return {
      node: {
        id,
        kind,
        encounterId: encounterPick.value,
        nextIds: [],
        row,
        position,
      },
      rng: encounterPick.rng,
    };
  }

  if (kind === "elite") {
    const encounterPick = pickFrom(config.elitePool, seed);
    const relicPick = pickFrom(character.relicPools.elite, encounterPick.rng);
    return {
      node: {
        id,
        kind,
        encounterId: encounterPick.value,
        relicReward: relicPick.value,
        nextIds: [],
        row,
        position,
      },
      rng: relicPick.rng,
    };
  }

  return {
    node: {
      id,
      kind,
      nextIds: [],
      row,
      position,
    },
    rng: nextSeed(seed),
  };
}

function connectRows(previousRow: GeneratedNode[], nextRow: GeneratedNode[], seed: number): number {
  const stylePick = pickFrom(TRANSITION_STYLES, seed);
  const style = stylePick.value;
  const edgeSet = new Set<string>();

  for (let index = 0; index < previousRow.length; index++) {
    const targetIndex = projectIndex(index, previousRow.length, nextRow.length, style);
    addEdge(previousRow[index]!, nextRow[targetIndex]!, edgeSet);
  }

  for (let index = 0; index < nextRow.length; index++) {
    const sourceIndex = projectIndex(index, nextRow.length, previousRow.length, style);
    addEdge(previousRow[sourceIndex]!, nextRow[index]!, edgeSet);
  }

  return stylePick.rng;
}

function addEdge(from: GeneratedNode, to: GeneratedNode, edgeSet: Set<string>): void {
  const key = `${from.id}->${to.id}`;
  if (edgeSet.has(key)) return;

  from.nextIds.push(to.id);
  edgeSet.add(key);
}

function projectIndex(index: number, fromCount: number, toCount: number, style: TransitionStyle): number {
  if (toCount <= 1) return 0;
  if (fromCount <= 1) {
    if (style === "left") return 0;
    if (style === "right") return toCount - 1;
    return Math.floor((toCount - 1) / 2);
  }

  if (style === "left") {
    return clampIndex(Math.floor((index * toCount) / fromCount), toCount);
  }

  if (style === "right") {
    return clampIndex(Math.ceil(((index + 1) * toCount) / fromCount) - 1, toCount);
  }

  return clampIndex(Math.round((index * (toCount - 1)) / (fromCount - 1)), toCount);
}

function clampIndex(index: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index));
}
