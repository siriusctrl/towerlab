import type { CardDefinition } from "@towerlab/core";

import { cards as allCards } from "../../cards.js";
import { hunterCardIds as ids } from "../../cards/hunter.js";

export const hunterCardIds = ids;

export const cards: Record<string, CardDefinition> = hunterCardIds.reduce((acc, cardId) => {
  acc[cardId] = allCards[cardId];
  return acc;
}, {} as Record<string, CardDefinition>);
