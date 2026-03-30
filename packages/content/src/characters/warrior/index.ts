import type { CharacterDefinition } from "@towerlab/core";

import { warriorBlessingCardPools } from "./blessings.js";
import { warriorIdentity, warriorStarter } from "./starter.js";
import { warriorRewardCardPools, warriorShopCardPools } from "./pools.js";
import { warriorRelicPools } from "./relics.js";

export const warrior: CharacterDefinition = {
  ...warriorIdentity,
  ...warriorStarter,
  blessingCardPools: warriorBlessingCardPools,
  rewardCardPools: warriorRewardCardPools,
  shopCardPools: warriorShopCardPools,
  relicPools: warriorRelicPools,
};
