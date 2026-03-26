import type { CharacterDefinition } from "@towerlab/core";

export const vanguard: CharacterDefinition = {
  id: "vanguard",
  name: "Vanguard",
  summary: "Burst damage and flexible attacks.",
  maxHp: 80,
  startGold: 0,
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
  startingRelicId: "battleStandard",
  blessingCards: ["recklessLunge", "ironTempo", "executioner"],
  rewardCardPools: {
    common: ["strike", "defend", "surge", "quickGuard", "punishingHit", "recklessLunge"],
    uncommon: ["precision", "heavyBlow", "ironTempo"],
    rare: ["executioner"],
  },
  shopCardPools: {
    common: ["surge", "quickGuard", "punishingHit", "recklessLunge"],
    uncommon: ["precision", "heavyBlow", "ironTempo"],
    rare: ["executioner"],
  },
  relicPools: {
    elite: ["combatFocus", "medicinePack", "merchantTag", "razorsigil"],
    boss: ["warEngine", "reinforcedFrame"],
  },
};
