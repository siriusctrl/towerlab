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
  ],
  rare: ["outmaneuver", "legSweep", "dash", "predator", "cripplingCloud", "catalyst", "piercingWail", "bouncingFlask", "heelHook", "deadlyTactics"],
  epic: ["glassKnife", "adrenaline", "finisher"],
};

export const hunterShopCardPools: CardRarityBuckets = {
  common: [...hunterRewardCardPools.common],
  rare: [...hunterRewardCardPools.rare],
  epic: [...hunterRewardCardPools.epic],
};
