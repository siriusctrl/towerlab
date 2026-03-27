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
  "surge",
  "battleJab",
  "tempoDrill",
  "bloodPact",
  "rallyLine",
  "disarm",
  "forgedAdvance",
  "uppercut",
  "carnage",
  "battleTrance",
  "bloodletting",
  "secondWind",
  "shockwave",
  "heavyBlow",
  "warpath",
  "overrun",
  "impervious",
  "bludgeon",
  "executioner",
  "finalCharge",
  "burningBanner",
  "warSpoils",
] as const;

export const cards: Record<string, CardDefinition> = warriorCardIds.reduce((acc, cardId) => {
  acc[cardId] = allCards[cardId];
  return acc;
}, {} as Record<string, CardDefinition>);
