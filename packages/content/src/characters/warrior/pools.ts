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
    "tempoDrill",
    "bloodPact",
    "rallyLine",
    "disarm",
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
  ],
  epic: ["impervious", "bludgeon", "executioner", "finalCharge", "burningBanner", "warSpoils", "reaper"],
};

export const warriorShopCardPools: CardRarityBuckets = {
  common: [...warriorRewardCardPools.common],
  rare: [...warriorRewardCardPools.rare],
  epic: [...warriorRewardCardPools.epic],
};
