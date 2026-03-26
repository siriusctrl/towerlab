import type { MapNode, Observation } from "@towerlab/core";

import { formatNodeLabel, type Locale } from "../i18n.js";
import type { MapCellStatus, MapTreeRow } from "../view.js";
import { addPath, createGrid, gridToRows, placeLabel, type CharGrid, type Point } from "./grid.js";
import { computeNodeLayout, type MapRenderMode, type PositionedNode } from "./layout.js";

const NODE_BADGES: Record<string, string> = {
  start: "S",
  battle: "F",
  elite: "E",
  rest: "R",
  shop: "$",
  boss: "B",
};

const CHOICE_HIGHLIGHT_DEPTH = 2;

type ChoiceOwners = Set<number>;

type EdgeDescriptor = {
  from: PositionedNode;
  fromId: string;
  to: PositionedNode;
  toId: string;
};

type NodeStatus = Extract<MapCellStatus, "closed" | "current" | "future" | "next" | "past">;

export function getNodeBadge(kind: string): string {
  return NODE_BADGES[kind] ?? "?";
}

export type { MapRenderMode } from "./layout.js";

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
  const nextNodeOrder = new Map(nextNodes.map((id, index) => [id, index]));
  const visitedSet = new Set(visitedNodeIds);
  const reachable = computeReachable(map, observation.currentNode.id);
  const choiceOwners = computeChoiceOwners(map, nextNodes);
  const edgeChoiceOwners = computeEdgeChoiceOwners(map, observation.currentNode.id, nextNodes);
  const labels = createLabels(map, locale, mode);
  const positionedNodes = computeNodeLayout(map, labels, width);

  const maxRow = Math.max(...[...positionedNodes.values()].map((node) => node.row), 0);
  const grid = createGrid(width, maxRow + 1);

  routeEdges(grid, map, positionedNodes, edgeChoiceOwners);

  for (const node of map) {
    const positioned = positionedNodes.get(node.id);
    if (!positioned) continue;
    const status = applyChoiceHighlight(
      nodeStatus(node.id, observation.currentNode.id, nextNodeOrder, visitedSet, reachable),
      choiceOwners.get(node.id),
    );
    placeLabel(grid, positioned.centerX, positioned.row, positioned.label, status);
  }

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

function routeEdges(
  grid: CharGrid,
  map: MapNode[],
  positionedNodes: Map<string, PositionedNode>,
  edgeChoiceOwners: Map<string, ChoiceOwners>,
): void {
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

    const laneRows = createLaneRows(group[0]!.from.row + 1, group[0]!.to.row - 1, group.length);

    group.forEach((edge, edgeIndex) => {
      const siblings = sourceSiblings.get(edge.fromId) ?? [edge];
      const siblingIndex = siblings.findIndex((candidate) => candidate.toId === edge.toId);
      const path = buildEdgePath(
        edge.from.centerX,
        edge.from.row,
        sourcePortX(edge.from.centerX, siblingIndex, siblings.length, grid.width),
        edge.to.centerX,
        edge.to.row,
        laneRows[edgeIndex] ?? laneRows.at(-1) ?? edge.from.row + 1,
        siblings.length > 1,
      );
      addPath(grid, path, connectorChoiceStatus(edgeChoiceOwners.get(edgeKey(edge.fromId, edge.toId))));
    });
  }
}

function buildEdgePath(
  sourceX: number,
  sourceY: number,
  portX: number,
  targetX: number,
  targetY: number,
  laneRow: number,
  hasFanout: boolean,
): Point[] {
  if (sourceY >= targetY) return [];

  const connectorTop = sourceY + 1;
  const connectorBottom = targetY - 1;
  const points: Point[] = [{ x: sourceX, y: sourceY }, { x: sourceX, y: connectorTop }];

  if (hasFanout && portX !== sourceX) {
    points.push({ x: portX, y: connectorTop });
  }

  const stemX = hasFanout ? portX : sourceX;
  const horizontalRow = clamp(laneRow, connectorTop, Math.max(connectorTop, connectorBottom));

  if (horizontalRow > connectorTop) {
    points.push({ x: stemX, y: horizontalRow });
  }

  if (targetX !== stemX) {
    points.push({ x: targetX, y: horizontalRow });
  }

  if (connectorBottom > horizontalRow) {
    points.push({ x: targetX, y: connectorBottom });
  }

  points.push({ x: targetX, y: targetY });

  return points;
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

  return Array.from({ length: count }, (_, index) => startRow + Math.round((index * (available - 1)) / (count - 1)));
}

function sourcePortX(centerX: number, siblingIndex: number, siblingCount: number, width: number): number {
  if (siblingCount <= 1) return centerX;

  const offset = siblingIndex * 2 - (siblingCount - 1);
  return clamp(centerX + offset, 0, width - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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
    const queue = [{ nodeId: choiceNodeId, depth: 1 }];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      if (seen.has(nodeId)) continue;
      seen.add(nodeId);

      if (depth > CHOICE_HIGHLIGHT_DEPTH) {
        continue;
      }

      if (!owners.has(nodeId)) {
        owners.set(nodeId, new Set<number>());
      }
      owners.get(nodeId)!.add(choiceIndex + 1);

      const node = nodeById.get(nodeId);
      if (!node) continue;
      for (const nextId of node.nextIds) {
        queue.push({ nodeId: nextId, depth: depth + 1 });
      }
    }
  });

  return owners;
}

function computeEdgeChoiceOwners(map: MapNode[], currentNodeId: string, nextNodeIds: string[]): Map<string, ChoiceOwners> {
  const nodeById = new Map(map.map((node) => [node.id, node]));
  const owners = new Map<string, ChoiceOwners>();

  nextNodeIds.slice(0, 3).forEach((choiceNodeId, choiceIndex) => {
    const choiceNumber = choiceIndex + 1;
    addOwner(owners, edgeKey(currentNodeId, choiceNodeId), choiceNumber);

    const queue = [{ nodeId: choiceNodeId, depth: 1 }];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      if (seen.has(nodeId)) continue;
      seen.add(nodeId);

      const node = nodeById.get(nodeId);
      if (!node) continue;
      if (depth >= CHOICE_HIGHLIGHT_DEPTH) continue;

      for (const nextId of node.nextIds) {
        addOwner(owners, edgeKey(nodeId, nextId), choiceNumber);
        queue.push({ nodeId: nextId, depth: depth + 1 });
      }
    }
  });

  return owners;
}

function addOwner(owners: Map<string, ChoiceOwners>, key: string, choice: number): void {
  if (!owners.has(key)) {
    owners.set(key, new Set<number>());
  }
  owners.get(key)!.add(choice);
}

function applyChoiceHighlight(status: NodeStatus, owners: ChoiceOwners | undefined): MapCellStatus {
  if (!owners || owners.size !== 1) {
    return status;
  }

  const choice = [...owners][0];
  if (choice < 1 || choice > 3) {
    return status;
  }

  if (status === "next") return `nextChoice${choice}` as MapCellStatus;
  if (status === "future") return `futureChoice${choice}` as MapCellStatus;
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

function edgeKey(fromId: string, toId: string): string {
  return `${fromId}->${toId}`;
}
