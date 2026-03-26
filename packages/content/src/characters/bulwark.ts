import type { CharacterDefinition } from "@towerlab/core";

export const bulwark: CharacterDefinition = {
  id: "bulwark",
  name: "Bulwark",
  summary: "Heavy defense with blunt counterattacks.",
  maxHp: 86,
  startGold: 6,
  starterDeck: [
    "shieldJab",
    "shieldJab",
    "shieldJab",
    "shieldJab",
    "brace",
    "brace",
    "brace",
    "brace",
    "safeguard",
    "riposte",
  ],
  startingRelicId: "guardTraining",
  rewardCardPools: {
    common: ["brace", "shieldJab", "safeguard", "riposte"],
    uncommon: ["towerSlam", "holdFast", "citadel", "lastStand"],
    rare: ["bastion"],
  },
  shopCardPools: {
    common: ["brace", "shieldJab", "safeguard", "riposte"],
    uncommon: ["towerSlam", "holdFast", "citadel", "lastStand"],
    rare: ["bastion"],
  },
  relicPools: {
    elite: ["bucklerFrame", "wardCharm", "caravanSeal", "reservePlate"],
    boss: ["bulwarkCore", "reinforcedFrame"],
  },
};
