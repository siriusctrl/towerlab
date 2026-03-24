import { sampleContent } from "@towerlab/content";
import type { Observation } from "@towerlab/core";
import { describe, expect, test } from "vitest";

import { formatMapLine, getEarlierEventsLine, getRecentLogView, createMapListEntries } from "./view.js";

describe("cli view helpers", () => {
  test("map view marks current node and reachable next nodes outside map phase", () => {
    const observation: Observation = {
      seed: 7,
      phase: "combat",
      hp: 80,
      maxHp: 80,
      gold: 0,
      floor: 1,
      currentNode: sampleContent.map[0],
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

    const lines = createMapListEntries(sampleContent.map, observation).map((entry) => formatMapLine(entry, "en"));

    expect(lines).toContain("1. ▶ gate (battle)");
    expect(lines).toContain("2. → forge (elite)   → hall (battle)");
  });

  test("map view numbers selectable nodes during map phase", () => {
    const observation: Observation = {
      seed: 7,
      phase: "map",
      hp: 80,
      maxHp: 80,
      gold: 18,
      floor: 1,
      currentNode: sampleContent.map[0],
      relics: [],
      log: [],
      nextNodes: [sampleContent.map[2], sampleContent.map[1]],
    };

    const lines = createMapListEntries(sampleContent.map, observation).map((entry) => formatMapLine(entry, "en"));

    expect(lines).toContain("2. [1] forge (elite)   [2] hall (battle)");
  });

  test("recent log view truncates older entries and reports hidden count", () => {
    const view = getRecentLogView(["a", "b", "c", "d", "e", "f"], 4);

    expect(view.entries).toEqual(["c", "d", "e", "f"]);
    expect(view.hiddenCount).toBe(2);
    expect(getEarlierEventsLine(view.hiddenCount, "en")).toBe("... 2 earlier events");
  });
});
