import type { CardRarityBuckets } from "@towerlab/core";

export const warriorRewardCardPools: CardRarityBuckets = {
  common: [
    "anger",
    "pommelStrike",
    "shrugItOff",
    "bash",
    "trueGrit",
    "twinStrike",
    "ironWave",
    "thunderclap",
    "surge",
    "battleJab",
    "tempoDrill",
    "bloodPact",
    "rallyLine",
    "disarm",
    "forgedAdvance",
  ],
  rare: [
    "uppercut",
    "carnage",
    "battleTrance",
    "bloodletting",
    "secondWind",
    "shockwave",
    "heavyBlow",
    "warpath",
    "overrun",
    "clothesline",
    "dropkick",
    "ghostlyArmor",
    "seeingRed",
    "offering",
  ],
  epic: ["impervious", "bludgeon", "executioner", "finalCharge", "burningBanner", "warSpoils", "reaper"],
};

export const warriorShopCardPools: CardRarityBuckets = {
  common: [...warriorRewardCardPools.common],
  rare: [...warriorRewardCardPools.rare],
  epic: [...warriorRewardCardPools.epic],
};
