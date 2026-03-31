import type { CharacterDefinition } from "@towerlab/core";

import { warriorBlessingCardPools, warriorBlessingRelicPools } from "./blessings.js";
import { warriorIdentity, warriorStarter } from "./starter.js";
import { warriorRewardCardPools, warriorShopCardPools } from "./pools.js";
import { warriorRelicPools } from "./relics.js";

export const warrior: CharacterDefinition = {
  ...warriorIdentity,
  ...warriorStarter,
  blessingCardPools: warriorBlessingCardPools,
  blessingRelicPools: warriorBlessingRelicPools,
  rewardCardPools: warriorRewardCardPools,
  shopCardPools: warriorShopCardPools,
  relicPools: warriorRelicPools,
};
