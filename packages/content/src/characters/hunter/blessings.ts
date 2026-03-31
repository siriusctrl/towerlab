import type { BlessingCardPools, BlessingRelicPools } from "@towerlab/core";

export const hunterBlessingCardPools: BlessingCardPools = {
  act1: [
    "deadlyPoison",
    "backflip",
    "terror",
    "escapePlan",
    "nightbrew",
    "markedQuarry",
    "cruelTutelage",
  ],
  act2: [
    "outmaneuver",
    "legSweep",
    "dash",
    "catalyst",
    "bouncingFlask",
    "markedShot",
    "nightbrew",
  ],
  act3: [
    "predator",
    "cripplingCloud",
    "adrenaline",
    "glassKnife",
    "finisher",
    "cruelTutelage",
    "markedQuarry",
  ],
};

export const hunterBlessingRelicPools: BlessingRelicPools = {
  act1: ["fangCharm", "markedScope", "dirtyLedger"],
  act2: ["viperSeal", "quarryMap", "shadowLedger"],
  act3: ["venomScriptRelic", "executionMark", "assassinNotebook"],
};
