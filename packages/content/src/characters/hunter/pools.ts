import type { CardRarityBuckets } from "@towerlab/core";

export const hunterRewardCardPools: CardRarityBuckets = {
  common: [
    "neutralize",
    "poisonedStab",
    "deadlyPoison",
    "quickSlash",
    "backflip",
    "deflect",
    "suckerPunch",
    "terror",
    "slice",
    "dodge",
    "survivor",
  ],
  rare: ["outmaneuver", "legSweep", "dash", "predator", "cripplingCloud", "catalyst"],
  epic: ["glassKnife", "adrenaline"],
};

export const hunterShopCardPools: CardRarityBuckets = {
  common: [...hunterRewardCardPools.common],
  rare: [...hunterRewardCardPools.rare],
  epic: [...hunterRewardCardPools.epic],
};
