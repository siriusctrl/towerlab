import type { CardDefinition } from "@towerlab/core";

import { cards as allCards } from "../../cards.js";

export const warriorCardIds = [
  "strike",
  "defend",
  "bash",
  "pommelStrike",
  "anger",
  "shrugItOff",
  "trueGrit",
  "twinStrike",
  "ironWave",
  "thunderclap",
  "surge",
  "tempoDrill",
  "bloodPact",
  "rallyLine",
  "disarm",
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
  "impervious",
  "bludgeon",
  "executioner",
  "finalCharge",
  "burningBanner",
  "warSpoils",
  "reaper",
] as const;

export const cards: Record<string, CardDefinition> = warriorCardIds.reduce((acc, cardId) => {
  acc[cardId] = allCards[cardId];
  return acc;
}, {} as Record<string, CardDefinition>);
