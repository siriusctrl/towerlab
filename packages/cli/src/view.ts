import type { MapNode, Observation } from "@towerlab/core";

import { formatNodeLabel, formatText, localizeNodeKind, type Locale } from "./i18n.js";

export const RECENT_LOG_LIMIT = 4;

export function renderHpBar(current: number, max: number, width: number): string {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}

export function getHpColor(current: number, max: number): string {
  const ratio = max > 0 ? current / max : 0;
  if (ratio > 0.5) return "green";
  if (ratio > 0.25) return "yellow";
  return "red";
}

export type MapCellStatus = "closed" | "connector" | "current" | "future" | "next" | "past";

export type MapTreeCell = {
  status: MapCellStatus;
  text: string;
};

export type MapTreeRow = MapTreeCell[];

export type RecentLogView = {
  entries: string[];
  hiddenCount: number;
};

type MapNodeStatus = Extract<MapCellStatus, "closed" | "current" | "future" | "next" | "past">;

type MapTreeNode = {
  node: MapNode;
  path: string[];
  children: MapTreeNode[];
};

export function createMapTreeRows(map: MapNode[], observation: Observation, locale: Locale, visitedNodeIds: string[] = []): MapTreeRow[] {
  const roots = buildMapTree(map);
  const activePath = buildActivePath(map, observation.currentNode.id, visitedNodeIds);
  const nextNodeOrder = new Map(getNextNodes(map, observation).map((node, index) => [node.id, index]));
  const rows: MapTreeRow[] = [];

  roots.forEach((root, index) => {
    appendTreeRows(rows, root, locale, activePath, nextNodeOrder, [], index < roots.length - 1);
  });

  return rows;
}

export function formatMapLines(rows: MapTreeRow[]): string[] {
  return rows.map((row) => row.map((cell) => cell.text).join("").replace(/\s+$/u, ""));
}

export function getMapLegendLines(locale: Locale): string[] {
  return [
    formatText(locale, "mapIconLegend", {
      start: "S",
      battle: "F",
      elite: "E",
      rest: "R",
      shop: "$",
      boss: "B",
    }),
    [
      formatText(locale, "mapLegendCurrentLine", { marker: "@" }),
      formatText(locale, "mapLegendNextLine", { marker: "1" }),
      formatText(locale, "mapLegendPastLine", { marker: "+" }),
      formatText(locale, "mapLegendFutureLine", { marker: "." }),
      formatText(locale, "mapLegendClosedLine", { marker: "x" }),
    ].join("  "),
  ];
}

export function getMapCompactLegendLine(locale: Locale): string {
  return [
    formatText(locale, "mapLegendCurrentLine", { marker: "@" }),
    formatText(locale, "mapLegendNextLine", { marker: "1" }),
    formatText(locale, "mapLegendPastLine", { marker: "+" }),
    formatText(locale, "mapLegendFutureLine", { marker: "." }),
    formatText(locale, "mapLegendClosedLine", { marker: "x" }),
  ].join("  ");
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

function buildMapTree(map: MapNode[]): MapTreeNode[] {
  const nodeById = new Map(map.map((node) => [node.id, node]));

  const expandNode = (nodeId: string, path: string[]): MapTreeNode => {
    const node = nodeById.get(nodeId);

    if (!node) {
      throw new Error(`map references unknown node ${nodeId}`);
    }

    const nextPath = [...path, node.id];
    return {
      node,
      path: nextPath,
      children: node.nextIds.map((nextId) => expandNode(nextId, nextPath)),
    };
  };

  return findRootNodeIds(map).map((nodeId) => expandNode(nodeId, []));
}

function buildActivePath(map: MapNode[], currentNodeId: string, visitedNodeIds: string[]): string[] {
  const firstNode = map[0];

  if (!firstNode) {
    return currentNodeId ? [currentNodeId] : [];
  }

  const activePath = visitedNodeIds.length > 0 ? [...visitedNodeIds] : [firstNode.id];

  if (activePath[0] !== firstNode.id) {
    activePath.unshift(firstNode.id);
  }

  if (activePath.at(-1) !== currentNodeId) {
    activePath.push(currentNodeId);
  }

  return activePath;
}

function appendTreeRows(
  rows: MapTreeRow[],
  treeNode: MapTreeNode,
  locale: Locale,
  activePath: string[],
  nextNodeOrder: Map<string, number>,
  ancestorHasMoreSiblings: boolean[],
  hasMoreSiblings: boolean,
): void {
  const prefix = treeNode.path.length === 1 ? "" : createTreePrefix(ancestorHasMoreSiblings, hasMoreSiblings);
  const status = getNodeStatus(treeNode.path, activePath, nextNodeOrder);
  const nodeLabel = `${getNodeStatusPrefix(status, nextNodeOrder.get(treeNode.node.id))}${getNodeIcon(treeNode.node.kind)} ${formatNodeLabel(treeNode.node, locale)}`;
  const row: MapTreeRow = [];

  if (prefix.length > 0) {
    row.push(createCell(prefix, "connector"));
  }

  row.push(createCell(nodeLabel, status));
  rows.push(row);

  treeNode.children.forEach((child, index) => {
    appendTreeRows(
      rows,
      child,
      locale,
      activePath,
      nextNodeOrder,
      prefix.length > 0 ? [...ancestorHasMoreSiblings, hasMoreSiblings] : [],
      index < treeNode.children.length - 1,
    );
  });
}

function createTreePrefix(ancestorHasMoreSiblings: boolean[], hasMoreSiblings: boolean): string {
  return ancestorHasMoreSiblings
    .map((value) => (value ? "│   " : "    "))
    .join("") + (hasMoreSiblings ? "├── " : "└── ");
}

function getNodeIcon(kind: MapNode["kind"]): string {
  if (kind === "start") {
    return "S";
  }

  if (kind === "battle") {
    return "F";
  }

  if (kind === "elite") {
    return "E";
  }

  if (kind === "rest") {
    return "R";
  }

  if (kind === "shop") {
    return "$";
  }

  return "B";
}

function createCell(text: string, status: MapCellStatus): MapTreeCell {
  return { text, status };
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

function getNodeStatus(
  path: string[],
  activePath: string[],
  nextNodeOrder: Map<string, number>,
): MapNodeStatus {
  if (!isCompatiblePath(path, activePath)) {
    return "closed";
  }

  if (arePathsEqual(path, activePath)) {
    return "current";
  }

  if (path.length === activePath.length + 1 && isPathPrefix(activePath, path) && nextNodeOrder.has(path.at(-1) ?? "")) {
    return "next";
  }

  if (path.length < activePath.length && isPathPrefix(path, activePath)) {
    return "past";
  }

  if (path.length > activePath.length && isPathPrefix(activePath, path)) {
    return "future";
  }

  return "future";
}

function isCompatiblePath(path: string[], activePath: string[]): boolean {
  const limit = Math.min(path.length, activePath.length);

  for (let index = 0; index < limit; index += 1) {
    if (path[index] !== activePath[index]) {
      return false;
    }
  }

  return true;
}

function isPathPrefix(prefix: string[], path: string[]): boolean {
  if (prefix.length > path.length) {
    return false;
  }

  for (let index = 0; index < prefix.length; index += 1) {
    if (prefix[index] !== path[index]) {
      return false;
    }
  }

  return true;
}

function arePathsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return isPathPrefix(left, right);
}

export function getMapStatusSummary(locale: Locale): string {
  return [
    formatText(locale, "mapLegendCurrentLine", { marker: "@" }),
    formatText(locale, "mapLegendNextLine", { marker: "1" }),
    formatText(locale, "mapLegendPastLine", { marker: "+" }),
    formatText(locale, "mapLegendFutureLine", { marker: "." }),
    formatText(locale, "mapLegendClosedLine", { marker: "x" }),
  ].join("  ");
}

export function getNodeSummary(node: MapNode, locale: Locale): string {
  return `${getNodeIcon(node.kind)} ${localizeNodeKind(node.kind, locale)}`;
}

function getNodeStatusPrefix(status: MapNodeStatus, nextOrder?: number): string {
  if (status === "current") {
    return "@";
  }

  if (status === "next") {
    return String(Math.min((nextOrder ?? 0) + 1, 9));
  }

  if (status === "past") {
    return "+";
  }

  if (status === "future") {
    return ".";
  }

  return "x";
}
