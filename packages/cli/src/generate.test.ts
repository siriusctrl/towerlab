import { describe, expect, test } from "vitest";

import { getCharacter } from "@towerlab/content";
import { ACT_PATH_CONSTRAINTS } from "../../content/src/map/config.js";
import { generateActs } from "../../content/src/map/generate.js";

describe("map generation constraints", () => {
  test("falls back to the best draft when no act fully satisfies path constraints", () => {
    const character = getCharacter("warrior");
    const originalConstraints = ACT_PATH_CONSTRAINTS[0];
    ACT_PATH_CONSTRAINTS[0] = {
      ...originalConstraints,
      minEliteCount: 99,
      maxEliteCount: 99,
      maxEliteSpread: 0,
      easyEliteCount: 99,
      hardEliteCount: 99,
      maxConsecutiveElite: 0,
    };

    try {
      const acts = generateActs(7, character);
      expect(acts).toHaveLength(3);
      expect(acts[0]?.map.length).toBeGreaterThan(0);
    } finally {
      ACT_PATH_CONSTRAINTS[0] = originalConstraints;
    }
  });

  test("samples richer blessing openings from per-act character pools", () => {
    const character = getCharacter("warrior");
    const first = generateActs(7, character);
    const second = generateActs(8, character);
    const firstActCardBlessings = first[0]!.blessings.filter((blessing) => blessing.kind === "card");
    const secondActCardBlessings = second[0]!.blessings.filter((blessing) => blessing.kind === "card");

    expect(firstActCardBlessings).toHaveLength(2);
    expect(secondActCardBlessings).toHaveLength(2);
    expect(firstActCardBlessings.some((blessing, index) => blessing.cardId !== secondActCardBlessings[index]?.cardId)).toBe(true);
    expect(first[1]!.blessings.some((blessing) => blessing.kind === "card" && blessing.upgraded)).toBe(true);
    expect(first[2]!.blessings.filter((blessing) => blessing.kind === "card").every((blessing) => blessing.upgraded)).toBe(true);
  });

  test("adds a small amount of extra crossover connectivity to each act", () => {
    const acts = generateActs(7, getCharacter("warrior"));

    for (const act of acts) {
      const rows = groupRowSizes(act.map);
      const baselineEdgeCount = rows.slice(0, -1).reduce((total, current, index) => total + Math.max(current, rows[index + 1]!), 0);
      const actualEdgeCount = act.map.reduce((total, node) => total + node.nextIds.length, 0);

      expect(actualEdgeCount).toBeGreaterThan(baselineEdgeCount);
    }
  });
});

function groupRowSizes(map: Array<{ id: string }>): number[] {
  const counts = new Map<number, number>();

  for (const node of map) {
    const match = node.id.match(/-r(\d+)/u);

    if (!match) {
      continue;
    }

    const row = Number(match[1]);
    counts.set(row, (counts.get(row) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => left[0] - right[0])
    .map((entry) => entry[1]);
}
