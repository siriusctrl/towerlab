import type { MapNode, ShopObservation } from "@towerlab/core";
import { describe, expect, test } from "vitest";

import { createShopBindings, readShopAction } from "./shop.js";

const currentNode: MapNode = { id: "market", kind: "shop", nextIds: ["summit"] };
const nextNode: MapNode = { id: "summit", kind: "boss", encounterId: "watchCore", nextIds: [] };

function createShopObservation(gold: number, removableCount: number): ShopObservation {
  return {
    seed: 7,
    phase: "shop",
    hp: 62,
    maxHp: 80,
    gold,
    floor: 2,
    currentNode,
    relics: [],
    log: [],
    forSale: [
      { id: "strike", name: "Strike", cost: 11, description: "Deal 6 damage.", damage: 6 },
      { id: "defend", name: "Defend", cost: 11, description: "Gain 5 block.", block: 5 },
      { id: "heavyBlow", name: "Heavy Blow", cost: 11, description: "Deal 11 damage.", damage: 11 },
    ],
    removableDeckCards: Array.from({ length: removableCount }, (_, deckIndex) => ({
      deckIndex,
      card: { id: `deck-${deckIndex}`, name: `Card ${deckIndex + 1}`, cost: 1, description: "Test card." },
    })),
    removeDeckCardCost: 12,
    nextNodes: [nextNode],
  };
}

describe("shop bindings", () => {
  test("separates buy and remove hotkeys so removal never uses two-digit numbering", () => {
    const bindings = createShopBindings(createShopObservation(99, 11));

    expect(bindings.buyOptions.map((option) => option.key)).toEqual(["1", "2", "3"]);
    expect(bindings.removeOptions.map((option) => option.key)).toEqual(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"]);
    expect(bindings.leaveKey).toBe("0");
  });

  test("does not expose buy or remove hotkeys when gold is insufficient", () => {
    const observation = createShopObservation(0, 4);
    const bindings = createShopBindings(observation);

    expect(bindings.buyOptions.every((option) => option.key === null)).toBe(true);
    expect(bindings.removeOptions.every((option) => option.key === null)).toBe(true);
    expect(readShopAction("1", observation, "top")).toBeNull();
    expect(readShopAction("2", observation, "top")).toBeNull();
    expect(readShopAction("a", observation, "top")).toBeNull();
    expect(readShopAction("0", observation, "top")).toEqual({
      type: "runAction",
      action: { type: "leaveShop" },
    });
  });

  test("maps hotkeys back to concrete shop actions", () => {
    const observation = createShopObservation(99, 3);

    expect(readShopAction("1", observation, "top")).toEqual({
      type: "openMenu",
      menu: "buy",
    });
    expect(readShopAction("2", observation, "top")).toEqual({
      type: "openMenu",
      menu: "remove",
    });
    expect(readShopAction("2", observation, "buy")).toEqual({
      type: "runAction",
      action: { type: "buyShop", saleIndex: 1 },
    });
    expect(readShopAction("c", observation, "remove")).toEqual({
      type: "runAction",
      action: { type: "removeDeckCard", deckIndex: 2 },
    });
    expect(readShopAction("b", observation, "buy")).toEqual({ type: "openMenu", menu: "top" });
    expect(readShopAction("b", observation, "remove")).toEqual({ type: "openMenu", menu: "top" });
  });

  test("keeps top-level options unselectable when actions are unaffordable", () => {
    const observation = createShopObservation(5, 4);

    expect(readShopAction("1", observation, "top")).toBeNull();
    expect(readShopAction("2", observation, "top")).toBeNull();
  });

  test("binds createShopBindings to submenu modes", () => {
    const observation = createShopObservation(99, 4);
    const buyBindings = createShopBindings(observation, "buy");
    const removeBindings = createShopBindings(observation, "remove");

    expect(buyBindings.removeOptions.every((option) => option.key === null)).toBe(true);
    expect(removeBindings.buyOptions.every((option) => option.key === null)).toBe(true);
  });
});
