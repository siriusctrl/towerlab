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
});
