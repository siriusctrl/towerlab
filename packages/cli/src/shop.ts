import type { RunAction, ShopObservation } from "@towerlab/core";

export const SHOP_BUY_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
export const SHOP_REMOVE_KEYS = "abcdefghijklmnopqrstuvwxyz".split("") as string[];
export const SHOP_LEAVE_KEY = "0";
export const SHOP_MENU_BUY_KEY = "1";
export const SHOP_MENU_REMOVE_KEY = "2";
export const SHOP_MENU_BACK_KEY = "b";

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

export type ShopMenuMode = "top" | "buy" | "remove";

type ShopBindingMode = "flat" | "buy" | "remove";

export interface ShopReadMenuAction {
  type: "openMenu";
  menu: ShopMenuMode;
}

export interface ShopReadRunAction {
  type: "runAction";
  action: RunAction;
}

export type ShopReadAction = ShopReadMenuAction | ShopReadRunAction;

export function createShopBindings(observation: ShopObservation, mode: ShopBindingMode = "flat"): ShopBindings {
  const canAffordRemove = observation.gold >= observation.removeDeckCardCost;
  const bindBuy = mode === "flat" || mode === "buy";
  const bindRemove = mode === "flat" || mode === "remove";

  return {
    buyOptions: observation.forSale.map((card, saleIndex) => ({
      key:
        bindBuy && observation.gold >= card.cost && saleIndex < SHOP_BUY_KEYS.length ? SHOP_BUY_KEYS[saleIndex]! : null,
      saleIndex,
      affordable: observation.gold >= card.cost,
      card,
    })),
    removeOptions: observation.removableDeckCards.map((entry, index) => ({
      key: bindRemove && canAffordRemove && index < SHOP_REMOVE_KEYS.length ? SHOP_REMOVE_KEYS[index]! : null,
      deckIndex: entry.deckIndex,
      affordable: canAffordRemove,
      card: entry.card,
    })),
    leaveKey: SHOP_LEAVE_KEY,
  };
}

export function readShopAction(input: string, observation: ShopObservation, menu: ShopMenuMode): ShopReadAction | null {
  const bindings = createShopBindings(observation);
  const canBuy = bindings.buyOptions.some((option) => option.key !== null);
  const canRemove = bindings.removeOptions.some((option) => option.key !== null);

  if (menu === "top") {
    if (input === SHOP_MENU_BUY_KEY && canBuy) {
      return { type: "openMenu", menu: "buy" };
    }

    if (input === SHOP_MENU_REMOVE_KEY && canRemove) {
      return { type: "openMenu", menu: "remove" };
    }

    if (input === SHOP_LEAVE_KEY) {
      return { type: "runAction", action: { type: "leaveShop" } };
    }

    return null;
  }

  if (input === SHOP_MENU_BACK_KEY) {
    return { type: "openMenu", menu: "top" };
  }

  const scopedBindings = createShopBindings(observation, menu === "buy" ? "buy" : "remove");

  const buy = scopedBindings.buyOptions.find((option) => option.key === input);
  if (buy) {
    return { type: "runAction", action: { type: "buyShop", saleIndex: buy.saleIndex } };
  }

  const remove = scopedBindings.removeOptions.find((option) => option.key === input);
  if (remove) {
    return { type: "runAction", action: { type: "removeDeckCard", deckIndex: remove.deckIndex } };
  }

  return null;
}
