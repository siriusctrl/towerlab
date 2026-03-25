import { Graph, layout } from "@dagrejs/dagre";
import type { MapNode, Observation } from "@towerlab/core";

import { formatNodeLabel, type Locale } from "./i18n.js";
import type { MapCellStatus, MapTreeCell, MapTreeRow } from "./view.js";

// ---------------------------------------------------------------------------
// Node badges — single ASCII characters, 1 column wide in all terminals.
// Status is conveyed through MapCellStatus (rendered as color in TUI).
// ---------------------------------------------------------------------------

const NODE_BADGES: Record<string, string> = {
  start: "S",
  battle: "F",
  elite: "E",
  rest: "R",
  shop: "$",
  boss: "B",
};

export function getNodeBadge(kind: string): string {
  return NODE_BADGES[kind] ?? "?";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type MapRenderMode = "icon" | "label";

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

  // Build labels — icon mode: just the badge letter; label mode: badge + full name
  const labels = new Map<string, string>();
  for (const node of map) {
    const badge = getNodeBadge(node.kind);
    if (mode === "icon") {
      labels.set(node.id, badge);
    } else {
      labels.set(node.id, `${badge} ${formatNodeLabel(node, locale)}`);
    }
  }

  // Dagre layout with ordering constraints
  const g = new Graph({ directed: true });
  g.setGraph({
    rankdir: "TB",
    nodesep: 3,
    ranksep: 1,
    edgesep: 1,
    marginx: 1,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of map) {
    const label = labels.get(node.id) ?? node.id;
    g.setNode(node.id, { label, width: label.length, height: 1 });
  }
  // Insert edges in reverse order — dagre lays out earlier-inserted edges
  // to the right, so reversing produces left-to-right nextIds order.
  for (const node of map) {
    for (let i = node.nextIds.length - 1; i >= 0; i--) {
      g.setEdge(node.id, node.nextIds[i]);
    }
  }

  layout(g);

  // Extract rank and left-to-right order from dagre layout.
  // We ignore dagre's pixel coordinates and use rank/order as grid indices.
  // This guarantees integer positions → no rounding errors.
  const nodeRanks = new Map<string, number>();
  const nodeOrders = new Map<string, number>();
  const rankGroups = new Map<number, string[]>();

  for (const nodeId of g.nodes()) {
    const n = g.node(nodeId);
    if (!n || n.dummy) continue;
    const rank = n.rank ?? 0;
    const x = n.x ?? 0;
    nodeRanks.set(nodeId, rank);
    if (!rankGroups.has(rank)) rankGroups.set(rank, []);
    rankGroups.get(rank)!.push(nodeId);
  }

  // Sort nodes within each rank by dagre's x coordinate to get order
  for (const [rank, ids] of rankGroups) {
    ids.sort((a, b) => (g.node(a)?.x ?? 0) - (g.node(b)?.x ?? 0));
    for (let i = 0; i < ids.length; i++) {
      nodeOrders.set(ids[i], i);
    }
  }

  // Grid dimensions
  const maxOrder = Math.max(...[...nodeOrders.values()], 0);
  const ranks = [...rankGroups.keys()].sort((a, b) => a - b);
  const colSpacing = Math.max(4, Math.min(8, Math.floor((width - 2) / (maxOrder + 1))));
  const gridHeight = ranks.length * 2 - 1;
  const gridWidth = width;

  // Map rank/order → character position
  const rankToRow = new Map<number, number>();
  for (let i = 0; i < ranks.length; i++) {
    rankToRow.set(ranks[i], i * 2);
  }

  const toCharX = (nodeId: string): number => {
    const order = nodeOrders.get(nodeId) ?? 0;
    return 1 + order * colSpacing;
  };
  const toCharY = (nodeId: string): number => {
    const rank = nodeRanks.get(nodeId) ?? 0;
    return rankToRow.get(rank) ?? 0;
  };

  // Edges from the original map definition
  const edgePairs: Array<{ fromId: string; toId: string }> = [];
  for (const node of map) {
    for (const nextId of node.nextIds) {
      edgePairs.push({ fromId: node.id, toId: nextId });
    }
  }

  // Build grid
  const grid = createGrid(gridWidth, gridHeight);

  // Place node labels at exact grid positions (integer, no rounding)
  const nodeCharPos = new Map<string, { cx: number; cy: number }>();
  for (const node of map) {
    if (!nodeRanks.has(node.id)) continue;
    const cx = toCharX(node.id);
    const cy = toCharY(node.id);
    nodeCharPos.set(node.id, { cx, cy });
    const label = labels.get(node.id) ?? node.id;
    const status = nodeStatus(node.id, observation.currentNode.id, nextNodeOrder, visitedSet, reachable);
    placeLabel(grid, cx, cy, label, status);
  }

  // Route edges — diagonal lines on connector rows
  for (const { fromId, toId } of edgePairs) {
    const from = nodeCharPos.get(fromId);
    const to = nodeCharPos.get(toId);
    if (!from || !to) continue;
    routeEdge(grid, from.cx, from.cy, to.cx, to.cy);
  }

  return gridToRows(grid);
}

// ---------------------------------------------------------------------------
// Edge routing — diagonal characters on connector rows
// ---------------------------------------------------------------------------

function routeEdge(grid: CharGrid, x0: number, y0: number, x1: number, y1: number): void {
  if (y0 >= y1) return;

  if (x0 === x1) {
    // Straight down
    for (let y = y0 + 1; y < y1; y++) {
      setConnector(grid, x0, y, "│");
    }
    return;
  }

  // Diagonal: draw `/` or `\` chars across each connector row between parent and child.
  // With multiple connector rows (when floors aren't adjacent), interpolate gradually.
  const dy = y1 - y0;
  for (let row = y0 + 1; row < y1; row++) {
    // Interpolate x position at this row
    const t = (row - y0) / dy;
    const x = Math.round(x0 + (x1 - x0) * t);
    const ch = x1 > x0 ? "\\" : "/";
    setConnector(grid, x, row, ch);
  }
}

function setConnector(grid: CharGrid, x: number, y: number, ch: string): void {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return;
  const cell = grid.cells[y][x];
  if (cell.status !== "connector") return;
  if (cell.ch === " ") {
    cell.ch = ch;
  } else if (cell.ch !== ch) {
    // Merge: crossing diagonals → X, diagonal + vertical → vertical wins
    if ((cell.ch === "/" && ch === "\\") || (cell.ch === "\\" && ch === "/")) {
      cell.ch = "X";
    } else if (cell.ch === "│" || ch === "│") {
      cell.ch = "│";
    }
  }
}

// ---------------------------------------------------------------------------
// Character grid
// ---------------------------------------------------------------------------

type GridCell = { ch: string; status: MapCellStatus };

type CharGrid = {
  width: number;
  height: number;
  cells: GridCell[][];
};

function createGrid(width: number, height: number): CharGrid {
  const cells: GridCell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ ch: " ", status: "connector" });
    }
    cells.push(row);
  }
  return { width, height, cells };
}

function placeLabel(grid: CharGrid, centerX: number, y: number, label: string, status: MapCellStatus): void {
  const labelW = label.length;
  let startX = Math.max(0, centerX - Math.floor(labelW / 2));
  if (startX + labelW > grid.width) {
    startX = Math.max(0, grid.width - labelW);
  }
  if (y < 0 || y >= grid.height) return;

  for (let i = 0; i < label.length && startX + i < grid.width; i++) {
    grid.cells[y][startX + i] = { ch: label[i], status };
  }
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

    const lineText = row.map((c) => c.text).join("");
    if (lineText.trim().length > 0) {
      rows.push(row);
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  return observation.nextNodes.map((n) => n.id);
}

function computeReachable(map: MapNode[], fromNodeId: string): Set<string> {
  const nodeById = new Map(map.map((n) => [n.id, n]));
  const reachable = new Set<string>();
  const queue = [fromNodeId];
  reachable.add(fromNodeId);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeById.get(nodeId);
    if (!node) continue;
    for (const nextId of node.nextIds) {
      if (!reachable.has(nextId)) {
        reachable.add(nextId);
        queue.push(nextId);
      }
    }
  }

  return reachable;
}
