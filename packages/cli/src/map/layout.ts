import { Graph, layout } from "@dagrejs/dagre";
import type { MapNode } from "@towerlab/core";

export type MapRenderMode = "icon" | "label";

export type PositionedNode = {
  centerX: number;
  label: string;
  rankIndex: number;
  row: number;
};

const GRID_SIDE_MARGIN = 1;
const DEFAULT_RANK_GAP_ROWS = 4;
const COMPACT_RANK_GAP_ROWS = 1;

export function computeNodeLayout(
  map: MapNode[],
  labels: Map<string, string>,
  width: number,
): Map<string, PositionedNode> {
  const graph = createLayoutGraph(map, labels);
  const rankGapRows = chooseRankGapRows(graph);
  return positionNodes(graph, map, labels, width, rankGapRows);
}

function createLayoutGraph(map: MapNode[], labels: Map<string, string>): Graph {
  const g = new Graph({ directed: true });
  g.setGraph({
    rankdir: "TB",
    nodesep: 6,
    ranksep: 8,
    edgesep: 4,
    marginx: 1,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of map) {
    const label = labels.get(node.id) ?? node.id;
    g.setNode(node.id, { label, width: Math.max(1, label.length), height: 1 });
  }

  for (const node of map) {
    for (let index = node.nextIds.length - 1; index >= 0; index--) {
      g.setEdge(node.id, node.nextIds[index]);
    }
  }

  layout(g);
  return g;
}

function positionNodes(
  graph: Graph,
  map: MapNode[],
  labels: Map<string, string>,
  width: number,
  rankGapRows: number,
): Map<string, PositionedNode> {
  const rankGroups = new Map<number, string[]>();
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;

  for (const nodeId of graph.nodes()) {
    const node = graph.node(nodeId);
    if (!node || node.dummy) continue;

    const rank = node.rank ?? 0;
    const x = node.x ?? 0;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);

    if (!rankGroups.has(rank)) {
      rankGroups.set(rank, []);
    }
    rankGroups.get(rank)!.push(nodeId);
  }

  const rankValues = [...rankGroups.keys()].sort((left, right) => left - right);
  const initialRankOrder = new Map<number, string[]>();
  for (const rank of rankValues) {
    const ids = [...(rankGroups.get(rank) ?? [])];
    ids.sort((leftId, rightId) => (graph.node(leftId)?.x ?? 0) - (graph.node(rightId)?.x ?? 0));
    initialRankOrder.set(rank, ids);
  }

  const optimizedRankOrder = optimizeRankOrder(rankValues, initialRankOrder, map);
  const rankIndexByValue = new Map(rankValues.map((rank, index) => [rank, index]));
  const positionedNodes = new Map<string, PositionedNode>();

  for (const rank of rankValues) {
    const ids = optimizedRankOrder.get(rank) ?? initialRankOrder.get(rank) ?? [];
    const desiredCenters = ids.map((id) => normalizeX(graph.node(id)?.x ?? 0, minX, maxX, width));
    const labelWidths = ids.map((id) => (labels.get(id) ?? id).length);
    const centers = spreadCenters(desiredCenters, labelWidths, width);
    const rankIndex = rankIndexByValue.get(rank) ?? 0;
    const row = rankIndex * (rankGapRows + 1);

    ids.forEach((id, index) => {
      positionedNodes.set(id, {
        centerX: centers[index],
        label: labels.get(id) ?? id,
        rankIndex,
        row,
      });
    });
  }

  for (const node of map) {
    if (positionedNodes.has(node.id)) continue;
    positionedNodes.set(node.id, {
      centerX: Math.max(GRID_SIDE_MARGIN, Math.floor(width / 2)),
      label: labels.get(node.id) ?? node.id,
      rankIndex: 0,
      row: 0,
    });
  }

  return positionedNodes;
}

function normalizeX(x: number, minX: number, maxX: number, width: number): number {
  const safeWidth = Math.max(1, width);
  const usableWidth = Math.max(1, safeWidth - GRID_SIDE_MARGIN * 2);

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || minX === maxX) {
    return Math.floor(safeWidth / 2);
  }

  const ratio = (x - minX) / (maxX - minX);
  return GRID_SIDE_MARGIN + Math.round(ratio * (usableWidth - 1));
}

function chooseRankGapRows(graph: Graph): number {
  const rankCount = new Set(
    graph
      .nodes()
      .map((nodeId) => graph.node(nodeId)?.rank)
      .filter((rank): rank is number => typeof rank === "number"),
  ).size;

  return rankCount >= 8 ? COMPACT_RANK_GAP_ROWS : DEFAULT_RANK_GAP_ROWS;
}

function spreadCenters(desiredCenters: number[], labelWidths: number[], width: number): number[] {
  if (desiredCenters.length === 0) return [];

  const maxX = Math.max(0, width - 1);
  const centers = desiredCenters.map((center, index) => clampCenter(center, labelWidths[index], maxX));

  for (let index = 1; index < centers.length; index++) {
    const minGap = minimumCenterGap(labelWidths[index - 1], labelWidths[index]);
    centers[index] = Math.max(centers[index], centers[index - 1] + minGap);
  }

  const overflow = Math.max(0, centers.at(-1)! + Math.ceil(labelWidths.at(-1)! / 2) - maxX);
  if (overflow > 0) {
    for (let index = 0; index < centers.length; index++) {
      centers[index] -= overflow;
    }
  }

  centers[0] = clampCenter(centers[0], labelWidths[0], maxX);

  for (let index = centers.length - 2; index >= 0; index--) {
    const minGap = minimumCenterGap(labelWidths[index], labelWidths[index + 1]);
    const rightBound = centers[index + 1] - minGap;
    centers[index] = clampCenter(Math.min(centers[index], rightBound), labelWidths[index], maxX);
  }

  return centers;
}

function clampCenter(centerX: number, labelWidth: number, maxX: number): number {
  const minCenter = Math.max(GRID_SIDE_MARGIN, Math.floor(labelWidth / 2));
  const maxCenter = Math.max(minCenter, maxX - Math.ceil(labelWidth / 2));
  return Math.max(minCenter, Math.min(maxCenter, centerX));
}

function minimumCenterGap(leftWidth: number, rightWidth: number): number {
  return Math.ceil((leftWidth + rightWidth) / 2) + 1;
}

function optimizeRankOrder(rankValues: number[], initialRankOrder: Map<number, string[]>, map: MapNode[]): Map<number, string[]> {
  const incoming = buildIncomingAdjacency(map);
  const outgoing = new Map(map.map((node) => [node.id, [...node.nextIds]]));
  const optimized = new Map<number, string[]>();

  for (const [rank, ids] of initialRankOrder) {
    optimized.set(rank, [...ids]);
  }

  for (let sweep = 0; sweep < 4; sweep++) {
    for (let index = 1; index < rankValues.length; index++) {
      const rank = rankValues[index];
      const ids = optimized.get(rank) ?? [];
      optimized.set(rank, reorderRank(ids, incoming, optimized, rankValues[index - 1], initialRankOrder.get(rank) ?? []));
    }

    for (let index = rankValues.length - 2; index >= 0; index--) {
      const rank = rankValues[index];
      const ids = optimized.get(rank) ?? [];
      optimized.set(rank, reorderRank(ids, outgoing, optimized, rankValues[index + 1], initialRankOrder.get(rank) ?? []));
    }
  }

  return optimized;
}

function reorderRank(
  ids: string[],
  adjacency: Map<string, string[]>,
  rankOrder: Map<number, string[]>,
  adjacentRank: number,
  initialIds: string[],
): string[] {
  const adjacentIds = rankOrder.get(adjacentRank) ?? [];
  const adjacentPositions = new Map(adjacentIds.map((id, index) => [id, index]));
  const initialPositions = new Map(initialIds.map((id, index) => [id, index]));
  const ordered = [...ids].sort((leftId, rightId) => {
    const leftPriority = barycenter(adjacency.get(leftId) ?? [], adjacentPositions, initialPositions.get(leftId) ?? 0);
    const rightPriority = barycenter(adjacency.get(rightId) ?? [], adjacentPositions, initialPositions.get(rightId) ?? 0);
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return (initialPositions.get(leftId) ?? 0) - (initialPositions.get(rightId) ?? 0);
  });

  return locallyOptimizeRank(ordered, adjacency, adjacentPositions);
}

function barycenter(ids: string[], positions: Map<string, number>, fallback: number): number {
  const values = ids.map((id) => positions.get(id)).filter((value): value is number => value !== undefined);
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function locallyOptimizeRank(ids: string[], adjacency: Map<string, string[]>, adjacentPositions: Map<string, number>): string[] {
  const ordered = [...ids];
  let changed = true;

  while (changed) {
    changed = false;
    for (let index = 0; index < ordered.length - 1; index++) {
      const currentScore = adjacentCrossingScore(ordered, adjacency, adjacentPositions);
      const swapped = [...ordered];
      [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
      const swappedScore = adjacentCrossingScore(swapped, adjacency, adjacentPositions);
      if (swappedScore < currentScore) {
        [ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]];
        changed = true;
      }
    }
  }

  return ordered;
}

function adjacentCrossingScore(ids: string[], adjacency: Map<string, string[]>, adjacentPositions: Map<string, number>): number {
  const positions = new Map(ids.map((id, index) => [id, index]));
  const edges = ids.flatMap((id) =>
    (adjacency.get(id) ?? [])
      .map((adjacentId) => {
        const toPosition = adjacentPositions.get(adjacentId);
        if (toPosition === undefined) return null;
        return { from: positions.get(id) ?? 0, to: toPosition };
      })
      .filter((edge): edge is { from: number; to: number } => edge !== null),
  );

  let crossings = 0;
  for (let leftIndex = 0; leftIndex < edges.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < edges.length; rightIndex++) {
      const left = edges[leftIndex];
      const right = edges[rightIndex];
      if (left.from === right.from || left.to === right.to) continue;
      if ((left.from - right.from) * (left.to - right.to) < 0) {
        crossings += 1;
      }
    }
  }

  return crossings;
}

function buildIncomingAdjacency(map: MapNode[]): Map<string, string[]> {
  const incoming = new Map<string, string[]>();

  for (const node of map) {
    if (!incoming.has(node.id)) {
      incoming.set(node.id, []);
    }

    for (const nextId of node.nextIds) {
      if (!incoming.has(nextId)) {
        incoming.set(nextId, []);
      }
      incoming.get(nextId)!.push(node.id);
    }
  }

  return incoming;
}
