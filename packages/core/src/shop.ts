import { SHOP_CARD_RARITY_PLAN } from "./constants.js";
import { buildRemovableDeckIndices, selectCardsFromBuckets } from "./shared.js";
import type { RunContent, RunState, ShopState } from "./types.js";

export function createShopState(content: RunContent, state: RunState): { shop: ShopState; rng: number } {
  const cardSelection = selectCardsFromBuckets(content.character.shopCardPools, SHOP_CARD_RARITY_PLAN, state.rng);
  const existingForSale = cardSelection.cards.filter((cardId) => content.cards[cardId]);

  return {
    shop: {
      forSale: existingForSale,
      removableDeckIndices: buildRemovableDeckIndices(state.deck),
    },
    rng: cardSelection.rng,
  };
}
