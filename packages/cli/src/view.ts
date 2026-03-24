import type { MapNode, Observation } from "@towerlab/core";

import { localizeNodeKindBadge, localizeNodeName, formatText, type Locale } from "./i18n.js";

export const RECENT_LOG_LIMIT = 4;

export type MapCellStatus = "closed" | "current" | "future" | "next" | "past";

export type MapListEntry = {
  depth: number;
  cells: Array<{
    marker: string;
    node: MapNode;
    order: number;
    status: MapCellStatus;
  }>;
};

export type RecentLogView = {
  entries: string[];
  hiddenCount: number;
};

export function createMapListEntries(map: MapNode[], observation: Observation, visitedNodeIds: string[] = []): MapListEntry[] {
  const layers = buildMapLayers(map);
  const nextNodes = getNextNodes(map, observation);
  const nextNodeOrder = new Map(nextNodes.map((node, index) => [node.id, index]));
  const visitedSet = new Set(visitedNodeIds);
  const futureNodeIds = collectDescendantNodeIds(map, observation.currentNode.id);

  return layers.map((nodes, depth) => ({
    depth,
    cells: nodes
      .map((node, index) => {
        const nextOrder = nextNodeOrder.get(node.id);
        const status = getNodeStatus(node.id, observation.currentNode.id, nextOrder, observation.phase, visitedSet, futureNodeIds);

        return {
          marker: getNodeMarker(status, nextOrder, observation.phase),
          node,
          order: nextOrder ?? nextNodes.length + index,
          status,
        };
      })
      .sort((left, right) => left.order - right.order),
  }));
}

export function formatMapLines(entries: MapListEntry[], locale: Locale): string[] {
  const lines: string[] = [];

  for (const entry of entries) {
    const prefix = `${entry.depth + 1}. `;
    const indent = " ".repeat(prefix.length);

    entry.cells.forEach((cell, index) => {
      const linePrefix = index === 0 ? prefix : indent;
      lines.push(`${linePrefix}${formatMapCell(cell, locale)}`);
    });
  }

  return lines;
}

export function getMapLegendLines(locale: Locale): string[] {
  const parts = [
    formatText(locale, "mapLegendPastLine", { marker: "✓" }),
    formatText(locale, "mapLegendCurrentLine", { marker: "▶" }),
    formatText(locale, "mapLegendNextLine", { marker: "[n] / →" }),
    formatText(locale, "mapLegendFutureLine", { marker: "·" }),
    formatText(locale, "mapLegendClosedLine", { marker: "×" }),
  ];

  return [parts.slice(0, 3).join("  "), parts.slice(3).join("  ")];
}

export function getRecentLogView(log: string[], limit = RECENT_LOG_LIMIT): RecentLogView {
  const hiddenCount = Math.max(0, log.length - limit);

  return {
    entries: hiddenCount > 0 ? log.slice(-limit) : log,
    hiddenCount,
  };
}

export function getEarlierEventsLine(hiddenCount: number, locale: Locale): string | null {
  if (hiddenCount <= 0) {
    return null;
  }

  return formatText(locale, "earlierEvents", { count: hiddenCount });
}

export function deriveVisitedNodeIds(map: MapNode[], actions: Array<{ type: string; nodeId?: string }>): string[] {
  const firstNode = map[0];

  if (!firstNode) {
    return [];
  }

  const visitedNodeIds = [firstNode.id];

  for (const action of actions) {
    if (action.type !== "choosePath" || typeof action.nodeId !== "string") {
      continue;
    }

    visitedNodeIds.push(action.nodeId);
  }

  return visitedNodeIds;
}

function buildMapLayers(map: MapNode[]): MapNode[][] {
  const nodeById = new Map(map.map((node) => [node.id, node]));
  const depthById = new Map<string, number>();
  const queue = [...findRootNodeIds(map)];

  for (const rootId of queue) {
    depthById.set(rootId, 0);
  }

  while (queue.length > 0) {
    const nodeId = queue.shift();

    if (!nodeId) {
      continue;
    }

    const node = nodeById.get(nodeId);
    const depth = depthById.get(nodeId) ?? 0;

    if (!node) {
      continue;
    }

    for (const nextId of node.nextIds) {
      const nextDepth = depth + 1;
      const previousDepth = depthById.get(nextId);

      if (previousDepth === undefined || nextDepth > previousDepth) {
        depthById.set(nextId, nextDepth);
        queue.push(nextId);
      }
    }
  }

  const layers: MapNode[][] = [];

  for (const node of map) {
    const depth = depthById.get(node.id) ?? 0;

    if (!layers[depth]) {
      layers[depth] = [];
    }

    layers[depth].push(node);
  }

  return layers;
}

function findRootNodeIds(map: MapNode[]): string[] {
  const incoming = new Set<string>();

  for (const node of map) {
    for (const nextId of node.nextIds) {
      incoming.add(nextId);
    }
  }

  const roots = map.filter((node) => !incoming.has(node.id)).map((node) => node.id);
  return roots.length > 0 ? roots : map.slice(0, 1).map((node) => node.id);
}

function getNextNodes(map: MapNode[], observation: Observation): MapNode[] {
  if (observation.phase !== "combat") {
    return observation.nextNodes;
  }

  const nodeById = new Map(map.map((node) => [node.id, node]));
  return observation.currentNode.nextIds.map((nodeId) => nodeById.get(nodeId)).filter((node): node is MapNode => node !== undefined);
}

function formatMapCell(cell: MapListEntry["cells"][number], locale: Locale): string {
  return `${cell.marker} ${localizeNodeKindBadge(cell.node.kind, locale)} ${localizeNodeName(cell.node.id, locale)}`;
}

function collectDescendantNodeIds(map: MapNode[], currentNodeId: string): Set<string> {
  const nodeById = new Map(map.map((node) => [node.id, node]));
  const descendants = new Set<string>();
  const queue = [...(nodeById.get(currentNodeId)?.nextIds ?? [])];

  while (queue.length > 0) {
    const nodeId = queue.shift();

    if (!nodeId || descendants.has(nodeId)) {
      continue;
    }

    descendants.add(nodeId);

    for (const nextId of nodeById.get(nodeId)?.nextIds ?? []) {
      queue.push(nextId);
    }
  }

  return descendants;
}

function getNodeStatus(
  nodeId: string,
  currentNodeId: string,
  nextOrder: number | undefined,
  phase: Observation["phase"],
  visitedSet: Set<string>,
  futureNodeIds: Set<string>,
): MapCellStatus {
  if (nodeId === currentNodeId) {
    return "current";
  }

  if (nextOrder !== undefined) {
    return "next";
  }

  if (visitedSet.has(nodeId)) {
    return "past";
  }

  if (futureNodeIds.has(nodeId)) {
    return "future";
  }

  return visitedSet.size > 0 || phase !== "combat" ? "closed" : "future";
}

function getNodeMarker(status: MapCellStatus, nextOrder: number | undefined, phase: Observation["phase"]): string {
  if (status === "current") {
    return "▶";
  }

  if (status === "next") {
    return phase === "map" && nextOrder !== undefined ? `[${nextOrder + 1}]` : "→";
  }

  if (status === "past") {
    return "✓";
  }

  if (status === "closed") {
    return "×";
  }

  return "·";
}
