import type { MapNode, Observation } from "@towerlab/core";

import { formatText, type Locale } from "./i18n.js";
import { renderDagreMap, type MapRenderMode } from "./map-renderer.js";

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

export type MapCellStatus =
  | "closed"
  | "connector"
  | "connectorChoice1"
  | "connectorChoice2"
  | "connectorChoice3"
  | "current"
  | "future"
  | "futureChoice1"
  | "futureChoice2"
  | "futureChoice3"
  | "next"
  | "nextChoice1"
  | "nextChoice2"
  | "nextChoice3"
  | "past";

export type MapTreeCell = {
  status: MapCellStatus;
  text: string;
};

export type MapTreeRow = MapTreeCell[];

export type RecentLogView = {
  entries: string[];
  hiddenCount: number;
};

// ---------------------------------------------------------------------------
// Map rendering (delegates to dagre-based renderer)
// ---------------------------------------------------------------------------

export function createMapFloorRows(
  map: MapNode[],
  observation: Observation,
  locale: Locale,
  visitedNodeIds: string[],
  width: number,
  mode: MapRenderMode = "icon",
): MapTreeRow[] {
  return renderDagreMap(map, observation, locale, visitedNodeIds, width, mode);
}

export function formatMapLines(rows: MapTreeRow[]): string[] {
  return rows.map((row) => row.map((cell) => cell.text).join("").replace(/\s+$/u, ""));
}

// ---------------------------------------------------------------------------
// Legend and log helpers
// ---------------------------------------------------------------------------

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
  ];
}

export function getMapCompactLegendLine(locale: Locale): string {
  return formatText(locale, "mapIconLegend", {
    start: "S",
    battle: "F",
    elite: "E",
    rest: "R",
    shop: "$",
    boss: "B",
  });
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
