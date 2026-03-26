import { SHOP_CARD_COUNT } from "./constants.js";
import { buildRemovableDeckIndices, selectCardsFromPool } from "./shared.js";
import type { RunContent, RunState, ShopState } from "./types.js";

export function createShopState(content: RunContent, state: RunState): { shop: ShopState; rng: number } {
  const cardSelection = selectCardsFromPool(content.shopCardPool, SHOP_CARD_COUNT, state.rng);
  const existingForSale = cardSelection.cards.filter((cardId) => content.cards[cardId]);

  return {
    shop: {
      forSale: existingForSale,
      removableDeckIndices: buildRemovableDeckIndices(state.deck),
    },
    rng: cardSelection.rng,
  };
}
