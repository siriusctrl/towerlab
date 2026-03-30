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
      { card: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 }, price: 12 },
      { card: { id: "defend", name: "Defend", cost: 1, description: "Gain 5 block.", block: 5 }, price: 18 },
      { card: { id: "heavyBlow", name: "Heavy Blow", cost: 2, description: "Deal 11 damage.", damage: 11 }, price: 26 },
    ],
    removableDeckCards: Array.from({ length: removableCount }, (_, deckIndex) => ({
      deckIndex,
      card: { id: `deck-${deckIndex}`, name: `Card ${deckIndex + 1}`, cost: 1, description: "Test card." },
    })),
    removeDeckCardCost: 12,
    remainingDeckRemovals: 3,
    nextNodes: [nextNode],
  };
}

describe("shop bindings", () => {
  test("uses 1-9 for removal keys and paginates after nine entries", () => {
    const bindings = createShopBindings(createShopObservation(99, 11));
    const removePageOne = createShopBindings(createShopObservation(99, 11), "remove", 0, 0);
    const removePageTwo = createShopBindings(createShopObservation(99, 11), "remove", 0, 1);

    expect(bindings.buyOptions.map((option) => option.key)).toEqual(["1", "2", "3"]);
    expect(bindings.removeOptions.map((option) => option.key)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", null, null]);
    expect(removePageOne.removeOptions.map((option) => option.key)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    expect(removePageTwo.removeOptions.map((option) => option.key)).toEqual(["1", "2"]);
    expect(removePageTwo.removeOptions.map((option) => option.deckIndex)).toEqual([9, 10]);
    expect(bindings.leaveKey).toBe("0");
  });

  test("does not expose buy or remove hotkeys when gold is insufficient", () => {
    const observation = createShopObservation(0, 4);
    const bindings = createShopBindings(observation);

    expect(bindings.buyOptions.every((option) => option.key === null)).toBe(true);
    expect(bindings.removeOptions.every((option) => option.key === null)).toBe(true);
    expect(readShopAction("1", observation, "top")).toBeNull();
    expect(readShopAction("2", observation, "top")).toBeNull();
    expect(readShopAction("3", observation, "top")).toBeNull();
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
    expect(readShopAction("3", observation, "remove")).toEqual({
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
    const removeBindings = createShopBindings(observation, "remove", 0, 0);

    expect(buyBindings.removeOptions.every((option) => option.key === null)).toBe(true);
    expect(removeBindings.buyOptions.every((option) => option.key === null)).toBe(true);
  });

  test("reads removal actions from the requested remove page", () => {
    const observation = createShopObservation(99, 11);

    expect(readShopAction("1", observation, "remove", 0, 1)).toEqual({
      type: "runAction",
      action: { type: "removeDeckCard", deckIndex: 9 },
    });
    expect(readShopAction("2", observation, "remove", 0, 1)).toEqual({
      type: "runAction",
      action: { type: "removeDeckCard", deckIndex: 10 },
    });
  });

  test("reads buy actions from the requested buy page", () => {
    const observation = createShopObservation(99, 0);
    observation.forSale = Array.from({ length: 12 }, (_, saleIndex) => ({
      card: {
        id: `sale-${saleIndex}`,
        name: `Card ${saleIndex + 1}`,
        cost: 1,
        description: "Test card.",
      },
      price: 12,
    }));

    const buyPageOne = createShopBindings(observation, "buy", 0, 0);
    const buyPageTwo = createShopBindings(observation, "buy", 1, 0);

    expect(buyPageOne.buyOptions.map((option) => option.key)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    expect(buyPageTwo.buyOptions.map((option) => option.key)).toEqual(["1", "2", "3"]);
    expect(readShopAction("1", observation, "buy", 1, 0)).toEqual({
      type: "runAction",
      action: { type: "buyShop", saleIndex: 9 },
    });
    expect(readShopAction("3", observation, "buy", 1, 0)).toEqual({
      type: "runAction",
      action: { type: "buyShop", saleIndex: 11 },
    });
  });

  test("clamps buy and remove page indices before resolving shop actions", () => {
    const observation = createShopObservation(99, 11);
    observation.forSale = Array.from({ length: 11 }, (_, saleIndex) => ({
      card: {
        id: `sale-${saleIndex}`,
        name: `Card ${saleIndex + 1}`,
        cost: 1,
        description: "Test card.",
      },
      price: 12,
    }));

    expect(readShopAction("1", observation, "buy", 99, 0)).toEqual({
      type: "runAction",
      action: { type: "buyShop", saleIndex: 9 },
    });
    expect(readShopAction("2", observation, "buy", 99, 0)).toEqual({
      type: "runAction",
      action: { type: "buyShop", saleIndex: 10 },
    });
    expect(readShopAction("1", observation, "remove", 0, 99)).toEqual({
      type: "runAction",
      action: { type: "removeDeckCard", deckIndex: 9 },
    });
    expect(readShopAction("2", observation, "remove", 0, 99)).toEqual({
      type: "runAction",
      action: { type: "removeDeckCard", deckIndex: 10 },
    });
  });
});
