import type { CharacterDefinition, MapNode, TowerAct } from "@towerlab/core";

import {
  ACT_CONFIGS,
  ACT_PATH_CONSTRAINTS,
  EXTRA_CROSS_LINKS_PER_TRANSITION,
  MAX_ACT_GENERATION_ATTEMPTS,
  REGULAR_ROW_PATTERNS,
  EARLY_KIND_POOL,
  LATE_KIND_POOL,
  MID_KIND_POOL,
  OPENING_KINDS,
  TRANSITION_STYLES,
  type ActGenerationConfig,
  type ActPathConstraint,
  type RegularNodeKind,
  type TransitionStyle,
} from "./config.js";
import { nextSeed, normalizeSeed, pickFrom, shuffle } from "./rng.js";

type GeneratedNode = MapNode & {
  row: number;
  position: number;
};

type PathStats = {
  eliteCount: number;
  utilityCount: number;
  maxConsecutiveElite: number;
};

type PathConstraintEvaluation = {
  valid: boolean;
  score: number;
};

type BlessingUtilityTemplate = {
  id: string;
  kind: "heal" | "gold" | "maxHp";
  value: number;
};

export function generateActs(seed: number, character: CharacterDefinition): TowerAct[] {
  let rng = normalizeSeed(seed);
  const usedEliteRelics = new Set<string>();
  const usedBossRelics = new Set<string>();

  return ACT_CONFIGS.map((config, index) => {
    const generated = generateAct(index + 1, rng, character, config, usedEliteRelics, usedBossRelics);
    rng = generated.rng;
    return generated.act;
  });
}

function generateAct(
  actNumber: number,
  seed: number,
  character: CharacterDefinition,
  config: ActGenerationConfig,
  usedEliteRelics: Set<string>,
  usedBossRelics: Set<string>,
): { act: TowerAct; rng: number } {
  const constraints = config.pathConstraints ?? ACT_PATH_CONSTRAINTS[actNumber - 1];
  if (!constraints) {
    throw new Error(`Missing path constraints for act ${actNumber}`);
  }

  let rng = seed;
  let bestDraft: {
    rows: GeneratedNode[][];
    rng: number;
    blessings: TowerAct["blessings"];
    relicCandidates: { elite: string[]; boss: string };
    valid: boolean;
    score: number;
  } | null = null;

  for (let attempt = 0; attempt < MAX_ACT_GENERATION_ATTEMPTS; attempt += 1) {
    const attemptEliteRelics = new Set(usedEliteRelics);
    const attemptBossRelics = new Set(usedBossRelics);
    const patternPick = pickFrom(REGULAR_ROW_PATTERNS, rng);
    let draftRng = patternPick.rng;
    const rows: GeneratedNode[][] = [];
    const usedEliteRelicOrder = Array.from(attemptEliteRelics);

    rows.push([
      {
        id: `act${actNumber}-start-r0`,
        kind: "start",
        nextIds: [],
        row: 0,
        position: 1,
      },
    ]);

    for (let rowIndex = 0; rowIndex < patternPick.value.length; rowIndex += 1) {
      const rowNumber = rowIndex + 1;
      const builtRow = buildRegularRow(
        actNumber,
        rowNumber,
        patternPick.value[rowIndex]!,
        character,
        config,
        draftRng,
        attemptEliteRelics,
      );
      draftRng = builtRow.rng;
      rows.push(builtRow.nodes);
    }

    const bossPick = pickFrom(config.bossPool, draftRng);
    draftRng = bossPick.rng;
    const bossRelicPick = pickUniqueFromPool(character.relicPools.boss, draftRng, attemptBossRelics);
    draftRng = bossRelicPick.rng;
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

    for (let rowIndex = 0; rowIndex < rows.length - 1; rowIndex += 1) {
      draftRng = connectRows(rows[rowIndex]!, rows[rowIndex + 1]!, draftRng);
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

    const stats = computePathStats(rows);
    const evaluation = evaluatePathConstraints(stats, constraints);
    const blessingResult = createActBlessings(actNumber, character, draftRng);
    draftRng = blessingResult.rng;
    const draft = {
      rows,
      rng: draftRng,
      blessings: blessingResult.blessings,
      relicCandidates: {
        elite: Array.from(attemptEliteRelics).filter((relic) => !usedEliteRelicOrder.includes(relic)),
        boss: bossRelicPick.value,
      },
      valid: evaluation.valid,
      score: evaluation.score,
    };
    if (evaluation.valid) {
      applyRelicUsageFromAttempt(draft.relicCandidates, usedEliteRelics, usedBossRelics);
      rng = draft.rng;

      return {
        act: {
          id: `act-${actNumber}`,
          map: rows.flat().map(({ row, position, ...node }) => node),
          blessings: draft.blessings,
        },
        rng,
      };
    }

    if (bestDraft === null || draft.score < bestDraft.score) {
      bestDraft = draft;
    }

    draftRng = nextSeed(draftRng);
    rng = draftRng;
  }

  if (bestDraft) {
    if (bestDraft.valid) {
      applyRelicUsageFromAttempt(bestDraft.relicCandidates, usedEliteRelics, usedBossRelics);
      return {
        act: {
          id: `act-${actNumber}`,
          map: bestDraft.rows.flat().map(({ row, position, ...node }) => node),
          blessings: bestDraft.blessings,
        },
        rng: bestDraft.rng,
      };
    }
  }

  throw new Error(`Failed to build act ${actNumber} layout after ${MAX_ACT_GENERATION_ATTEMPTS} attempts`);
}

function createActBlessings(actNumber: number, character: CharacterDefinition, seed: number): { blessings: TowerAct["blessings"]; rng: number } {
  const utilityPick = pickFrom(getActBlessingUtilities(actNumber), seed);
  const utility = utilityPick.value;
  const cardPool = getBlessingCardPoolForAct(character, actNumber);
  const shuffledCards = shuffle(cardPool, utilityPick.rng);
  const firstCardId = shuffledCards.items[0]!;
  const secondCardId = shuffledCards.items[1] ?? shuffledCards.items[0]!;
  const upgradedFlags = actNumber === 1 ? [false, false] : actNumber === 2 ? [false, true] : [true, true];

  return {
    blessings: [
      {
        id: `act${actNumber}-${utility.id}`,
        kind: utility.kind,
        value: utility.value,
      },
      {
        id: `act${actNumber}-card-${firstCardId}${upgradedFlags[0] ? "-up" : ""}`,
        kind: "card",
        cardId: firstCardId,
        upgraded: upgradedFlags[0],
      },
      {
        id: `act${actNumber}-card-${secondCardId}${upgradedFlags[1] ? "-up" : ""}`,
        kind: "card",
        cardId: secondCardId,
        upgraded: upgradedFlags[1],
      },
    ],
    rng: shuffledCards.rng,
  };
}

function buildRegularRow(
  actNumber: number,
  rowNumber: number,
  count: number,
  character: CharacterDefinition,
  config: ActGenerationConfig,
  seed: number,
  usedEliteRelics: Set<string>,
): { nodes: GeneratedNode[]; rng: number } {
  const kindsResult = buildRowKinds(rowNumber, count, seed);
  let rng = kindsResult.rng;
  const nodes = kindsResult.kinds.map((kind, index) => {
    const node = createRegularNode(actNumber, kind, rowNumber, index + 1, character, config, rng, usedEliteRelics);
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

  const requiredUtility = getRequiredUtility(rowNumber);
  if (requiredUtility && !kinds.includes(requiredUtility)) {
    kinds[kinds.length - 1] = requiredUtility;
  }

  return {
    kinds,
    rng: shuffled.rng,
  };
}

function applyRelicUsageFromAttempt(
  attemptRelics: { elite: string[]; boss: string },
  usedEliteRelics: Set<string>,
  usedBossRelics: Set<string>,
): void {
  for (const relicId of attemptRelics.elite) {
    usedEliteRelics.add(relicId);
  }
  usedBossRelics.add(attemptRelics.boss);
}

function computePathStats(rows: GeneratedNode[][]): PathStats[] {
  const nodeById = new Map(rows.flat().map((node) => [node.id, node]));
  const start = rows[0]?.[0];
  const boss = rows.at(-1)?.[0];

  if (!start || !boss) {
    return [];
  }

  const pathStats: PathStats[] = [];
  const stack: Array<{ node: GeneratedNode; eliteCount: number; utilityCount: number; currentConsecutiveElite: number; maxConsecutiveElite: number }> = [
    {
      node: start,
      eliteCount: 0,
      utilityCount: 0,
      currentConsecutiveElite: 0,
      maxConsecutiveElite: 0,
    },
  ];

  while (stack.length > 0) {
    const state = stack.pop();
    if (!state) continue;

    if (state.node.id === boss.id) {
      pathStats.push({
        eliteCount: state.eliteCount,
        utilityCount: state.utilityCount,
        maxConsecutiveElite: state.maxConsecutiveElite,
      });
      continue;
    }

    for (const nextId of state.node.nextIds) {
      const next = nodeById.get(nextId);
      if (!next) continue;

      const nextIsElite = next.kind === "elite";
      const nextIsUtility = next.kind === "rest" || next.kind === "shop";
      const nextConsecutiveElite = nextIsElite ? state.currentConsecutiveElite + 1 : 0;
      stack.push({
        node: next,
        eliteCount: state.eliteCount + (nextIsElite ? 1 : 0),
        utilityCount: state.utilityCount + (nextIsUtility ? 1 : 0),
        currentConsecutiveElite: nextConsecutiveElite,
        maxConsecutiveElite: Math.max(state.maxConsecutiveElite, nextConsecutiveElite),
      });
    }
  }

  return pathStats;
}

function evaluatePathConstraints(stats: PathStats[], constraints: ActPathConstraint): PathConstraintEvaluation {
  if (stats.length === 0) {
    return { valid: false, score: Number.POSITIVE_INFINITY };
  }

  const eliteCounts = stats.map((path) => path.eliteCount);
  const utilityCounts = stats.map((path) => path.utilityCount);
  const minEliteCount = Math.min(...eliteCounts);
  const maxEliteCount = Math.max(...eliteCounts);
  const minUtilityCount = Math.min(...utilityCounts);
  const maxUtilityCount = Math.max(...utilityCounts);
  const uniqueEliteCounts = new Set(eliteCounts);
  const easyPaths = stats.filter((path) => path.eliteCount === constraints.easyEliteCount);
  const hardPaths = stats.filter((path) => path.eliteCount === constraints.hardEliteCount);
  const easyUtilityMax = easyPaths.length > 0 ? Math.max(...easyPaths.map((path) => path.utilityCount)) : 0;
  const hardUtilityMin = hardPaths.length > 0 ? Math.min(...hardPaths.map((path) => path.utilityCount)) : maxUtilityCount;
  const consecutiveOkay = stats.every((path) => path.maxConsecutiveElite <= constraints.maxConsecutiveElite);
  const eliteBoundsOkay = minEliteCount >= constraints.minEliteCount && maxEliteCount <= constraints.maxEliteCount;
  const spreadOkay = maxEliteCount - minEliteCount <= constraints.maxEliteSpread;

  let score = 0;

  score += Math.abs(minEliteCount - constraints.easyEliteCount) * 100;
  score += Math.abs(maxEliteCount - constraints.hardEliteCount) * 100;
  score += Math.max(0, maxEliteCount - minEliteCount - constraints.maxEliteSpread) * 100;
  score += Math.max(0, constraints.minEliteCount - minEliteCount) * 100;
  score += Math.max(0, maxEliteCount - constraints.maxEliteCount) * 100;

  if (uniqueEliteCounts.size < 2) {
    score += 50;
  }

  if (easyPaths.length === 0) {
    score += 75;
  }

  if (hardPaths.length === 0) {
    score += 75;
  }

  score += Math.max(0, 2 - easyUtilityMax) * 10;
  score += Math.max(0, hardUtilityMin - 2) * 5;
  score += Math.max(0, maxUtilityCount - minUtilityCount - 3) * 5;

  if (easyUtilityMax <= hardUtilityMin) {
    score += 25;
  }

  if (!consecutiveOkay) {
    score += 500;
  }

  return {
    valid: consecutiveOkay && eliteBoundsOkay && spreadOkay && uniqueEliteCounts.size >= 2,
    score,
  };
}

function getRequiredUtility(rowNumber: number): Extract<RegularNodeKind, "rest" | "shop"> | null {
  if (rowNumber === 3 || rowNumber === 8) {
    return "rest";
  }

  if (rowNumber === 6) {
    return "shop";
  }

  return null;
}

function createRegularNode(
  actNumber: number,
  kind: RegularNodeKind,
  row: number,
  position: number,
  character: CharacterDefinition,
  config: ActGenerationConfig,
  seed: number,
  usedEliteRelics: Set<string>,
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
    const relicPick = pickUniqueFromPool(character.relicPools.elite, encounterPick.rng, usedEliteRelics);
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

function pickUniqueFromPool(pool: string[], seed: number, used: Set<string>): { value: string; rng: number } {
  const available = pool.filter((item) => !used.has(item));
  const source = available.length > 0 ? available : pool;

  if (available.length === 0) {
    used.clear();
  }

  const pick = pickFrom(source, seed);
  used.add(pick.value);
  return pick;
}

function connectRows(previousRow: GeneratedNode[], nextRow: GeneratedNode[], seed: number): number {
  const stylePick = pickFrom(TRANSITION_STYLES, seed);
  const style = stylePick.value;
  const edgeSet = new Set<string>();
  let rng = stylePick.rng;

  for (let index = 0; index < previousRow.length; index++) {
    const targetIndex = projectIndex(index, previousRow.length, nextRow.length, style);
    addEdge(previousRow[index]!, nextRow[targetIndex]!, edgeSet);
  }

  for (let index = 0; index < nextRow.length; index++) {
    const sourceIndex = projectIndex(index, nextRow.length, previousRow.length, style);
    addEdge(previousRow[sourceIndex]!, nextRow[index]!, edgeSet);
  }

  const extraCandidates = buildExtraTransitionCandidates(previousRow, nextRow, style, edgeSet);

  if (
    previousRow.length >= 4
    && nextRow.length >= 4
    && extraCandidates.length > 0
    && EXTRA_CROSS_LINKS_PER_TRANSITION > 0
  ) {
    const shuffled = shuffle(extraCandidates, rng);
    rng = shuffled.rng;

    for (const candidate of shuffled.items.slice(0, EXTRA_CROSS_LINKS_PER_TRANSITION)) {
      addEdge(candidate.from, candidate.to, edgeSet);
    }
  }

  return rng;
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

function getActBlessingUtilities(actNumber: number): BlessingUtilityTemplate[] {
  if (actNumber === 1) {
    return [
      { id: "gold", kind: "gold", value: 35 },
      { id: "maxhp", kind: "maxHp", value: 7 },
      { id: "gold-big", kind: "gold", value: 45 },
    ];
  }

  if (actNumber === 2) {
    return [
      { id: "heal", kind: "heal", value: 18 },
      { id: "gold", kind: "gold", value: 45 },
      { id: "maxhp", kind: "maxHp", value: 6 },
    ];
  }

  return [
    { id: "heal", kind: "heal", value: 22 },
    { id: "gold", kind: "gold", value: 60 },
    { id: "maxhp", kind: "maxHp", value: 8 },
  ];
}

function getBlessingCardPoolForAct(character: CharacterDefinition, actNumber: number): string[] {
  if (actNumber === 1) {
    return character.blessingCardPools.act1;
  }

  if (actNumber === 2) {
    return character.blessingCardPools.act2;
  }

  return character.blessingCardPools.act3;
}

function buildExtraTransitionCandidates(
  previousRow: GeneratedNode[],
  nextRow: GeneratedNode[],
  style: TransitionStyle,
  edgeSet: Set<string>,
): Array<{ from: GeneratedNode; to: GeneratedNode }> {
  const candidates: Array<{ from: GeneratedNode; to: GeneratedNode }> = [];

  for (let index = 0; index < previousRow.length; index += 1) {
    const from = previousRow[index]!;
    const primaryTarget = projectIndex(index, previousRow.length, nextRow.length, style);

    for (const offset of [-1, 1]) {
      const targetIndex = primaryTarget + offset;

      if (targetIndex < 0 || targetIndex >= nextRow.length) {
        continue;
      }

      const to = nextRow[targetIndex]!;
      const key = `${from.id}->${to.id}`;

      if (!edgeSet.has(key)) {
        candidates.push({ from, to });
      }
    }
  }

  return candidates;
}
