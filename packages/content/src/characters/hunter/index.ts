import type { CharacterDefinition } from "@towerlab/core";

import { hunterIdentity, hunterStarter } from "./starter.js";
import { hunterRewardCardPools, hunterShopCardPools } from "./pools.js";
import { hunterRelicPools } from "./relics.js";

export const hunter: CharacterDefinition = {
  ...hunterIdentity,
  ...hunterStarter,
  rewardCardPools: hunterRewardCardPools,
  shopCardPools: hunterShopCardPools,
  relicPools: hunterRelicPools,
};
