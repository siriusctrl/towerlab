import type { CardDefinition } from "@towerlab/core";

import { cards as allCards } from "../../cards.js";
import { warriorCardIds as ids } from "../../cards/warrior.js";

export const warriorCardIds = ids;

export const cards: Record<string, CardDefinition> = warriorCardIds.reduce((acc, cardId) => {
  acc[cardId] = allCards[cardId];
  return acc;
}, {} as Record<string, CardDefinition>);
