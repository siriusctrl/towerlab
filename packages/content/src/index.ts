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
    heavyBlow: {
      id: "heavyBlow",
      name: "Heavy Blow",
      cost: 2,
      description: "Deal 11 damage.",
      damage: 11,
    },
  },
  enemies: {
    sentry: {
      id: "sentry",
      name: "Sentry",
      maxHp: 24,
      goldReward: 18,
      intents: [
        {
          kind: "attack",
          description: "Jab for 5",
          damage: 5,
        },
        {
          kind: "block",
          description: "Brace for 6 block",
          block: 6,
        },
        {
          kind: "attack",
          description: "Lunge for 7",
          damage: 7,
        },
      ],
    },
    crusher: {
      id: "crusher",
      name: "Crusher",
      maxHp: 38,
      goldReward: 32,
      intents: [
        {
          kind: "attackBlock",
          description: "Crush for 8 and gain 4 block",
          damage: 8,
          block: 4,
        },
        {
          kind: "heal",
          description: "Patch 6 HP",
          heal: 6,
        },
        {
          kind: "attack",
          description: "Hammer for 12",
          damage: 12,
        },
      ],
    },
    watchCore: {
      id: "watchCore",
      name: "Watch Core",
      maxHp: 55,
      goldReward: 60,
      intents: [
        {
          kind: "block",
          description: "Charge 8 block",
          block: 8,
        },
        {
          kind: "attack",
          description: "Pulse for 11",
          damage: 11,
        },
        {
          kind: "attackBlock",
          description: "Overload for 14 and gain 5 block",
          damage: 14,
          block: 5,
        },
      ],
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
    "surge",
    "surge",
    "heavyBlow",
  ],
  map: [
    { id: "gate", kind: "battle", encounterId: "sentry", nextIds: ["hall", "forge"] },
    { id: "hall", kind: "battle", encounterId: "sentry", nextIds: ["camp"] },
    { id: "forge", kind: "elite", encounterId: "crusher", nextIds: ["camp"] },
    { id: "camp", kind: "rest", nextIds: ["summit"] },
    { id: "summit", kind: "boss", encounterId: "watchCore", nextIds: [] },
  ],
};
