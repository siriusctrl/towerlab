import type { MapNode, Observation } from "@towerlab/core";

import { formatText, localizeNodeKind, localizeNodeName, type Locale } from "./i18n.js";

export const RECENT_LOG_LIMIT = 4;

const MAP_SLOT_SPACING = 4;
const MAP_CELL_WIDTH = 8;

export type MapCellStatus = "closed" | "connector" | "current" | "empty" | "future" | "next" | "past";

export type MapTreeCell = {
  status: MapCellStatus;
  text: string;
};

export type MapTreeRow = MapTreeCell[];

export type RecentLogView = {
  entries: string[];
  hiddenCount: number;
};

type MapNodeView = {
  node: MapNode;
  position: number;
  status: Extract<MapCellStatus, "closed" | "current" | "future" | "next" | "past">;
  nextOrder?: number;
};

export function createMapTreeRows(map: MapNode[], observation: Observation, locale: Locale, visitedNodeIds: string[] = []): MapTreeRow[] {
  const layerViews = buildLayerViews(map, observation, visitedNodeIds);
  const rows: MapTreeRow[] = [];

  for (let layerIndex = 0; layerIndex < layerViews.length; layerIndex += 1) {
    const layer = layerViews[layerIndex];
    rows.push(createNodeRow(layer, locale));

    const nextLayer = layerViews[layerIndex + 1];
    if (nextLayer) {
      rows.push(createConnectorRow(layer, nextLayer));
    }
  }

  return rows;
}

export function formatMapLines(rows: MapTreeRow[]): string[] {
  return rows.map((row) => row.map((cell) => cell.text).join("").replace(/\s+$/u, ""));
}

export function getMapLegendLines(locale: Locale): string[] {
  return [
    formatText(locale, "mapIconLegend", {
      start: "◎",
      battle: "●",
      elite: "◆",
      rest: "⌂",
      shop: "$",
      boss: "★",
    }),
    [
      formatText(locale, "mapLegendPastLine", { marker: "灰" }),
      formatText(locale, "mapLegendCurrentLine", { marker: "绿" }),
      formatText(locale, "mapLegendNextLine", { marker: "黄" }),
      formatText(locale, "mapLegendFutureLine", { marker: "亮" }),
    ].join("  "),
  ];
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

function buildLayerViews(map: MapNode[], observation: Observation, visitedNodeIds: string[]): MapNodeView[][] {
  const layers = buildMapLayers(map);
  const nextNodes = getNextNodes(map, observation);
  const nextNodeOrder = new Map(nextNodes.map((node, index) => [node.id, index]));
  const visitedSet = new Set(visitedNodeIds);
  const futureNodeIds = collectDescendantNodeIds(map, observation.currentNode.id);
  const maxNodes = Math.max(...layers.map((layer) => layer.length), 1);
  const slotCount = getSlotCount(maxNodes);

  return layers.map((nodes) => {
    const positionedNodes = nodes
      .map((node, index) => {
        const nextOrder = nextNodeOrder.get(node.id);
        const status = getNodeStatus(node.id, observation.currentNode.id, nextOrder, observation.phase, visitedSet, futureNodeIds);

        return {
          node,
          position: getLayerPosition(index, nodes.length, slotCount),
          status,
          nextOrder,
        };
      })
      .sort((left, right) => left.position - right.position);

    return positionedNodes;
  });
}

function createNodeRow(layer: MapNodeView[], locale: Locale): MapTreeRow {
  const maxPosition = layer.reduce((value, node) => Math.max(value, node.position), 0);
  const cells = Array.from({ length: maxPosition + 1 }, () => createCell(" ".repeat(MAP_CELL_WIDTH), "empty"));

  for (const node of layer) {
    cells[node.position] = createCell(centerText(getNodeToken(node, locale), MAP_CELL_WIDTH), node.status);
  }

  return cells;
}

function createConnectorRow(layer: MapNodeView[], nextLayer: MapNodeView[]): MapTreeRow {
  const maxPosition = Math.max(
    layer.reduce((value, node) => Math.max(value, node.position), 0),
    nextLayer.reduce((value, node) => Math.max(value, node.position), 0),
  );
  const cells = Array.from({ length: maxPosition + 1 }, () => createCell(" ".repeat(MAP_CELL_WIDTH), "empty"));
  const nextById = new Map(nextLayer.map((node) => [node.node.id, node]));

  for (const node of layer) {
    for (const nextId of node.node.nextIds) {
      const target = nextById.get(nextId);

      if (!target) {
        continue;
      }

      drawConnector(cells, node.position, target.position);
    }
  }

  return cells;
}

function drawConnector(cells: MapTreeRow, from: number, to: number): void {
  if (from === to) {
    mergeConnector(cells, from, "│");
    return;
  }

  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const leftChar = from < to ? "╲" : "╱";
  const rightChar = from < to ? "╱" : "╲";

  if (end - start === 1) {
    mergeConnector(cells, from < to ? end : start, leftChar);
    return;
  }

  mergeConnector(cells, start + 1, leftChar);

  for (let position = start + 2; position < end - 1; position += 1) {
    mergeConnector(cells, position, "─");
  }

  mergeConnector(cells, end - 1, rightChar);
}

function mergeConnector(cells: MapTreeRow, position: number, char: string): void {
  const cell = cells[position];

  if (!cell) {
    return;
  }

  const existing = cell.text.trim();
  const mergedChar = existing.length > 0 && existing !== char ? "┼" : char;
  cells[position] = createCell(centerText(mergedChar, MAP_CELL_WIDTH), "connector");
}

function getNodeToken(node: MapNodeView, locale: Locale): string {
  const icon = getNodeIcon(node.node.kind);
  const label = getMapNodeLabel(node.node, locale);

  if (node.status === "next" && typeof node.nextOrder === "number") {
    return `${Math.min(node.nextOrder + 1, 9)}${icon}${label}`;
  }

  return `${icon}${label}`;
}

function getNodeIcon(kind: MapNode["kind"]): string {
  if (kind === "start") {
    return "◎";
  }

  if (kind === "battle") {
    return "●";
  }

  if (kind === "elite") {
    return "◆";
  }

  if (kind === "rest") {
    return "⌂";
  }

  if (kind === "shop") {
    return "$";
  }

  return "★";
}

function getMapNodeLabel(node: MapNode, locale: Locale): string {
  if (node.kind === "start") {
    return locale === "zh" ? "起点" : "Start";
  }

  const localized = localizeNodeName(node.id, locale);
  return truncateDisplayWidth(localized, 6);
}

function createCell(text: string, status: MapCellStatus): MapTreeCell {
  return { text, status };
}

function centerText(value: string, width: number): string {
  const fitted = truncateDisplayWidth(value, width);
  const fittedWidth = getDisplayWidth(fitted);

  if (fittedWidth >= width) {
    return fitted;
  }

  const totalPadding = width - fittedWidth;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;
  return `${" ".repeat(leftPadding)}${fitted}${" ".repeat(rightPadding)}`;
}

function truncateDisplayWidth(value: string, width: number): string {
  let result = "";
  let currentWidth = 0;

  for (const char of value) {
    const charWidth = getCharacterWidth(char);

    if (currentWidth + charWidth > width) {
      break;
    }

    result += char;
    currentWidth += charWidth;
  }

  return result;
}

function getDisplayWidth(value: string): number {
  let width = 0;

  for (const char of value) {
    width += getCharacterWidth(char);
  }

  return width;
}

function getCharacterWidth(char: string): number {
  const codePoint = char.codePointAt(0);

  if (codePoint === undefined) {
    return 0;
  }

  if (
    codePoint >= 0x1100 && (
      codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
      (codePoint >= 0x1f300 && codePoint <= 0x1f64f) ||
      (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
      (codePoint >= 0x20000 && codePoint <= 0x3fffd)
    )
  ) {
    return 2;
  }

  return 1;
}

function getSlotCount(maxNodes: number): number {
  return maxNodes <= 1 ? 1 : (maxNodes - 1) * MAP_SLOT_SPACING + 1;
}

function getLayerPosition(index: number, nodeCount: number, slotCount: number): number {
  if (nodeCount <= 1) {
    return Math.floor(slotCount / 2);
  }

  return Math.round((index * (slotCount - 1)) / (nodeCount - 1));
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
): Extract<MapCellStatus, "closed" | "current" | "future" | "next" | "past"> {
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

export function getMapStatusSummary(locale: Locale): string {
  return [
    formatText(locale, "mapLegendPastLine", { marker: "gray" }),
    formatText(locale, "mapLegendCurrentLine", { marker: "green" }),
    formatText(locale, "mapLegendNextLine", { marker: "yellow" }),
    formatText(locale, "mapLegendFutureLine", { marker: "bright" }),
  ].join("  ");
}

export function getNodeSummary(node: MapNode, locale: Locale): string {
  return `${getNodeIcon(node.kind)} ${localizeNodeKind(node.kind, locale)}`;
}
