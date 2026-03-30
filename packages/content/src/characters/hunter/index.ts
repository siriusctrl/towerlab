import type { CharacterDefinition } from "@towerlab/core";

import { hunterBlessingCardPools } from "./blessings.js";
import { hunterIdentity, hunterStarter } from "./starter.js";
import { hunterRewardCardPools, hunterShopCardPools } from "./pools.js";
import { hunterRelicPools } from "./relics.js";

export const hunter: CharacterDefinition = {
  ...hunterIdentity,
  ...hunterStarter,
  blessingCardPools: hunterBlessingCardPools,
  rewardCardPools: hunterRewardCardPools,
  shopCardPools: hunterShopCardPools,
  relicPools: hunterRelicPools,
};
