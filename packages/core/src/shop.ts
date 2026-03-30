import {
  SHOP_CARD_PRICES,
  SHOP_CARD_RARITY_PLAN,
  SHOP_CARD_REMOVE_BASE_PRICE,
  SHOP_CARD_REMOVE_INCREMENT,
  SHOP_CARD_REMOVE_LIMIT_PER_SHOP,
} from "./constants.js";
import { buildRemovableDeckIndices, getRelicValue, selectCardsFromBuckets } from "./shared.js";
import type { CardRarity, RunContent, RunState, ShopState } from "./types.js";

export function createShopState(content: RunContent, state: RunState): { shop: ShopState; rng: number } {
  const cardSelection = selectCardsFromBuckets(content.character.shopCardPools, SHOP_CARD_RARITY_PLAN, state.rng);
  const existingForSale = cardSelection.cards
    .filter((cardId) => content.cards[cardId])
    .map((cardId) => ({
      cardId,
      price: getShopCardPrice(content, state, content.cards[cardId]!.rarity),
    }));

  return {
    shop: {
      forSale: existingForSale,
      removableDeckIndices: buildShopRemovableDeckIndices(state.deck, 0),
      removalsThisShop: 0,
    },
    rng: cardSelection.rng,
  };
}

export function getShopCardPrice(content: RunContent, state: RunState, rarity: CardRarity | undefined): number {
  const shopDiscount = getRelicValue(content, state, "shopDiscount");
  return Math.max(1, SHOP_CARD_PRICES[rarity ?? "common"] - shopDiscount);
}

export function getDeckRemovalPrice(totalDeckRemovals: number): number {
  return SHOP_CARD_REMOVE_BASE_PRICE + totalDeckRemovals * SHOP_CARD_REMOVE_INCREMENT;
}

export function getRemainingDeckRemovals(removalsThisShop: number): number {
  return Math.max(0, SHOP_CARD_REMOVE_LIMIT_PER_SHOP - removalsThisShop);
}

export function buildShopRemovableDeckIndices(
  deck: RunState["deck"],
  removalsThisShop: number,
): number[] {
  if (removalsThisShop >= SHOP_CARD_REMOVE_LIMIT_PER_SHOP) {
    return [];
  }

  return buildRemovableDeckIndices(deck);
}
