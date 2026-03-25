import { sampleContent } from "@towerlab/content";
import type { Observation } from "@towerlab/core";
import { describe, expect, test } from "vitest";

import { createMapFloorRows, deriveVisitedNodeIds, formatMapLines, getEarlierEventsLine, getRecentLogView } from "./view.js";

describe("cli view helpers", () => {
  test("floor map shows each node exactly once with correct statuses at start", () => {
    const observation: Observation = {
      seed: 7,
      phase: "map",
      hp: 80,
      maxHp: 80,
      gold: 0,
      floor: 1,
      currentNode: sampleContent.map[0],
      relics: [],
      log: [],
      nextNodes: [sampleContent.map[1], sampleContent.map[2]],
    };

    const lines = formatMapLines(createMapFloorRows(sampleContent.map, observation, "en", deriveVisitedNodeIds(sampleContent.map, []), 60, "icon"));
    const allText = lines.join("\n");

    // Nodes are rendered as one-character icons only, status via color.
    expect(allText).toContain("S");

    // 7 nodes in the map, each icon appears once in output rows.
    const iconCount = (allText.match(/[SFER$B]/g) ?? []).length;
    expect(iconCount).toBe(7);

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
    const observation: Observation = {
      seed: 7,
      phase: "combat",
      hp: 80,
      maxHp: 80,
      gold: 18,
      floor: 1,
      currentNode: sampleContent.map[1],
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
        deriveVisitedNodeIds(sampleContent.map, [{ type: "choosePath", nodeId: "gate" }]),
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

  test("recent log view truncates older entries and reports hidden count", () => {
    const view = getRecentLogView(["a", "b", "c", "d", "e", "f"], 4);

    expect(view.entries).toEqual(["c", "d", "e", "f"]);
    expect(view.hiddenCount).toBe(2);
    expect(getEarlierEventsLine(view.hiddenCount, "en")).toBe("... 2 earlier events");
  });
});
