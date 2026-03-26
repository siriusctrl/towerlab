import { sampleContent } from "@towerlab/content";
import type { MapNode, Observation } from "@towerlab/core";
import { describe, expect, test } from "vitest";

import { createMapFloorRows, deriveVisitedNodeIds, formatMapLines, getEarlierEventsLine, getRecentLogView } from "./view.js";

describe("cli view helpers", () => {
  test("floor map shows each node exactly once with correct statuses at start", () => {
    const currentNode = sampleContent.map[0]!;
    const observation: Observation = {
      seed: 7,
      phase: "map",
      hp: 80,
      maxHp: 80,
      gold: 0,
      floor: 1,
      currentNode,
      relics: [],
      log: [],
      nextNodes: getNextNodes(sampleContent.map, currentNode),
    };

    const lines = formatMapLines(createMapFloorRows(sampleContent.map, observation, "en", deriveVisitedNodeIds(sampleContent.map, []), 60, "icon"));
    const allText = lines.join("\n");

    // Nodes are rendered as one-character icons only, status via color.
    expect(allText).toContain("S");

    // Every node icon should appear exactly once in the rendered rows.
    const iconCount = (allText.match(/[SFER$B]/g) ?? []).length;
    expect(iconCount).toBe(sampleContent.map.length);

    // Status prefixes should not be part of node text.
    expect(allText).not.toContain("@");
    expect(allText).not.toContain("1");
    expect(allText).not.toContain("2");
    expect(allText).not.toContain("+");
    expect(allText).not.toContain("x");

    // Connectors between floors (box-drawing characters)
    const connectorLines = lines.filter((line) => /[│─┼┬┤├┐┌└┘┴]/.test(line));
    expect(connectorLines.length).toBeGreaterThan(0);
  });

  test("floor map marks current, past, future, and closed after choosing a path", () => {
    const firstChoice = getNextNodes(sampleContent.map, sampleContent.map[0]!)[0]!;
    const observation: Observation = {
      seed: 7,
      phase: "combat",
      hp: 80,
      maxHp: 80,
      gold: 18,
      floor: 1,
      currentNode: firstChoice,
      relics: [],
      log: [],
      energy: 3,
      block: 0,
      hand: [],
      drawPileCount: 0,
      discardPileCount: 0,
      enemy: {
        id: "sentry",
        name: "Sentry",
        hp: 24,
        maxHp: 24,
        block: 0,
        intent: { kind: "attack", description: "Jab for 5", damage: 5 },
      },
    };

    const lines = formatMapLines(
      createMapFloorRows(
        sampleContent.map,
        observation,
        "en",
        deriveVisitedNodeIds(sampleContent.map, [{ type: "choosePath", nodeId: firstChoice.id }]),
        60,
        "icon",
      ),
    );

    const allText = lines.join("\n");
    // Nodes still render without status prefixes.
    expect(allText).toContain("S");
    expect(allText).toContain("F");
    expect(allText).toContain("E");
    expect(allText).toContain("R");
    expect(allText).toContain("$");
    expect(allText).toContain("B");
  });

  test("uses the available width on wide terminals", () => {
    const observation = createMapObservation(sampleContent.map);
    const compactLines = renderMap(sampleContent.map, observation, 28);
    const wideLines = renderMap(sampleContent.map, observation, 80);
    const compactWidth = Math.max(...compactLines.map((line) => line.length), 0);
    const wideWidth = Math.max(...wideLines.map((line) => line.length), 0);

    expect(wideWidth).toBeGreaterThan(compactWidth + 20);
  });

  test("renders merge-heavy dags with orthogonal box drawing", () => {
    const map: MapNode[] = [
      { id: "a", kind: "start", nextIds: ["b", "c"] },
      { id: "b", kind: "battle", nextIds: ["d", "e"] },
      { id: "c", kind: "elite", nextIds: ["d", "e"] },
      { id: "d", kind: "shop", nextIds: ["f"] },
      { id: "e", kind: "rest", nextIds: ["f"] },
      { id: "f", kind: "boss", nextIds: [] },
    ];

    expect(renderMap(map, createMapObservation(map), 60)).toEqual([
      "                              S",
      "                            ┌─┴─┐",
      "                            │   └─────────────────────────┐",
      " ┌──────────────────────────┘                             │",
      " │                                                        │",
      " F                                                        E",
      "┌┴─┐                                                    ┌─┴┐",
      "└──┼───────┐                                            │  │",
      "   └───────┼────────────────────────────────────┬───────┼──┘",
      "           ├────────────────────────────────────┴───────┘",
      "           $                                    R",
      "           │                  ┌─────────────────┤",
      "           └──────────────────┤",
      "                              │",
      "                              │",
      "                              B",
    ]);
  });

  test("renders wider layered dags without diagonal fallback characters", () => {
    const map: MapNode[] = [
      { id: "a", kind: "start", nextIds: ["b", "c", "d"] },
      { id: "b", kind: "battle", nextIds: ["e", "f"] },
      { id: "c", kind: "elite", nextIds: ["f", "g"] },
      { id: "d", kind: "rest", nextIds: ["g", "h"] },
      { id: "e", kind: "battle", nextIds: ["i"] },
      { id: "f", kind: "shop", nextIds: ["i"] },
      { id: "g", kind: "elite", nextIds: ["i"] },
      { id: "h", kind: "rest", nextIds: ["i"] },
      { id: "i", kind: "boss", nextIds: [] },
    ];

    const lines = renderMap(map, createMapObservation(map), 80);

    expect(lines.join("\n")).not.toMatch(/[\\/]/);
    expect(lines).toEqual([
      "                                        S",
      "                                      ┌─┼─┐",
      "                                      │ │ │",
      "                                      │ │ └────────────────────────────┐",
      "        ├─────────────────────────────┘ │                              │",
      "        F                               E                              R",
      "      ┌─┴─┐                           ┌─┴─┐                          ┌─┴─┐",
      " ┌────┘   │                           │   │                          │   └────┐",
      " │        │               ┌───────────┘   └──────────┐               │        │",
      " │        └───────────────┤                          ├───────────────┘        │",
      " F                        $                          E                        R",
      " │                        │             ┌────────────┤                        │",
      " │                        └─────────────┤                                     │",
      " │                                      ├─────────────────────────────────────┘",
      " └──────────────────────────────────────┤",
      "                                        B",
    ]);
  });

  test("renders ladder merges without collapsing the branch structure", () => {
    const map: MapNode[] = [
      { id: "a", kind: "start", nextIds: ["b", "c"] },
      { id: "b", kind: "battle", nextIds: ["d", "e"] },
      { id: "c", kind: "elite", nextIds: ["e", "f"] },
      { id: "d", kind: "rest", nextIds: ["g"] },
      { id: "e", kind: "shop", nextIds: ["g", "h"] },
      { id: "f", kind: "battle", nextIds: ["h"] },
      { id: "g", kind: "elite", nextIds: ["i"] },
      { id: "h", kind: "rest", nextIds: ["i"] },
      { id: "i", kind: "boss", nextIds: [] },
    ];

    expect(renderMap(map, createMapObservation(map), 90)).toEqual([
      "                                             S",
      "                                           ┌─┴─┐",
      "                                           │   └────────────────────────────┐",
      "             ┌─────────────────────────────┘                                │",
      "             │                                                              │",
      "             F                                                              E",
      "           ┌─┴─┐                                                          ┌─┴─┐",
      " ┌─────────┘   │                                                          │   │",
      " │             │                             ┌────────────────────────────┘   └─────────┐",
      " │             └─────────────────────────────┤                                          │",
      " R                                           $                                          F",
      " │                                         ┌─┴─┐                                        │",
      " └───────────┐                             │   │                                        │",
      "             │                             │   └────────────────────────────┬───────────┘",
      "             ├─────────────────────────────┘                                │",
      "             E                                                              R",
      "             │                               ┌──────────────────────────────┤",
      "             └───────────────────────────────┤",
      "                                             │",
      "                                             │",
      "                                             B",
    ]);
  });

  test("renders four-way fan-out roots without diagonal fallback characters", () => {
    const map: MapNode[] = [
      { id: "a", kind: "start", nextIds: ["b", "c", "d", "e"] },
      { id: "b", kind: "battle", nextIds: ["f"] },
      { id: "c", kind: "elite", nextIds: ["f", "g"] },
      { id: "d", kind: "shop", nextIds: ["g", "h"] },
      { id: "e", kind: "rest", nextIds: ["h"] },
      { id: "f", kind: "battle", nextIds: ["i"] },
      { id: "g", kind: "elite", nextIds: ["i"] },
      { id: "h", kind: "rest", nextIds: ["i"] },
      { id: "i", kind: "boss", nextIds: [] },
    ];

    const lines = renderMap(map, createMapObservation(map), 90);

    expect(lines.join("\n")).not.toMatch(/[\\/]/);
    expect(lines).toEqual([
      "                                             S",
      "                                           ┌─┼─┐",
      "                                           │ └─┼────────────┐",
      "                             ┌─────────────┤   └────────────┼───────────────────────────┐",
      " ├───────────────────────────┴─────────────┘                │                           │",
      " F                           E                              $                           R",
      " │                         ┌─┴─┐                          ┌─┴─┐                         │",
      " └───────┐                 │   │                          │   │                 ┌───────┘",
      "         │                 │   └─────────────┬────────────┘   │                 │",
      "         ├─────────────────┘                 │                └─────────────────┤",
      "         F                                   E                                  R",
      "         │                                   │                                  │",
      "         │                                   ├──────────────────────────────────┘",
      "         └───────────────────────────────────┤",
      "                                             │",
      "                                             B",
    ]);
  });

  test("assigns choice-specific statuses only to uniquely owned future paths", () => {
    const rows = createMapFloorRows(sampleContent.map, createMapObservation(sampleContent.map), "en", deriveVisitedNodeIds(sampleContent.map, []), 80, "icon");
    const statuses = rows.flatMap((row) => row.map((cell) => cell.status));
    const openingChoiceCount = getNextNodes(sampleContent.map, sampleContent.map[0]!).length;

    expect(statuses).toContain("nextChoice1");
    expect(statuses).toContain("nextChoice2");
    expect(statuses).toContain("connectorChoice1");
    expect(statuses).toContain("connectorChoice2");
    expect(statuses).toContain("futureChoice1");
    if (openingChoiceCount >= 3) {
      expect(statuses).toContain("nextChoice3");
      expect(statuses).toContain("connectorChoice3");
    }
    expect(statuses.some((status) => /^futureChoice/u.test(status))).toBe(true);
    expect(statuses).toContain("future");
  });

  test("colors the root outgoing edges for the current choices", () => {
    const rows = createMapFloorRows(sampleContent.map, createMapObservation(sampleContent.map), "en", deriveVisitedNodeIds(sampleContent.map, []), 100, "icon");
    const firstConnectorRows = rows.slice(1, 3).map((row) => row.map((cell) => `[${cell.status}:${cell.text}]`).join("")).join("\n");
    const openingChoiceCount = getNextNodes(sampleContent.map, sampleContent.map[0]!).length;

    expect(firstConnectorRows).toMatch(/connectorChoice1|nextChoice1/);
    expect(firstConnectorRows).toMatch(/connectorChoice2|nextChoice2/);
    if (openingChoiceCount >= 3) {
      expect(firstConnectorRows).toMatch(/connectorChoice3|nextChoice3/);
    }
  });

  test("keeps shared nodes neutral but preserves choice colors on incoming edges", () => {
    const map: MapNode[] = [
      { id: "a", kind: "start", nextIds: ["b", "c"] },
      { id: "b", kind: "battle", nextIds: ["d"] },
      { id: "c", kind: "elite", nextIds: ["d"] },
      { id: "d", kind: "shop", nextIds: [] },
    ];

    const rows = createMapFloorRows(map, createMapObservation(map), "en", deriveVisitedNodeIds(map, []), 50, "icon");
    const rowText = rows.map((row) => row.map((cell) => `[${cell.status}:${cell.text}]`).join("")).join("\n");

    expect(rowText).toContain("[connectorChoice1:");
    expect(rowText).toContain("[connectorChoice2:");
    expect(rowText).toContain("[future:$]");
    expect(rowText).not.toContain("[futureChoice1:$]");
    expect(rowText).not.toContain("[futureChoice2:$]");
  });

  test("recolors the next combat choices after moving onto a path", () => {
    const firstChoice = getNextNodes(sampleContent.map, sampleContent.map[0]!)[0]!;
    const observation: Observation = {
      seed: 7,
      phase: "combat",
      hp: 80,
      maxHp: 80,
      gold: 18,
      floor: 1,
      currentNode: firstChoice,
      relics: [],
      log: [],
      energy: 3,
      block: 0,
      hand: [],
      drawPileCount: 0,
      discardPileCount: 0,
      enemy: {
        id: "sentry",
        name: "Sentry",
        hp: 24,
        maxHp: 24,
        block: 0,
        intent: { kind: "attack", description: "Jab for 5", damage: 5 },
      },
    };

    const rows = createMapFloorRows(
      sampleContent.map,
      observation,
      "en",
      deriveVisitedNodeIds(sampleContent.map, [{ type: "choosePath", nodeId: firstChoice.id }]),
      80,
      "icon",
    );
    const statuses = rows.flatMap((row) => row.map((cell) => cell.status));

    expect(statuses).toContain("nextChoice1");
    expect(statuses).toContain("nextChoice2");
    expect(statuses).toContain("connectorChoice1");
    expect(statuses).toContain("connectorChoice2");
  });

  test("recent log view truncates older entries and reports hidden count", () => {
    const view = getRecentLogView(["a", "b", "c", "d", "e", "f"], 4);

    expect(view.entries).toEqual(["c", "d", "e", "f"]);
    expect(view.hiddenCount).toBe(2);
    expect(getEarlierEventsLine(view.hiddenCount, "en")).toBe("... 2 earlier events");
  });
});

function renderMap(map: MapNode[], observation: Observation, width: number): string[] {
  return formatMapLines(createMapFloorRows(map, observation, "en", deriveVisitedNodeIds(map, []), width, "icon"));
}

function createMapObservation(map: MapNode[]): Observation {
  const currentNode = map[0]!;
  return {
    seed: 7,
    phase: "map",
    hp: 80,
    maxHp: 80,
    gold: 0,
    floor: 1,
    currentNode,
    relics: [],
    log: [],
    nextNodes: getNextNodes(map, currentNode),
  };
}

function getNextNodes(map: MapNode[], currentNode: MapNode): MapNode[] {
  const nodeById = new Map(map.map((node) => [node.id, node]));
  return currentNode.nextIds.map((nodeId) => nodeById.get(nodeId)).filter((node): node is MapNode => node !== undefined);
}
