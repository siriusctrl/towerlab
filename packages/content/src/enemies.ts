import type { EnemyDefinition } from "@towerlab/core";

export const enemies: Record<string, EnemyDefinition> = {
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
};
