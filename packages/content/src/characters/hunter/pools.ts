import type { CardRarityBuckets } from "@towerlab/core";

export const hunterRewardCardPools: CardRarityBuckets = {
  common: [
    "neutralize",
    "poisonedStab",
    "deadlyPoison",
    "backstab",
    "daggerThrow",
    "acrobatics",
    "escapePlan",
    "flyingKnee",
    "quickSlash",
    "backflip",
    "deflect",
    "suckerPunch",
    "terror",
    "slice",
    "dodge",
    "survivor",
    "markedShot",
  ],
  rare: ["outmaneuver", "legSweep", "dash", "predator", "cripplingCloud", "catalyst", "piercingWail", "bouncingFlask", "heelHook", "deadlyTactics", "nightbrew", "markedQuarry"],
  epic: ["glassKnife", "adrenaline", "finisher", "cruelTutelage"],
};

export const hunterShopCardPools: CardRarityBuckets = {
  common: [...hunterRewardCardPools.common],
  rare: [...hunterRewardCardPools.rare],
  epic: [...hunterRewardCardPools.epic],
};
