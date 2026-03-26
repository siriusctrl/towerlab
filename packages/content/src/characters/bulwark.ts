import type { CharacterDefinition } from "@towerlab/core";

export const bulwark: CharacterDefinition = {
  id: "bulwark",
  name: "Bulwark",
  summary: "Heavy defense with blunt counterattacks.",
  maxHp: 88,
  startGold: 8,
  starterDeck: [
    "shieldJab",
    "shieldJab",
    "shieldJab",
    "shieldJab",
    "brace",
    "brace",
    "brace",
    "safeguard",
    "riposte",
    "towerSlam",
  ],
  startingRelicId: "guardTraining",
  blessingCards: ["towerSlam", "citadel", "bastion"],
  rewardCardPools: {
    common: ["brace", "shieldJab", "safeguard", "riposte"],
    rare: ["towerSlam", "holdFast", "citadel", "lastStand"],
    epic: ["bastion"],
  },
  shopCardPools: {
    common: ["brace", "shieldJab", "safeguard", "riposte"],
    rare: ["towerSlam", "holdFast", "citadel", "lastStand"],
    epic: ["bastion"],
  },
  relicPools: {
    elite: ["bucklerFrame", "wardCharm", "caravanSeal", "reservePlate"],
    boss: ["bulwarkCore", "reinforcedFrame"],
  },
};
