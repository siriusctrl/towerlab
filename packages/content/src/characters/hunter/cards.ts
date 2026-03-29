import type { CardDefinition } from "@towerlab/core";

import { cards as allCards } from "../../cards.js";

export const hunterCardIds = [
  "slice",
  "dodge",
  "neutralize",
  "survivor",
  "poisonedStab",
  "deadlyPoison",
  "backstab",
  "daggerThrow",
  "acrobatics",
  "escapePlan",
  "flyingKnee",
  "quickSlash",
  "backflip",
  "deflect",
  "suckerPunch",
  "terror",
  "outmaneuver",
  "legSweep",
  "dash",
  "predator",
  "cripplingCloud",
  "catalyst",
  "piercingWail",
  "bouncingFlask",
  "heelHook",
  "deadlyTactics",
  "glassKnife",
  "adrenaline",
  "finisher",
] as const;

export const cards: Record<string, CardDefinition> = hunterCardIds.reduce((acc, cardId) => {
  acc[cardId] = allCards[cardId];
  return acc;
}, {} as Record<string, CardDefinition>);
