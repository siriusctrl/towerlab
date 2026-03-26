import type { RunContent } from "@towerlab/core";

import { generateMap } from "./map.js";

const baseContent: Omit<RunContent, "map"> = {
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
    quickGuard: {
      id: "quickGuard",
      name: "Quick Guard",
      cost: 1,
      description: "Gain 7 block.",
      block: 7,
    },
    punishingHit: {
      id: "punishingHit",
      name: "Punishing Hit",
      cost: 2,
      description: "Deal 9 damage.",
      damage: 9,
    },
    heavyBlow: {
      id: "heavyBlow",
      name: "Heavy Blow",
      cost: 2,
      description: "Deal 11 damage.",
      damage: 11,
    },
    precision: {
      id: "precision",
      name: "Precision",
      cost: 2,
      description: "Deal 6 damage. Gain 2 block.",
      damage: 6,
      block: 2,
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
    forgeKeeper: {
      id: "forgeKeeper",
      name: "Forge Keeper",
      maxHp: 52,
      goldReward: 75,
      intents: [
        {
          kind: "attackBlock",
          description: "Smash for 10 and gain 4 block",
          damage: 10,
          block: 4,
        },
        {
          kind: "heal",
          description: "Stabilize 8 HP",
          heal: 8,
        },
        {
          kind: "attack",
          description: "Crush for 14",
          damage: 14,
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
  relics: {
    combatFocus: {
      id: "combatFocus",
      name: "Combat Focus",
      description: "Gain 1 extra energy at the start of each combat.",
      kind: "combatEnergy",
      value: 1,
    },
    bucklerFrame: {
      id: "bucklerFrame",
      name: "Buckler Frame",
      description: "Start each combat with +2 block.",
      kind: "combatStartBlock",
      value: 2,
    },
    reinforcedFrame: {
      id: "reinforcedFrame",
      name: "Reinforced Frame",
      description: "Gain 12 max HP.",
      kind: "maxHp",
      value: 12,
    },
    medicinePack: {
      id: "medicinePack",
      name: "Medicine Pack",
      description: "Recover +3 HP from campfire recovery.",
      kind: "restHealBonus",
      value: 3,
    },
    merchantTag: {
      id: "merchantTag",
      name: "Merchant Tag",
      description: "Shop cards cost 1 less.",
      kind: "shopDiscount",
      value: 1,
    },
  },
  rewardCardPool: ["strike", "defend", "surge", "quickGuard", "punishingHit", "precision", "heavyBlow"],
  shopCardPool: ["quickGuard", "punishingHit", "precision", "heavyBlow"],
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
};

export function createSeededContent(seed: number): RunContent {
  return {
    ...baseContent,
    map: generateMap(seed),
  };
}

export const sampleContent: RunContent = createSeededContent(7);
