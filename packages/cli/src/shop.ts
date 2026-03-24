import type { RunAction, ShopObservation } from "@towerlab/core";

export const SHOP_BUY_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
export const SHOP_REMOVE_KEYS = "abcdefghijklmnopqrstuvwxyz".split("") as string[];
export const SHOP_LEAVE_KEY = "0";

export interface ShopBuyOption {
  key: string | null;
  saleIndex: number;
  affordable: boolean;
  card: ShopObservation["forSale"][number];
}

export interface ShopRemoveOption {
  key: string | null;
  deckIndex: number;
  affordable: boolean;
  card: ShopObservation["removableDeckCards"][number]["card"];
}

export interface ShopBindings {
  buyOptions: ShopBuyOption[];
  removeOptions: ShopRemoveOption[];
  leaveKey: string;
}

export function createShopBindings(observation: ShopObservation): ShopBindings {
  const canAffordRemove = observation.gold >= observation.removeDeckCardCost;

  return {
    buyOptions: observation.forSale.map((card, saleIndex) => ({
      key: observation.gold >= card.cost && saleIndex < SHOP_BUY_KEYS.length ? SHOP_BUY_KEYS[saleIndex]! : null,
      saleIndex,
      affordable: observation.gold >= card.cost,
      card,
    })),
    removeOptions: observation.removableDeckCards.map((entry, index) => ({
      key: canAffordRemove && index < SHOP_REMOVE_KEYS.length ? SHOP_REMOVE_KEYS[index]! : null,
      deckIndex: entry.deckIndex,
      affordable: canAffordRemove,
      card: entry.card,
    })),
    leaveKey: SHOP_LEAVE_KEY,
  };
}

export function readShopAction(input: string, observation: ShopObservation): RunAction | null {
  const bindings = createShopBindings(observation);

  const buy = bindings.buyOptions.find((option) => option.key === input);
  if (buy) {
    return { type: "buyShop", saleIndex: buy.saleIndex };
  }

  const remove = bindings.removeOptions.find((option) => option.key === input);
  if (remove) {
    return { type: "removeDeckCard", deckIndex: remove.deckIndex };
  }

  if (input === bindings.leaveKey) {
    return { type: "leaveShop" };
  }

  return null;
}
