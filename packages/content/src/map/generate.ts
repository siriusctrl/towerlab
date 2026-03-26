import type { MapNode } from "@towerlab/core";

import {
  EARLY_KIND_POOL,
  ELITE_RELIC_POOL,
  LATE_KIND_POOL,
  MID_KIND_POOL,
  OPENING_KINDS,
  REGULAR_ROW_PATTERNS,
  TRANSITION_STYLES,
  type RegularNodeKind,
  type TransitionStyle,
} from "./config.js";
import { nextSeed, normalizeSeed, pickFrom, shuffle } from "./rng.js";

type GeneratedNode = MapNode & {
  row: number;
  position: number;
};

export function generateMap(seed: number): MapNode[] {
  let rng = normalizeSeed(seed);
  const patternPick = pickFrom(REGULAR_ROW_PATTERNS, rng);
  rng = patternPick.rng;

  const rows: GeneratedNode[][] = [];
  rows.push([
    {
      id: "start-r0",
      kind: "start",
      nextIds: [],
      row: 0,
      position: 1,
    },
  ]);

  patternPick.value.forEach((count, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const builtRow = buildRegularRow(rowNumber, count, rng);
    rng = builtRow.rng;
    rows.push(builtRow.nodes);
  });

  rows.push([
    {
      id: `boss-r${rows.length}`,
      kind: "boss",
      encounterId: "watchCore",
      relicReward: "reinforcedFrame",
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

  return rows.flat().map(({ row, position, ...node }) => node);
}

function buildRegularRow(rowNumber: number, count: number, seed: number): { nodes: GeneratedNode[]; rng: number } {
  const kindsResult = buildRowKinds(rowNumber, count, seed);
  let rng = kindsResult.rng;
  const nodes = kindsResult.kinds.map((kind, index) => {
    const node = createRegularNode(kind, rowNumber, index + 1, rng);
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

  const pool = rowNumber >= 7 ? LATE_KIND_POOL : rowNumber >= 4 ? MID_KIND_POOL : EARLY_KIND_POOL;
  const shuffled = shuffle(pool, seed);
  const kinds = shuffled.items.slice(0, count);

  if (!kinds.includes("shop")) {
    kinds[kinds.length - 1] = "shop";
  }

  if (!kinds.includes("rest")) {
    const restIndex = kinds.length > 2 ? 1 : 0;
    kinds[restIndex] = "rest";
  }

  if (rowNumber <= 6 && !kinds.includes("elite")) {
    kinds[0] = "elite";
  }

  return {
    kinds,
    rng: shuffled.rng,
  };
}

function createRegularNode(kind: RegularNodeKind, row: number, position: number, seed: number): { node: GeneratedNode; rng: number } {
  const id = `${kind}-r${row}-p${position}`;

  if (kind === "battle") {
    const encounterPick = pickFrom(row >= 5 ? ["crusher", "sentry"] : ["sentry", "crusher"], seed);
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
    const relicPick = pickFrom(ELITE_RELIC_POOL, seed);
    return {
      node: {
        id,
        kind,
        encounterId: "forgeKeeper",
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
