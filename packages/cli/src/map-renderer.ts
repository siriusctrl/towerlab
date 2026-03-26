import { Graph, layout } from "@dagrejs/dagre";
import type { MapNode, Observation } from "@towerlab/core";

import { formatNodeLabel, type Locale } from "./i18n.js";
import type { MapCellStatus, MapTreeCell, MapTreeRow } from "./view.js";

const NODE_BADGES: Record<string, string> = {
  start: "S",
  battle: "F",
  elite: "E",
  rest: "R",
  shop: "$",
  boss: "B",
};

const GRID_SIDE_MARGIN = 1;
const DEFAULT_RANK_GAP_ROWS = 4;
const COMPACT_RANK_GAP_ROWS = 1;

const DIR_NORTH = 1;
const DIR_EAST = 2;
const DIR_SOUTH = 4;
const DIR_WEST = 8;

const CONNECTOR_GLYPHS = new Map<number, string>([
  [0, " "],
  [DIR_NORTH, "│"],
  [DIR_SOUTH, "│"],
  [DIR_NORTH | DIR_SOUTH, "│"],
  [DIR_EAST, "─"],
  [DIR_WEST, "─"],
  [DIR_EAST | DIR_WEST, "─"],
  [DIR_SOUTH | DIR_EAST, "┌"],
  [DIR_SOUTH | DIR_WEST, "┐"],
  [DIR_NORTH | DIR_EAST, "└"],
  [DIR_NORTH | DIR_WEST, "┘"],
  [DIR_NORTH | DIR_SOUTH | DIR_EAST, "├"],
  [DIR_NORTH | DIR_SOUTH | DIR_WEST, "┤"],
  [DIR_EAST | DIR_WEST | DIR_SOUTH, "┬"],
  [DIR_EAST | DIR_WEST | DIR_NORTH, "┴"],
  [DIR_NORTH | DIR_EAST | DIR_SOUTH | DIR_WEST, "┼"],
]);

export function getNodeBadge(kind: string): string {
  return NODE_BADGES[kind] ?? "?";
}

export type MapRenderMode = "icon" | "label";

type PositionedNode = {
  centerX: number;
  label: string;
  rankIndex: number;
  row: number;
};

type ChoiceOwners = Set<number>;

type EdgeDescriptor = {
  from: PositionedNode;
  fromId: string;
  to: PositionedNode;
  toId: string;
};

type GridCell = {
  ch: string;
  status: MapCellStatus;
  mask: number;
};

type CharGrid = {
  width: number;
  height: number;
  cells: GridCell[][];
};

export function renderDagreMap(
  map: MapNode[],
  observation: Observation,
  locale: Locale,
  visitedNodeIds: string[],
  width: number,
  mode: MapRenderMode = "icon",
): MapTreeRow[] {
  if (map.length === 0) return [];

  const nextNodes = getNextNodeIds(map, observation);
  const nextNodeOrder = new Map(nextNodes.map((id, i) => [id, i]));
  const visitedSet = new Set(visitedNodeIds);
  const reachable = computeReachable(map, observation.currentNode.id);
  const choiceOwners = computeChoiceOwners(map, nextNodes);
  const edgeChoiceOwners = computeEdgeChoiceOwners(map, observation.currentNode.id, nextNodes);
  const labels = createLabels(map, locale, mode);
  const layoutGraph = createLayoutGraph(map, labels);
  const rankGapRows = chooseRankGapRows(layoutGraph);
  const positionedNodes = positionNodes(layoutGraph, map, labels, width, rankGapRows);

  const maxRankIndex = Math.max(...[...positionedNodes.values()].map((node) => node.rankIndex), 0);
  const gridHeight = maxRankIndex * (rankGapRows + 1) + 1;
  const grid = createGrid(width, gridHeight);

  for (const node of map) {
    const positioned = positionedNodes.get(node.id);
    if (!positioned) continue;
    const status = applyChoiceHighlight(nodeStatus(node.id, observation.currentNode.id, nextNodeOrder, visitedSet, reachable), choiceOwners.get(node.id));
    placeLabel(grid, positioned.centerX, positioned.row, positioned.label, status);
  }

  routeEdges(grid, map, positionedNodes, edgeChoiceOwners);

  return gridToRows(grid);
}

function createLabels(map: MapNode[], locale: Locale, mode: MapRenderMode): Map<string, string> {
  const labels = new Map<string, string>();

  for (const node of map) {
    const badge = getNodeBadge(node.kind);
    labels.set(node.id, mode === "icon" ? badge : `${badge} ${formatNodeLabel(node, locale)}`);
  }

  return labels;
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
    for (let i = node.nextIds.length - 1; i >= 0; i--) {
      g.setEdge(node.id, node.nextIds[i]);
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

  const rankValues = [...rankGroups.keys()].sort((a, b) => a - b);
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

  // Make sure every content node has a position even if dagre omits metadata.
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

function routeEdges(grid: CharGrid, map: MapNode[], positionedNodes: Map<string, PositionedNode>, edgeChoiceOwners: Map<string, ChoiceOwners>): void {
  const edges = map.flatMap((node) =>
    node.nextIds
      .map((nextId) => {
        const from = positionedNodes.get(node.id);
        const to = positionedNodes.get(nextId);
        if (!from || !to) return null;
        return { from, fromId: node.id, to, toId: nextId };
      })
      .filter((entry): entry is EdgeDescriptor => entry !== null),
  );

  const grouped = new Map<string, EdgeDescriptor[]>();

  for (const edge of edges) {
    const key = `${edge.from.rankIndex}:${edge.to.rankIndex}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(edge);
  }

  for (const group of grouped.values()) {
    group.sort((left, right) => {
      const leftSpan = Math.abs(left.from.centerX - left.to.centerX);
      const rightSpan = Math.abs(right.from.centerX - right.to.centerX);

      if (leftSpan !== rightSpan) return leftSpan - rightSpan;
      if (left.from.centerX !== right.from.centerX) return left.from.centerX - right.from.centerX;
      return left.to.centerX - right.to.centerX;
    });

    const sourceRow = group[0].from.row;
    const targetRow = group[0].to.row;
    const sourceSiblings = new Map<string, EdgeDescriptor[]>();
    for (const edge of group) {
      if (!sourceSiblings.has(edge.fromId)) {
        sourceSiblings.set(edge.fromId, []);
      }
      sourceSiblings.get(edge.fromId)!.push(edge);
    }
    for (const siblings of sourceSiblings.values()) {
      siblings.sort((left, right) => left.to.centerX - right.to.centerX);
    }
    const hasFanout = [...sourceSiblings.values()].some((siblings) => siblings.length > 1);
    const laneRows = createLaneRows(sourceRow + (hasFanout ? 2 : 1), targetRow - 1, group.length);

    group.forEach((edge, edgeIndex) => {
      const siblings = sourceSiblings.get(edge.fromId) ?? [edge];
      const siblingIndex = siblings.findIndex((candidate) => candidate.toId === edge.toId);
      routeEdge(
        grid,
        edge.from.centerX,
        sourcePortX(edge.from.centerX, siblingIndex, siblings.length, grid.width),
        edge.from.row,
        edge.to.centerX,
        edge.to.row,
        laneRows[edgeIndex] ?? laneRows.at(-1) ?? sourceRow + 1,
        connectorChoiceStatus(edgeChoiceOwners.get(edgeKey(edge.fromId, edge.toId))),
        siblings.length > 1,
      );
    });
  }
}

function createLaneRows(startRow: number, endRow: number, count: number): number[] {
  if (count <= 0) return [];
  if (startRow >= endRow) return [startRow];

  const available = endRow - startRow + 1;
  if (count === 1) {
    return [startRow + Math.floor(available / 2)];
  }

  if (count <= available) {
    return Array.from({ length: count }, (_, index) => startRow + index);
  }

  const rows: number[] = [];
  for (let index = 0; index < count; index++) {
    const ratio = available === 1 ? 0 : index / (count - 1);
    rows.push(startRow + Math.round(ratio * (available - 1)));
  }

  return rows;
}

function routeEdge(
  grid: CharGrid,
  x0: number,
  xStart: number,
  y0: number,
  x1: number,
  y1: number,
  laneRow: number,
  status: MapCellStatus,
  hasFanout: boolean,
): void {
  if (y0 >= y1) return;

  const startRow = y0 + 1;
  if (hasFanout) {
    addConnectorMask(grid, x0, startRow, DIR_NORTH, "connector");
  }

  if (xStart !== x0) {
    addHorizontalSegment(grid, startRow, x0, xStart, status);
  }

  const firstBendRow = hasFanout ? startRow + 1 : startRow;

  if (xStart === x1) {
    addVerticalSegment(grid, xStart, startRow, y1 - 1, status);
    return;
  }

  const bendRow = Math.max(firstBendRow, Math.min(y1 - 1, laneRow));
  addVerticalSegment(grid, xStart, startRow, bendRow, status);
  addHorizontalSegment(grid, bendRow, xStart, x1, status);
  addVerticalSegment(grid, x1, bendRow, y1 - 1, status);
}

function createGrid(width: number, height: number): CharGrid {
  const cells: GridCell[][] = [];

  for (let y = 0; y < height; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ ch: " ", status: "connector", mask: 0 });
    }
    cells.push(row);
  }

  return { width, height, cells };
}

function placeLabel(grid: CharGrid, centerX: number, y: number, label: string, status: MapCellStatus): void {
  const labelWidth = label.length;
  let startX = Math.max(0, centerX - Math.floor(labelWidth / 2));

  if (startX + labelWidth > grid.width) {
    startX = Math.max(0, grid.width - labelWidth);
  }

  if (y < 0 || y >= grid.height) {
    return;
  }

  for (let index = 0; index < label.length && startX + index < grid.width; index++) {
    grid.cells[y][startX + index] = { ch: label[index], status, mask: 0 };
  }
}

function addVerticalSegment(grid: CharGrid, x: number, startY: number, endY: number, status: MapCellStatus): void {
  if (startY > endY) return;

  for (let y = startY; y <= endY; y++) {
    let mask = 0;
    if (y > startY) mask |= DIR_NORTH;
    if (y < endY) mask |= DIR_SOUTH;
    if (startY === endY) mask |= DIR_NORTH | DIR_SOUTH;
    addConnectorMask(grid, x, y, mask, status);
  }
}

function addHorizontalSegment(grid: CharGrid, y: number, startX: number, endX: number, status: MapCellStatus): void {
  const leftX = Math.min(startX, endX);
  const rightX = Math.max(startX, endX);

  for (let x = leftX; x <= rightX; x++) {
    let mask = 0;
    if (x > leftX) mask |= DIR_WEST;
    if (x < rightX) mask |= DIR_EAST;
    if (leftX === rightX) mask |= DIR_EAST | DIR_WEST;
    addConnectorMask(grid, x, y, mask, status);
  }
}

function addConnectorMask(grid: CharGrid, x: number, y: number, mask: number, status: MapCellStatus): void {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return;

  const cell = grid.cells[y][x];
  if (!isConnectorStatus(cell.status)) return;

  cell.mask |= mask;
  cell.ch = CONNECTOR_GLYPHS.get(cell.mask) ?? "┼";
  cell.status = mergeConnectorStatus(cell.status, status);
}

function gridToRows(grid: CharGrid): MapTreeRow[] {
  const rows: MapTreeRow[] = [];

  for (let y = 0; y < grid.height; y++) {
    const row: MapTreeCell[] = [];
    let text = "";
    let currentStatus: MapCellStatus = grid.cells[y][0]?.status ?? "connector";

    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      if (cell.status !== currentStatus) {
        if (text.length > 0) {
          row.push({ text, status: currentStatus });
        }
        text = cell.ch;
        currentStatus = cell.status;
      } else {
        text += cell.ch;
      }
    }

    if (text.length > 0) {
      row.push({ text, status: currentStatus });
    }

    const lineText = row.map((cell) => cell.text).join("");
    if (lineText.trim().length > 0) {
      rows.push(row);
    }
  }

  return rows;
}

type NodeStatus = Extract<MapCellStatus, "closed" | "current" | "future" | "next" | "past">;

function nodeStatus(
  nodeId: string,
  currentNodeId: string,
  nextNodeOrder: Map<string, number>,
  visitedSet: Set<string>,
  reachable: Set<string>,
): NodeStatus {
  if (nodeId === currentNodeId) return "current";
  if (nextNodeOrder.has(nodeId)) return "next";
  if (visitedSet.has(nodeId)) return "past";
  if (reachable.has(nodeId)) return "future";
  return "closed";
}

function getNextNodeIds(map: MapNode[], observation: Observation): string[] {
  if (observation.phase === "combat") {
    return observation.currentNode.nextIds;
  }

  return observation.nextNodes.map((node) => node.id);
}

function computeReachable(map: MapNode[], fromNodeId: string): Set<string> {
  const nodeById = new Map(map.map((node) => [node.id, node]));
  const reachable = new Set<string>();
  const queue = [fromNodeId];
  reachable.add(fromNodeId);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeById.get(nodeId);
    if (!node) continue;

    for (const nextId of node.nextIds) {
      if (reachable.has(nextId)) continue;
      reachable.add(nextId);
      queue.push(nextId);
    }
  }

  return reachable;
}

function computeChoiceOwners(map: MapNode[], nextNodeIds: string[]): Map<string, ChoiceOwners> {
  const nodeById = new Map(map.map((node) => [node.id, node]));
  const owners = new Map<string, ChoiceOwners>();

  nextNodeIds.slice(0, 3).forEach((choiceNodeId, choiceIndex) => {
    const queue = [choiceNodeId];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (seen.has(nodeId)) continue;
      seen.add(nodeId);

      if (!owners.has(nodeId)) {
        owners.set(nodeId, new Set<number>());
      }
      owners.get(nodeId)!.add(choiceIndex + 1);

      const node = nodeById.get(nodeId);
      if (!node) continue;
      queue.push(...node.nextIds);
    }
  });

  return owners;
}

function computeEdgeChoiceOwners(map: MapNode[], currentNodeId: string, nextNodeIds: string[]): Map<string, ChoiceOwners> {
  const nodeById = new Map(map.map((node) => [node.id, node]));
  const owners = new Map<string, ChoiceOwners>();

  nextNodeIds.slice(0, 3).forEach((choiceNodeId, choiceIndex) => {
    const rootEdgeKey = edgeKey(currentNodeId, choiceNodeId);
    if (!owners.has(rootEdgeKey)) {
      owners.set(rootEdgeKey, new Set<number>());
    }
    owners.get(rootEdgeKey)!.add(choiceIndex + 1);

    const queue = [choiceNodeId];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (seen.has(nodeId)) continue;
      seen.add(nodeId);

      const node = nodeById.get(nodeId);
      if (!node) continue;

      for (const nextId of node.nextIds) {
        const key = edgeKey(nodeId, nextId);
        if (!owners.has(key)) {
          owners.set(key, new Set<number>());
        }
        owners.get(key)!.add(choiceIndex + 1);
        queue.push(nextId);
      }
    }
  });

  return owners;
}

function applyChoiceHighlight(status: NodeStatus, owners: ChoiceOwners | undefined): MapCellStatus {
  if (!owners || owners.size !== 1) {
    return status;
  }

  const choice = [...owners][0];
  if (choice < 1 || choice > 3) {
    return status;
  }

  if (status === "next") {
    return `nextChoice${choice}` as MapCellStatus;
  }
  if (status === "future") {
    return `futureChoice${choice}` as MapCellStatus;
  }

  return status;
}

function connectorChoiceStatus(owners: ChoiceOwners | undefined): MapCellStatus {
  if (!owners || owners.size !== 1) {
    return "connector";
  }

  const choice = [...owners][0];
  if (choice === 1) return "connectorChoice1";
  if (choice === 2) return "connectorChoice2";
  if (choice === 3) return "connectorChoice3";
  return "connector";
}

function mergeConnectorStatus(current: MapCellStatus, incoming: MapCellStatus): MapCellStatus {
  if (current === "connector") return incoming;
  if (incoming === "connector") return current;
  if (current === incoming) return current;
  return "connector";
}

function isConnectorStatus(status: MapCellStatus): boolean {
  return status === "connector" || status === "connectorChoice1" || status === "connectorChoice2" || status === "connectorChoice3";
}

function edgeKey(fromId: string, toId: string): string {
  return `${fromId}->${toId}`;
}

function sourcePortX(centerX: number, siblingIndex: number, siblingCount: number, width: number): number {
  if (siblingCount <= 1) return centerX;
  if (siblingCount === 2) {
    return clampGridX(centerX + (siblingIndex === 0 ? -2 : 2), width);
  }
  if (siblingCount === 3) {
    return clampGridX(centerX + (siblingIndex - 1) * 2, width);
  }

  if (siblingIndex < Math.floor(siblingCount / 2)) {
    return clampGridX(centerX - 2, width);
  }
  if (siblingIndex > Math.floor(siblingCount / 2)) {
    return clampGridX(centerX + 2, width);
  }
  return centerX;
}

function clampGridX(x: number, width: number): number {
  return Math.max(0, Math.min(width - 1, x));
}
