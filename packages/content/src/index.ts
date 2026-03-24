import type { RunContent } from "@towerlab/core";

export const sampleContent: RunContent = {
  cards: {
    strike: {
      id: "strike",
      name: "Strike",
      cost: 1,
      description: "Deal 6 damage.",
      damage: 6,
    },
    defend: {
      id: "defend",
      name: "Defend",
      cost: 1,
      description: "Gain 5 block.",
      block: 5,
    },
    surge: {
      id: "surge",
      name: "Surge",
      cost: 1,
      description: "Deal 4 damage. Gain 4 block.",
      damage: 4,
      block: 4,
    },
  },
  starterDeck: [
    "strike",
    "strike",
    "strike",
    "strike",
    "defend",
    "defend",
    "defend",
    "defend",
    "surge",
    "surge",
  ],
  map: [
    { id: "start", kind: "battle", nextIds: ["left", "right"] },
    { id: "left", kind: "battle", nextIds: ["camp"] },
    { id: "right", kind: "elite", nextIds: ["camp"] },
    { id: "camp", kind: "rest", nextIds: ["boss"] },
    { id: "boss", kind: "boss", nextIds: [] },
  ],
};
