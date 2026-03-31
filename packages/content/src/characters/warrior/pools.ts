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
    "forgeDoctrine",
    "cinderRitual",
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
  epic: ["impervious", "bludgeon", "executioner", "finalCharge", "burningBanner", "warSpoils", "reaper", "bastion"],
};

export const warriorShopCardPools: CardRarityBuckets = {
  common: [...warriorRewardCardPools.common],
  rare: [...warriorRewardCardPools.rare],
  epic: [...warriorRewardCardPools.epic],
};
