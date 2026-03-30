import type { RunAction, ShopObservation } from "@towerlab/core";

export const SHOP_BUY_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
export const SHOP_REMOVE_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
export const SHOP_LEAVE_KEY = "0";
export const SHOP_MENU_BUY_KEY = "1";
export const SHOP_MENU_REMOVE_KEY = "2";
export const SHOP_MENU_BACK_KEY = "b";
export const SHOP_BUY_PAGE_SIZE = 9;
export const SHOP_REMOVE_PAGE_SIZE = 9;

export interface ShopBuyOption {
  key: string | null;
  saleIndex: number;
  affordable: boolean;
  card: ShopObservation["forSale"][number]["card"];
  price: number;
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

export function createShopBindings(
  observation: ShopObservation,
  mode: ShopBindingMode = "flat",
  buyPage = 0,
  removePage = 0,
): ShopBindings {
  const canAffordRemove = observation.gold >= observation.removeDeckCardCost;
  const bindBuy = mode === "flat" || mode === "buy";
  const bindRemove = mode === "flat" || mode === "remove";
  const clampedBuyPage = Math.max(0, Math.min(buyPage, Math.max(0, Math.ceil(observation.forSale.length / SHOP_BUY_PAGE_SIZE) - 1)));
  const clampedRemovePage = Math.max(
    0,
    Math.min(removePage, Math.max(0, Math.ceil(observation.removableDeckCards.length / SHOP_REMOVE_PAGE_SIZE) - 1)),
  );
  const pagedBuys =
    mode === "buy"
      ? observation.forSale.slice(
          clampedBuyPage * SHOP_BUY_PAGE_SIZE,
          clampedBuyPage * SHOP_BUY_PAGE_SIZE + SHOP_BUY_PAGE_SIZE,
        )
      : observation.forSale;
  const pagedRemovals =
    mode === "remove"
      ? observation.removableDeckCards.slice(
          clampedRemovePage * SHOP_REMOVE_PAGE_SIZE,
          clampedRemovePage * SHOP_REMOVE_PAGE_SIZE + SHOP_REMOVE_PAGE_SIZE,
        )
      : observation.removableDeckCards;

  return {
    buyOptions: pagedBuys.map((offer, index) => ({
      key:
        bindBuy && observation.gold >= offer.price && index < SHOP_BUY_KEYS.length ? SHOP_BUY_KEYS[index]! : null,
      saleIndex: mode === "buy" ? clampedBuyPage * SHOP_BUY_PAGE_SIZE + index : index,
      affordable: observation.gold >= offer.price,
      card: offer.card,
      price: offer.price,
    })),
    removeOptions: pagedRemovals.map((entry, index) => ({
      key: bindRemove && canAffordRemove && index < SHOP_REMOVE_KEYS.length ? SHOP_REMOVE_KEYS[index]! : null,
      deckIndex: entry.deckIndex,
      affordable: canAffordRemove,
      card: entry.card,
    })),
    leaveKey: SHOP_LEAVE_KEY,
  };
}

export function readShopAction(
  input: string,
  observation: ShopObservation,
  menu: ShopMenuMode,
  buyPage = 0,
  removePage = 0,
): ShopReadAction | null {
  const buyPageCount = Math.max(1, Math.ceil(observation.forSale.length / SHOP_BUY_PAGE_SIZE));
  const removePageCount = Math.max(1, Math.ceil(observation.removableDeckCards.length / SHOP_REMOVE_PAGE_SIZE));
  const safeBuyPage = Math.min(Math.max(buyPage, 0), buyPageCount - 1);
  const safeRemovePage = Math.min(Math.max(removePage, 0), removePageCount - 1);
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

  const scopedBindings = createShopBindings(
    observation,
    menu === "buy" ? "buy" : "remove",
    safeBuyPage,
    safeRemovePage,
  );

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
