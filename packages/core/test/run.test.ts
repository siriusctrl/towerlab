import { describe, expect, it } from "vitest";

import { createRun } from "../src/index.js";

const content = {
  cards: {
    strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
    defend: { id: "defend", name: "Defend", cost: 1, description: "Gain 5 block.", block: 5 },
  },
  starterDeck: ["strike", "strike", "strike", "defend", "defend", "defend"],
  map: [{ id: "start", kind: "battle", nextIds: [] }],
} as const;

describe("createRun", () => {
  it("produces the same opening hand for the same seed", () => {
    const first = createRun(content, 7);
    const second = createRun(content, 7);

    expect(first.hand).toEqual(second.hand);
    expect(first.drawPile).toEqual(second.drawPile);
  });

  it("produces a different draw order for a different seed", () => {
    const first = createRun(content, 7);
    const second = createRun(content, 8);

    expect(first.hand).not.toEqual(second.hand);
  });
});
