import { describe, expect, it } from "vitest";

import {
  applyAction,
  createRun,
  observeRun,
  type CombatObservation,
  type RunContent,
  type RunState,
} from "../index.js";

const content: RunContent = {
  cards: {
    strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
    defend: { id: "defend", name: "Defend", cost: 1, description: "Gain 5 block.", block: 5 },
    surge: { id: "surge", name: "Surge", cost: 1, description: "Deal 4 damage. Gain 4 block.", damage: 4, block: 4 },
    heavy: { id: "heavy", name: "Heavy", cost: 2, description: "Deal 11 damage.", damage: 11 },
  },
  enemies: {
    scout: {
      id: "scout",
      name: "Scout",
      maxHp: 18,
      goldReward: 10,
      intents: [
        { kind: "attack", description: "Poke for 5", damage: 5 },
        { kind: "block", description: "Brace for 4 block", block: 4 },
      ],
    },
    core: {
      id: "core",
      name: "Core",
      maxHp: 16,
      goldReward: 20,
      intents: [{ kind: "attack", description: "Beam for 8", damage: 8 }],
    },
  },
  relics: {},
  rewardCardPool: [],
  shopCardPool: [],
  starterDeck: ["strike", "strike", "strike", "defend", "defend", "defend", "surge", "surge", "heavy", "heavy"],
  map: [
    { id: "gate", kind: "battle", encounterId: "scout", nextIds: ["camp"] },
    { id: "camp", kind: "rest", nextIds: ["summit"] },
    { id: "summit", kind: "boss", encounterId: "core", nextIds: [] },
  ],
};

describe("createRun", () => {
  it("produces the same opening combat state for the same seed", () => {
    const first = createRun(content, 7);
    const second = createRun(content, 7);
    const firstView = observeRun(content, first);
    const secondView = observeRun(content, second);

    expect(first.phase).toBe("combat");
    expect(second.phase).toBe("combat");
    expect(firstView).toEqual(secondView);
  });

  it("changes the opening hand for a different seed", () => {
    const first = observeCombat(content, createRun(content, 7));
    const second = observeCombat(content, createRun(content, 8));

    expect(first.hand.map((card) => card.id)).not.toEqual(second.hand.map((card) => card.id));
  });
});

describe("run progression", () => {
  it("moves from combat to map to rest", () => {
    let state = createRun(content, 7);

    state = winCurrentCombat(content, state);
    expect(state.phase).toBe("map");

    state = applyAction(content, state, { type: "choosePath", nodeId: "camp" });
    const restView = observeRun(content, state);

    expect(restView.phase).toBe("rest");
    expect(restView.currentNode.id).toBe("camp");
  });

  it("applies the fortify rest option and keeps the run going", () => {
    let state = createRun(content, 7);

    state = winCurrentCombat(content, state);
    state = applyAction(content, state, { type: "choosePath", nodeId: "camp" });
    const hpBeforeRest = state.hp;
    state = applyAction(content, state, { type: "chooseRest", optionId: "fortify" });

    expect(state.phase).toBe("map");
    expect(state.maxHp).toBe(85);
    expect(state.hp).toBe(hpBeforeRest + 5);
  });

  it("supports route tradeoffs through battle, elite, rest, and shop", () => {
    const tradeoffContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      relics: {},
      rewardCardPool: [],
      shopCardPool: [],
      enemies: {
        guard: {
          id: "guard",
          name: "Guard",
          maxHp: 8,
          goldReward: 12,
          intents: [{ kind: "attack", description: "Swipe", damage: 1 }],
        },
        warden: {
          id: "warden",
          name: "Warden",
          maxHp: 8,
          goldReward: 18,
          intents: [{ kind: "attack", description: "Smite", damage: 1 }],
        },
        watchman: {
          id: "watchman",
          name: "Watchman",
          maxHp: 7,
          goldReward: 12,
          intents: [{ kind: "attack", description: "Snipe", damage: 1 }],
        },
        core: {
          id: "core",
          name: "Core",
          maxHp: 10,
          goldReward: 30,
          intents: [{ kind: "attack", description: "Pulse", damage: 1 }],
        },
      },
      starterDeck: ["strike", "strike", "strike", "strike", "strike"],
      map: [
        { id: "gate", kind: "battle", encounterId: "guard", nextIds: ["forge", "hall"] },
        { id: "hall", kind: "battle", encounterId: "watchman", nextIds: ["rest", "market"] },
        { id: "forge", kind: "elite", encounterId: "warden", nextIds: ["market"] },
        { id: "rest", kind: "rest", nextIds: ["summit"] },
        { id: "market", kind: "shop", nextIds: ["summit"] },
        { id: "summit", kind: "boss", encounterId: "core", nextIds: [] },
      ],
    };

    let state = createRun(tradeoffContent, 101);

    state = winCurrentCombat(tradeoffContent, state);
    const firstChoice = observeRun(tradeoffContent, state);

    if (firstChoice.phase !== "map") {
      throw new Error(`expected map phase, received ${firstChoice.phase}`);
    }

    expect(firstChoice.nextNodes).toHaveLength(2);
    expect(firstChoice.nextNodes.map((node) => node.kind)).toEqual(["elite", "battle"]);

    state = applyAction(tradeoffContent, state, { type: "choosePath", nodeId: "forge" });
    state = winCurrentCombat(tradeoffContent, state);
    let view = observeRun(tradeoffContent, state);

    if (view.phase !== "map") {
      throw new Error(`expected map phase after forge, received ${view.phase}`);
    }

    expect(view.currentNode.id).toBe("forge");
    expect(view.nextNodes.map((node) => node.id)).toEqual(["market"]);

    state = applyAction(tradeoffContent, state, { type: "choosePath", nodeId: "market" });
    view = observeRun(tradeoffContent, state);

    if (view.phase !== "shop") {
      throw new Error(`expected shop phase after visiting market, received ${view.phase}`);
    }

    state = applyAction(tradeoffContent, state, { type: "leaveShop" });
    view = observeRun(tradeoffContent, state);

    if (view.phase !== "map") {
      throw new Error(`expected map after leaving shop, received ${view.phase}`);
    }

    expect(view.currentNode.id).toBe("market");
    expect(view.nextNodes.map((node) => node.id)).toEqual(["summit"]);

    state = createRun(tradeoffContent, 101);
    state = winCurrentCombat(tradeoffContent, state);
    state = applyAction(tradeoffContent, state, { type: "choosePath", nodeId: "hall" });

    state = winCurrentCombat(tradeoffContent, state);
    const hallEncounter = observeRun(tradeoffContent, state);
    if (hallEncounter.phase !== "map") {
      throw new Error(`expected map after hall encounter, received ${hallEncounter.phase}`);
    }

    expect(hallEncounter.nextNodes.map((node) => node.kind)).toEqual(["rest", "shop"]);
  });
});

describe("post-combat rewards", () => {
  it("presents three reward options and allows skip", () => {
    const rewardContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
        defend: { id: "defend", name: "Defend", cost: 1, description: "Gain 5 block.", block: 5 },
        surge: { id: "surge", name: "Surge", cost: 1, description: "Deal 4 damage. Gain 4 block.", damage: 4, block: 4 },
      },
      relics: {},
      rewardCardPool: ["strike", "defend", "surge"],
      shopCardPool: [],
      enemies: {
        patrol: {
          id: "patrol",
          name: "Patrol",
          maxHp: 8,
          goldReward: 12,
          intents: [{ kind: "attack", description: "Stab for 2", damage: 2 }],
        },
      },
      starterDeck: ["strike", "strike", "defend"],
      map: [{ id: "gate", kind: "battle", encounterId: "patrol", nextIds: [] }],
    };

    let state = createRun(rewardContent, 15);
    state = winCurrentCombat(rewardContent, state);
    const rewardView = observeRun(rewardContent, state);

    if (rewardView.phase !== "reward") {
      throw new Error(`expected reward phase, received ${rewardView.phase}`);
    }

    expect(rewardView.cardChoices).toHaveLength(3);
    state = applyAction(rewardContent, state, { type: "skipReward" });
    expect(state.phase).toBe("victory");
  });

  it("adds a chosen reward card to the deck", () => {
    const rewardContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
        defend: { id: "defend", name: "Defend", cost: 1, description: "Gain 5 block.", block: 5 },
        surge: { id: "surge", name: "Surge", cost: 1, description: "Deal 4 damage. Gain 4 block.", damage: 4, block: 4 },
      },
      relics: {},
      rewardCardPool: ["strike", "defend", "surge"],
      shopCardPool: [],
      enemies: {
        patrol: {
          id: "patrol",
          name: "Patrol",
          maxHp: 8,
          goldReward: 12,
          intents: [{ kind: "attack", description: "Stab for 2", damage: 2 }],
        },
      },
      starterDeck: ["strike", "strike", "defend"],
      map: [{ id: "gate", kind: "battle", encounterId: "patrol", nextIds: [] }],
    };

    let state = createRun(rewardContent, 16);
    state = winCurrentCombat(rewardContent, state);
    const rewardView = observeRun(rewardContent, state);
    if (rewardView.phase !== "reward") {
      throw new Error(`expected reward phase, received ${rewardView.phase}`);
    }

    const chosenCard = rewardView.cardChoices[0];
    const afterReward = applyAction(rewardContent, state, { type: "takeReward", rewardIndex: 0 });

    expect(afterReward.deck).toContain(chosenCard.id);
    expect(afterReward.deck.length).toBe(rewardContent.starterDeck.length + 1);
  });
});

describe("shop behavior", () => {
  it("allows buying and removing cards and leaving", () => {
    const shopContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
        defend: { id: "defend", name: "Defend", cost: 1, description: "Gain 5 block.", block: 5 },
        surge: { id: "surge", name: "Surge", cost: 1, description: "Deal 4 damage. Gain 4 block.", damage: 4, block: 4 },
      },
      relics: {},
      rewardCardPool: [],
      shopCardPool: ["strike", "defend", "surge"],
      enemies: {
        vendor: {
          id: "vendor",
          name: "Vendor",
          maxHp: 6,
          goldReward: 24,
          intents: [{ kind: "attack", description: "Nip for 1", damage: 1 }],
        },
      },
      starterDeck: ["strike", "strike", "defend", "surge"],
      map: [{ id: "gate", kind: "battle", encounterId: "vendor", nextIds: ["market"] }, { id: "market", kind: "shop", nextIds: [] }],
    };

    let state = createRun(shopContent, 20);
    state = winCurrentCombat(shopContent, state);
    state = applyAction(shopContent, state, { type: "choosePath", nodeId: "market" });
    const shopView = observeRun(shopContent, state);

    if (shopView.phase !== "shop") {
      throw new Error(`expected shop phase, received ${shopView.phase}`);
    }

    expect(shopView.removeDeckCardCost).toBe(12);

    const initialDeckSize = state.deck.length;
    const initialGold = state.gold;
    const bought = applyAction(shopContent, state, { type: "buyShop", saleIndex: 0 });

    expect(bought.phase).toBe("shop");
    expect(bought.deck.length).toBe(initialDeckSize + 1);
    expect(bought.gold).toBe(initialGold - 12);

    const removableView = observeRun(shopContent, bought);
    if (removableView.phase !== "shop") {
      throw new Error(`expected shop phase after purchase, received ${removableView.phase}`);
    }

    const removableDeckIndex = bought.deck.length - 1;
    const removed = applyAction(shopContent, bought, { type: "removeDeckCard", deckIndex: removableDeckIndex });
    expect(removed.deck.length).toBe(initialDeckSize);
    expect(removableView.removableDeckCards.length).toBe(bought.deck.length);
    expect(removed.gold).toBe(bought.gold - removableView.removeDeckCardCost);

    const left = applyAction(shopContent, removed, { type: "leaveShop" });
    expect(left.phase).toBe("victory");
  });
});

describe("relic systems", () => {
  it("starts each combat with relic-provided block", () => {
    const bucklerContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      relics: {
        bucklerFrame: {
          id: "bucklerFrame",
          name: "Buckler Frame",
          description: "Start each combat with +2 block.",
          kind: "combatStartBlock",
          value: 2,
        },
      },
      rewardCardPool: [],
      shopCardPool: [],
      enemies: {
        scout: {
          id: "scout",
          name: "Scout",
          maxHp: 6,
          goldReward: 10,
          intents: [{ kind: "attack", description: "Poke", damage: 1 }],
        },
        core: {
          id: "core",
          name: "Core",
          maxHp: 10,
          goldReward: 30,
          intents: [{ kind: "attack", description: "Pulse", damage: 2 }],
        },
      },
      starterDeck: ["strike", "strike", "strike", "strike", "strike"],
      map: [
        { id: "gate", kind: "battle", encounterId: "scout", relicReward: "bucklerFrame", nextIds: ["summit"] },
        { id: "summit", kind: "boss", encounterId: "core", nextIds: [] },
      ],
    };

    let state = createRun(bucklerContent, 50);
    const firstCombat = observeRun(bucklerContent, state);
    expect(firstCombat.phase).toBe("combat");
    expect(firstCombat.block).toBe(0);

    state = winCurrentCombat(bucklerContent, state);
    state = applyAction(bucklerContent, state, { type: "choosePath", nodeId: "summit" });
    const bossCombat = observeRun(bucklerContent, state);
    expect(bossCombat.phase).toBe("combat");
    expect(bossCombat.block).toBe(2);
    expect(bossCombat.enemy.block).toBe(0);
  });

  it("grants max HP immediately when acquiring a max HP relic", () => {
    const relicContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      relics: {
        reinforcedFrame: {
          id: "reinforcedFrame",
          name: "Reinforced Frame",
          description: "Gain 12 max HP.",
          kind: "maxHp",
          value: 12,
        },
      },
      rewardCardPool: [],
      shopCardPool: ["strike"],
      enemies: {
        scout: {
          id: "scout",
          name: "Scout",
          maxHp: 6,
          goldReward: 10,
          intents: [{ kind: "block", description: "Guard stance", block: 0 }],
        },
      },
      starterDeck: ["strike", "strike", "strike"],
      map: [{ id: "gate", kind: "battle", encounterId: "scout", relicReward: "reinforcedFrame", nextIds: [] }],
    };

    let state = createRun(relicContent, 22);
    state = winCurrentCombat(relicContent, state);

    expect(state.phase).toBe("victory");
    expect(state.maxHp).toBe(92);
    expect(state.hp).toBe(92);
    expect(state.relics).toContain("reinforcedFrame");
  });

  it("adds combat energy from relic effects", () => {
    const relicContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      relics: {
        combatFocus: {
          id: "combatFocus",
          name: "Combat Focus",
          description: "Gain 1 extra energy at the start of each combat.",
          kind: "combatEnergy",
          value: 1,
        },
      },
      rewardCardPool: [],
      shopCardPool: ["strike"],
      enemies: {
        scout: {
          id: "scout",
          name: "Scout",
          maxHp: 4,
          goldReward: 10,
          intents: [{ kind: "attack", description: "Hit for 2", damage: 2 }],
        },
        core: {
          id: "core",
          name: "Core",
          maxHp: 4,
          goldReward: 10,
          intents: [{ kind: "attack", description: "Blast for 2", damage: 2 }],
        },
      },
      starterDeck: ["strike", "strike", "strike"],
      map: [
        { id: "gate", kind: "battle", encounterId: "scout", relicReward: "combatFocus", nextIds: ["summit"] },
        { id: "summit", kind: "boss", encounterId: "core", nextIds: [] },
      ],
    };

    let state = createRun(relicContent, 23);
    state = winCurrentCombat(relicContent, state);
    state = applyAction(relicContent, state, { type: "choosePath", nodeId: "summit" });

    const combat = observeCombat(relicContent, state);
    expect(combat.phase).toBe("combat");
    expect(combat.energy).toBe(4);
  });

  it("applies rest healing bonus and shop discount through relics", () => {
    const restContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      relics: {
        medicinePack: {
          id: "medicinePack",
          name: "Medicine Pack",
          description: "Recover +3 HP from campfire recovery.",
          kind: "restHealBonus",
          value: 3,
        },
      },
      rewardCardPool: [],
      shopCardPool: ["strike"],
      enemies: {
        sentinel: {
          id: "sentinel",
          name: "Sentinel",
          maxHp: 6,
          goldReward: 24,
          intents: [{ kind: "attack", description: "Jab for 2", damage: 2 }],
        },
      },
      starterDeck: ["strike", "strike", "strike", "strike"],
      map: [
        { id: "gate", kind: "battle", encounterId: "sentinel", relicReward: "medicinePack", nextIds: ["camp"] },
        { id: "camp", kind: "rest", nextIds: ["market"] },
        { id: "market", kind: "shop", nextIds: [] },
      ],
    };

    let restRun = createRun(restContent, 24);
    restRun = winCurrentCombat(restContent, restRun);
    restRun = applyAction(restContent, restRun, { type: "choosePath", nodeId: "camp" });
    restRun = { ...restRun, hp: 10 };
    restRun = applyAction(restContent, restRun, { type: "chooseRest", optionId: "recover" });
    expect(restRun.hp).toBe(31);

    const discountContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      relics: {
        merchantTag: {
          id: "merchantTag",
          name: "Merchant Tag",
          description: "Shop cards cost 1 less.",
          kind: "shopDiscount",
          value: 1,
        },
      },
      rewardCardPool: [],
      shopCardPool: ["strike"],
      enemies: {
        sentinel: {
          id: "sentinel",
          name: "Sentinel",
          maxHp: 6,
          goldReward: 24,
          intents: [{ kind: "attack", description: "Jab for 2", damage: 2 }],
        },
      },
      starterDeck: ["strike", "strike", "strike", "strike"],
      map: [
        { id: "gate", kind: "battle", encounterId: "sentinel", relicReward: "merchantTag", nextIds: ["market"] },
        { id: "market", kind: "shop", nextIds: [] },
      ],
    };

    let shopRun = createRun(discountContent, 30);
    shopRun = winCurrentCombat(discountContent, shopRun);
    shopRun = applyAction(discountContent, shopRun, { type: "choosePath", nodeId: "market" });

    const shopView = observeRun(discountContent, shopRun);
    if (shopView.phase !== "shop") {
      throw new Error(`expected shop phase, received ${shopView.phase}`);
    }

    const bought = applyAction(discountContent, shopRun, { type: "buyShop", saleIndex: 0 });
    expect(bought.gold).toBe(shopRun.gold - 11);
  });
});

function observeCombat(runContent: RunContent, state: RunState): CombatObservation {
  const view = observeRun(runContent, state);

  if (view.phase !== "combat") {
    throw new Error(`expected combat phase, received ${view.phase}`);
  }

  return view;
}

function winCurrentCombat(runContent: RunContent, state: RunState): RunState {
  let nextState = state;

  while (nextState.phase === "combat") {
    const view = observeCombat(runContent, nextState);
    const strikeIndex = view.hand.findIndex((card) => card.id === "strike");
    const fallbackIndex = view.hand.findIndex((card) => card.cost <= view.energy);
    const chosenIndex = strikeIndex >= 0 ? strikeIndex : fallbackIndex;

    if (chosenIndex >= 0 && view.hand[chosenIndex].cost <= view.energy) {
      nextState = applyAction(runContent, nextState, { type: "playCard", handIndex: chosenIndex });
      continue;
    }

    nextState = applyAction(runContent, nextState, { type: "endTurn" });
  }

  return nextState;
}
