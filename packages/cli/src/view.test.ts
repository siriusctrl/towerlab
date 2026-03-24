import { sampleContent } from "@towerlab/content";
import type { Observation } from "@towerlab/core";
import { describe, expect, test } from "vitest";

import { createMapTreeRows, deriveVisitedNodeIds, formatMapLines, getEarlierEventsLine, getRecentLogView } from "./view.js";

describe("cli view helpers", () => {
  test("map view shows a branching start node with numbered opening choices", () => {
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

    const tree = formatMapLines(createMapTreeRows(sampleContent.map, observation, deriveVisitedNodeIds(sampleContent.map, []))).join("\n");

    expect(tree).toContain("◎");
    expect(tree).toContain("1●");
    expect(tree).toContain("2◆");
    expect(tree).toContain("⌂");
    expect(tree).toContain("$");
    expect(tree).toContain("★");
  });

  test("map view marks current, future, and closed branches after choosing a path", () => {
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

    const tree = formatMapLines(
      createMapTreeRows(
        sampleContent.map,
        observation,
        deriveVisitedNodeIds(sampleContent.map, [{ type: "choosePath", nodeId: "gate" }]),
      ),
    ).join("\n");

    expect(tree).toContain("◎");
    expect(tree).toContain("●");
    expect(tree).toContain("⌂");
    expect(tree).toContain("$");
    expect(tree).toContain("★");
  });

  test("recent log view truncates older entries and reports hidden count", () => {
    const view = getRecentLogView(["a", "b", "c", "d", "e", "f"], 4);

    expect(view.entries).toEqual(["c", "d", "e", "f"]);
    expect(view.hiddenCount).toBe(2);
    expect(getEarlierEventsLine(view.hiddenCount, "en")).toBe("... 2 earlier events");
  });
});
