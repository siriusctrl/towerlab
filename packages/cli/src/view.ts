import type { MapNode, Observation } from "@towerlab/core";

import { formatNodeLabel, formatText, type Locale } from "./i18n.js";

export const RECENT_LOG_LIMIT = 4;

export type MapListEntry = {
  depth: number;
  cells: Array<{
    marker: string;
    node: MapNode;
    order: number;
  }>;
};

export type RecentLogView = {
  entries: string[];
  hiddenCount: number;
};

export function createMapListEntries(map: MapNode[], observation: Observation): MapListEntry[] {
  const layers = buildMapLayers(map);
  const nextNodes = getNextNodes(map, observation);
  const nextNodeOrder = new Map(nextNodes.map((node, index) => [node.id, index]));

  return layers.map((nodes, depth) => ({
    depth,
    cells: nodes
      .map((node, index) => {
        const nextOrder = nextNodeOrder.get(node.id);

        return {
          marker: getNodeMarker(node.id, observation.currentNode.id, nextOrder, observation.phase),
          node,
          order: nextOrder ?? nextNodes.length + index,
        };
      })
      .sort((left, right) => left.order - right.order),
  }));
}

export function formatMapLine(entry: MapListEntry, locale: Locale): string {
  const cells = entry.cells.map((cell) => `${cell.marker} ${formatNodeLabel(cell.node, locale)}`).join("   ");
  return `${entry.depth + 1}. ${cells}`;
}

export function getMapLegend(locale: Locale): string {
  return `${formatText(locale, "mapLegendCurrentLine", { marker: "▶" })}  ${formatText(locale, "mapLegendNextLine", { marker: "→ / [n]" })}`;
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

function getNodeMarker(nodeId: string, currentNodeId: string, nextOrder: number | undefined, phase: Observation["phase"]): string {
  if (nodeId === currentNodeId) {
    return "▶";
  }

  if (nextOrder !== undefined) {
    return phase === "map" ? `[${nextOrder + 1}]` : "→";
  }

  return "·";
}
