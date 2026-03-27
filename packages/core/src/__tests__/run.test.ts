import { describe, expect, it } from "vitest";

import {
  applyAction,
  createRun,
  observeRun,
  type CombatObservation,
  type MapNode,
  type RunContent,
  type RunState,
} from "../index.js";

const content: RunContent = {
  cards: {
    strike: {
      id: "strike",
      name: "Strike",
      cost: 1,
      description: "Deal 6 damage.",
      damage: 6,
      base: { cost: 1, description: "Deal 6 damage.", damage: 6 },
      upgraded: { cost: 1, description: "Deal 9 damage.", damage: 9 },
    },
    defend: {
      id: "defend",
      name: "Defend",
      cost: 1,
      description: "Gain 5 block.",
      block: 5,
      base: { cost: 1, description: "Gain 5 block.", block: 5 },
      upgraded: { cost: 1, description: "Gain 8 block.", block: 8 },
    },
    surge: {
      id: "surge",
      name: "Surge",
      cost: 1,
      description: "Deal 4 damage. Gain 4 block.",
      damage: 4,
      block: 4,
      base: { cost: 1, description: "Deal 4 damage. Gain 4 block.", damage: 4, block: 4 },
      upgraded: { cost: 1, description: "Deal 7 damage. Gain 7 block.", damage: 7, block: 7 },
    },
    heavy: {
      id: "heavy",
      name: "Heavy",
      cost: 2,
      description: "Deal 11 damage.",
      damage: 11,
      base: { cost: 2, description: "Deal 11 damage.", damage: 11 },
      upgraded: { cost: 2, description: "Deal 15 damage.", damage: 15 },
    },
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
  relics: {
    starterCharm: {
      id: "starterCharm",
      name: "Starter Charm",
      description: "Starting relic for tests.",
      kind: "maxHp",
      value: 1,
    },
  },
  character: createCharacter(
    ["strike", "strike", "strike", "defend", "defend", "defend", "surge", "surge", "heavy", "heavy"],
    [],
    [],
  ),
  acts: [createAct([
    { id: "gate", kind: "battle", encounterId: "scout", nextIds: ["camp"] },
    { id: "camp", kind: "rest", nextIds: ["summit"] },
    { id: "summit", kind: "boss", encounterId: "core", nextIds: [] },
  ])],
};

describe("createRun", () => {
  it("produces the same opening blessing state for the same seed", () => {
    const first = createRun(content, 7);
    const second = createRun(content, 7);
    const firstView = observeRun(content, first);
    const secondView = observeRun(content, second);

    expect(first.phase).toBe("blessing");
    expect(second.phase).toBe("blessing");
    expect(firstView).toEqual(secondView);
  });

  it("changes the opening hand for a different seed once combat begins", () => {
    const first = observeCombat(content, enterOpeningCombat(content, createRun(content, 7)));
    const second = observeCombat(content, enterOpeningCombat(content, createRun(content, 8)));

    expect(first.hand.map((card) => card.id)).not.toEqual(second.hand.map((card) => card.id));
  });
});

describe("card effects", () => {
  it("draws cards when a played card has draw", () => {
    const drawContent: RunContent = {
      cards: {
        drawShift: { id: "drawShift", name: "Draw Shift", cost: 0, description: "Draw 1 card.", draw: 1 },
      },
      enemies: {
        drone: {
          id: "drone",
          name: "Drone",
          maxHp: 50,
          goldReward: 10,
          intents: [{ kind: "attack", description: "Peck for 1", damage: 1 }],
        },
      },
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
      },
      character: createCharacter(["drawShift", "drawShift", "drawShift", "drawShift", "drawShift"]),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "drone", nextIds: [] }])],
    };

    let state = enterOpeningCombat(drawContent, createRun(drawContent, 101));
    const combat = observeCombat(drawContent, state);
    const drawnIndex = combat.hand.findIndex((card) => card.id === "drawShift");

    expect(drawnIndex).toBeGreaterThanOrEqual(0);

    state = applyAction(drawContent, state, { type: "playCard", handIndex: drawnIndex });
    const after = observeCombat(drawContent, state);
    const logEvent = state.log[state.log.length - 1];

    expect(after.hand).toHaveLength(5);
    expect(after.drawPileCount).toBe(0);
    expect(after.discardPileCount).toBe(0);
    expect(logEvent).toMatchObject({ type: "playedCard", cardId: "drawShift", effects: [{ type: "draw", amount: 1 }] });
  });

  it("gains extra energy when a played card has energy", () => {
    const energyContent: RunContent = {
      cards: {
        charge: { id: "charge", name: "Charge", cost: 0, description: "Gain 2 energy.", energy: 2 },
      },
      enemies: {
        drone: {
          id: "drone",
          name: "Drone",
          maxHp: 50,
          goldReward: 10,
          intents: [{ kind: "attack", description: "Peck for 1", damage: 1 }],
        },
      },
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
      },
      character: createCharacter(["charge", "charge", "charge", "charge", "charge"]),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "drone", nextIds: [] }])],
    };

    let state = enterOpeningCombat(energyContent, createRun(energyContent, 102));
    const combat = observeCombat(energyContent, state);
    const chargeIndex = combat.hand.findIndex((card) => card.id === "charge");

    expect(chargeIndex).toBeGreaterThanOrEqual(0);
    expect(combat.energy).toBe(3);

    state = applyAction(energyContent, state, { type: "playCard", handIndex: chargeIndex });
    const after = observeCombat(energyContent, state);
    const logEvent = state.log[state.log.length - 1];

    expect(after.energy).toBe(5);
    expect(logEvent).toMatchObject({ type: "playedCard", cardId: "charge", effects: [{ type: "energy", amount: 2 }] });
  });

  it("restores hp when a played card has heal", () => {
    const healContent: RunContent = {
      cards: {
        medicate: { id: "medicate", name: "Medicate", cost: 0, description: "Recover 5 HP.", heal: 5 },
      },
      enemies: {
        drone: {
          id: "drone",
          name: "Drone",
          maxHp: 50,
          goldReward: 10,
          intents: [{ kind: "attack", description: "Peck for 1", damage: 1 }],
        },
      },
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
      },
      character: createCharacter(["medicate", "medicate", "medicate", "medicate", "medicate"]),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "drone", nextIds: [] }])],
    };

    let state = enterOpeningCombat(healContent, createRun(healContent, 103));
    state = { ...state, hp: 70 };
    const combat = observeCombat(healContent, state);
    const medicateIndex = combat.hand.findIndex((card) => card.id === "medicate");

    expect(medicateIndex).toBeGreaterThanOrEqual(0);

    state = applyAction(healContent, state, { type: "playCard", handIndex: medicateIndex });
    const logEvent = state.log[state.log.length - 1];

    expect(state.hp).toBe(75);
    expect(logEvent).toMatchObject({ type: "playedCard", cardId: "medicate", effects: [{ type: "heal", amount: 5 }] });
  });

  it("does not discard exhausted cards into the discard pile", () => {
    const exhaustContent: RunContent = {
      cards: {
        burn: { id: "burn", name: "Burn", cost: 0, description: "Exhaust this card.", exhaust: true },
      },
      enemies: {
        drone: {
          id: "drone",
          name: "Drone",
          maxHp: 50,
          goldReward: 10,
          intents: [{ kind: "attack", description: "Peck for 1", damage: 1 }],
        },
      },
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
      },
      character: createCharacter(["burn", "burn", "burn", "burn", "burn"]),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "drone", nextIds: [] }])],
    };

    let state = enterOpeningCombat(exhaustContent, createRun(exhaustContent, 104));
    const combat = observeCombat(exhaustContent, state);
    const burnIndex = combat.hand.findIndex((card) => card.id === "burn");

    expect(burnIndex).toBeGreaterThanOrEqual(0);

    state = applyAction(exhaustContent, state, { type: "playCard", handIndex: burnIndex });
    const after = observeCombat(exhaustContent, state);
    const logEvent = state.log[state.log.length - 1];

    expect(after.hand).toHaveLength(4);
    expect(after.discardPileCount).toBe(0);
    expect(state.combat?.discardPile).not.toContain("burn");
    expect(logEvent).toMatchObject({ type: "playedCard", cardId: "burn", effects: [{ type: "exhaust" }] });
  });

  it("keeps retained cards in hand and only refills the empty slots next turn", () => {
    const retainContent: RunContent = {
      cards: {
        hold: {
          id: "hold",
          name: "Hold",
          cost: 1,
          description: "Gain 5 block.",
          keywords: ["retain"],
          block: 5,
          retain: true,
        },
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      enemies: {
        drone: {
          id: "drone",
          name: "Drone",
          maxHp: 50,
          goldReward: 10,
          intents: [{ kind: "attack", description: "Peck for 1", damage: 1 }],
        },
      },
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
      },
      character: createCharacter(["hold", "strike", "strike", "strike", "strike", "strike"]),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "drone", nextIds: [] }])],
    };

    let state = enterOpeningCombat(retainContent, createRun(retainContent, 105));
    const openingDeck = takeCardInstances(state.deck, ["hold", "strike", "strike", "strike", "strike", "strike"]);

    state = {
      ...state,
      combat: {
        ...state.combat!,
        hand: openingDeck.slice(0, 2),
        drawPile: openingDeck.slice(2),
        discardPile: [],
        turn: 1,
      },
    };

    state = applyAction(retainContent, state, { type: "endTurn" });
    const after = observeCombat(retainContent, state);

    expect(state.combat?.turn).toBe(2);
    expect(after.hand.map((card) => card.id)).toEqual(["hold", "strike", "strike", "strike", "strike"]);
    expect(after.drawPileCount).toBe(0);
    expect(after.discardPileCount).toBe(1);
    expect(state.combat?.discardPile.map((card) => card.cardId)).toEqual(["strike"]);
  });

  it("exhausts ethereal cards left in hand at end of turn", () => {
    const etherealContent: RunContent = {
      cards: {
        flare: {
          id: "flare",
          name: "Flare",
          cost: 1,
          description: "Deal 8 damage.",
          damage: 8,
          keywords: ["ethereal"],
        },
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      enemies: {
        drone: {
          id: "drone",
          name: "Drone",
          maxHp: 50,
          goldReward: 10,
          intents: [{ kind: "attack", description: "Peck for 1", damage: 1 }],
        },
      },
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
      },
      character: createCharacter(["flare", "strike", "strike", "strike", "strike"]),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "drone", nextIds: [] }])],
    };

    let state = enterOpeningCombat(etherealContent, createRun(etherealContent, 111));
    const openingDeck = takeCardInstances(state.deck, ["flare", "strike", "strike", "strike", "strike"]);
    state = {
      ...state,
      combat: {
        ...state.combat!,
        hand: openingDeck.slice(0, 2),
        drawPile: openingDeck.slice(2),
        discardPile: [],
        exhaustPile: [],
        turn: 1,
      },
    };

    state = applyAction(etherealContent, state, { type: "endTurn" });

    expect(state.combat?.exhaustPile.map((card) => card.cardId)).toEqual(["flare"]);
    expect(state.combat?.hand.map((card) => card.cardId)).not.toContain("flare");
    expect(state.combat?.drawPile.map((card) => card.cardId)).not.toContain("flare");
    expect(state.combat?.discardPile.map((card) => card.cardId)).not.toContain("flare");
  });

  it("applies weak, vulnerable, and poison through structured combat fields", () => {
    const statusContent: RunContent = {
      cards: {
        venom: { id: "venom", name: "Venom", cost: 1, description: "Deal 6 damage. Apply 3 Poison.", damage: 6, poison: 3 },
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 8 damage.", damage: 8 },
      },
      enemies: {
        drone: {
          id: "drone",
          name: "Drone",
          maxHp: 40,
          goldReward: 10,
          intents: [{ kind: "attack", description: "Peck for 1", damage: 1 }],
        },
      },
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
      },
      character: createCharacter(["venom", "strike", "strike", "strike", "strike"]),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "drone", nextIds: [] }])],
    };

    let state = enterOpeningCombat(statusContent, createRun(statusContent, 106));
    const openingDeck = takeCardInstances(state.deck, ["venom", "strike", "strike", "strike", "strike"]);
    state = {
      ...state,
      combat: {
        ...state.combat!,
        hand: openingDeck.slice(0, 2),
        drawPile: [],
        discardPile: [],
        status: { weak: 1, vulnerable: 0, poison: 0 },
        enemy: {
          ...state.combat!.enemy,
          status: { weak: 0, vulnerable: 1, poison: 0 },
        },
      },
    };

    state = applyAction(statusContent, state, { type: "playCard", handIndex: 0 });
    expect(state.combat?.enemy.hp).toBe(34);
    expect(state.combat?.enemy.status.poison).toBe(3);

    state = applyAction(statusContent, state, { type: "endTurn" });
    expect(state.combat?.enemy.hp).toBe(31);
    expect(state.combat?.enemy.status.poison).toBe(2);
    expect(state.combat?.status.weak).toBe(0);
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

  it("upgrades a deck card at rest and keeps the run going", () => {
    let state = createRun(content, 7);

    state = winCurrentCombat(content, state);
    state = applyAction(content, state, { type: "choosePath", nodeId: "camp" });
    const restView = observeRun(content, state);

    if (restView.phase !== "rest") {
      throw new Error(`expected rest phase, received ${restView.phase}`);
    }

    const target = restView.upgradableDeckCards.find((entry) => entry.card.id === "strike");

    if (!target) {
      throw new Error("expected an upgradable strike at rest");
    }

    expect(target.upgradedCard.damage).toBeGreaterThan(target.card.damage);

    state = applyAction(content, state, { type: "chooseRest", optionId: "upgrade" });
    state = applyAction(content, state, { type: "upgradeRestCard", deckIndex: target.deckIndex });

    expect(state.phase).toBe("map");
    expect(state.deck[target.deckIndex]?.upgraded).toBe(true);
  });

  it("supports route tradeoffs through battle, elite, rest, and shop", () => {
    const tradeoffContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
      },
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
      character: createCharacter(["strike", "strike", "strike", "strike", "strike"], [], []),
      acts: [createAct([
        { id: "gate", kind: "battle", encounterId: "guard", nextIds: ["forge", "hall"] },
        { id: "hall", kind: "battle", encounterId: "watchman", nextIds: ["rest", "market"] },
        { id: "forge", kind: "elite", encounterId: "warden", nextIds: ["market"] },
        { id: "rest", kind: "rest", nextIds: ["summit"] },
        { id: "market", kind: "shop", nextIds: ["summit"] },
        { id: "summit", kind: "boss", encounterId: "core", nextIds: [] },
      ])],
    };

    let state = beginAct(tradeoffContent, createRun(tradeoffContent, 101));
    state = enterOpeningCombat(tradeoffContent, state);
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
    state = beginAct(tradeoffContent, state);
    state = enterOpeningCombat(tradeoffContent, state);
    state = applyAction(tradeoffContent, winCurrentCombat(tradeoffContent, state), { type: "choosePath", nodeId: "hall" });

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
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
      },
      enemies: {
        patrol: {
          id: "patrol",
          name: "Patrol",
          maxHp: 8,
          goldReward: 12,
          intents: [{ kind: "attack", description: "Stab for 2", damage: 2 }],
        },
      },
      character: createCharacter(["strike", "strike", "defend"], ["strike", "defend", "surge"], []),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "patrol", nextIds: [] }])],
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
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
      },
      enemies: {
        patrol: {
          id: "patrol",
          name: "Patrol",
          maxHp: 8,
          goldReward: 12,
          intents: [{ kind: "attack", description: "Stab for 2", damage: 2 }],
        },
      },
      character: createCharacter(["strike", "strike", "defend"], ["strike", "defend", "surge"], []),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "patrol", nextIds: [] }])],
    };

    let state = createRun(rewardContent, 16);
    state = winCurrentCombat(rewardContent, state);
    const rewardView = observeRun(rewardContent, state);
    if (rewardView.phase !== "reward") {
      throw new Error(`expected reward phase, received ${rewardView.phase}`);
    }

    const chosenCard = rewardView.cardChoices[0];
    const afterReward = applyAction(rewardContent, state, { type: "takeReward", rewardIndex: 0 });

    expect(afterReward.deck.some((card) => card.cardId === chosenCard.id && !card.upgraded)).toBe(true);
    expect(afterReward.deck.length).toBe(rewardContent.character.starterDeck.length + 1);
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
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
      },
      enemies: {
        vendor: {
          id: "vendor",
          name: "Vendor",
          maxHp: 6,
          goldReward: 24,
          intents: [{ kind: "attack", description: "Nip for 1", damage: 1 }],
        },
      },
      character: createCharacter(["strike", "strike", "defend", "surge"], [], ["strike", "defend", "surge"]),
      acts: [createAct([
        { id: "gate", kind: "battle", encounterId: "vendor", nextIds: ["market"] },
        { id: "market", kind: "shop", nextIds: [] },
      ])],
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
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
        bucklerFrame: {
          id: "bucklerFrame",
          name: "Buckler Frame",
          description: "Start each combat with +2 block.",
          kind: "combatStartBlock",
          value: 2,
        },
      },
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
      character: createCharacter(["strike", "strike", "strike", "strike", "strike"], [], []),
      acts: [createAct([
        { id: "gate", kind: "battle", encounterId: "scout", relicReward: "bucklerFrame", nextIds: ["summit"] },
        { id: "summit", kind: "boss", encounterId: "core", nextIds: [] },
      ])],
    };

    let state = enterOpeningCombat(bucklerContent, createRun(bucklerContent, 50));
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
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
        reinforcedFrame: {
          id: "reinforcedFrame",
          name: "Reinforced Frame",
          description: "Gain 12 max HP.",
          kind: "maxHp",
          value: 12,
        },
      },
      enemies: {
        scout: {
          id: "scout",
          name: "Scout",
          maxHp: 6,
          goldReward: 10,
          intents: [{ kind: "block", description: "Guard stance", block: 0 }],
        },
      },
      character: createCharacter(["strike", "strike", "strike"], [], ["strike"]),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "scout", relicReward: "reinforcedFrame", nextIds: [] }])],
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
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
        combatFocus: {
          id: "combatFocus",
          name: "Combat Focus",
          description: "Gain 1 extra energy at the start of each combat.",
          kind: "combatEnergy",
          value: 1,
        },
      },
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
      character: createCharacter(["strike", "strike", "strike"], [], ["strike"]),
      acts: [createAct([
        { id: "gate", kind: "battle", encounterId: "scout", relicReward: "combatFocus", nextIds: ["summit"] },
        { id: "summit", kind: "boss", encounterId: "core", nextIds: [] },
      ])],
    };

    let state = createRun(relicContent, 23);
    state = winCurrentCombat(relicContent, state);
    state = applyAction(relicContent, state, { type: "choosePath", nodeId: "summit" });

    const combat = observeCombat(relicContent, state);
    expect(combat.phase).toBe("combat");
    expect(combat.energy).toBe(4);
    expect(combat.baseEnergy).toBe(4);
  });

  it("draws extra opening cards from combat-start draw relics", () => {
    const drawRelicContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      relics: {
        snakeRing: {
          id: "snakeRing",
          name: "Snake Ring",
          description: "Draw 2 extra cards at the start of each combat.",
          kind: "combatStartDraw",
          value: 2,
        },
      },
      enemies: {
        sentinel: {
          id: "sentinel",
          name: "Sentinel",
          maxHp: 20,
          goldReward: 12,
          intents: [{ kind: "attack", description: "Jab for 2", damage: 2 }],
        },
      },
      character: createCharacter(["strike", "strike", "strike", "strike", "strike", "strike", "strike"], [], [], "snakeRing"),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "sentinel", nextIds: [] }])],
    };

    const combat = observeCombat(drawRelicContent, enterOpeningCombat(drawRelicContent, createRun(drawRelicContent, 107)));

    expect(combat.hand).toHaveLength(7);
  });

  it("heals after combat and can poison the enemy from relics", () => {
    const relicContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      relics: {
        burningBlood: {
          id: "burningBlood",
          name: "Burning Blood",
          description: "Recover 4 HP after each combat.",
          kind: "postCombatHeal",
          value: 4,
        },
        toxicVial: {
          id: "toxicVial",
          name: "Toxic Vial",
          description: "Apply 2 Poison to the enemy at the start of each combat.",
          kind: "combatStartPoison",
          value: 2,
        },
      },
      enemies: {
        sentinel: {
          id: "sentinel",
          name: "Sentinel",
          maxHp: 6,
          goldReward: 12,
          intents: [{ kind: "attack", description: "Jab for 2", damage: 2 }],
        },
      },
      character: createCharacter(["strike", "strike", "strike", "strike"], [], [], "burningBlood"),
      acts: [createAct([{ id: "gate", kind: "battle", encounterId: "sentinel", nextIds: [] }])],
    };

    let state = createRun(relicContent, 108);
    state = { ...state, hp: 60, relics: ["burningBlood", "toxicVial"] };
    state = enterOpeningCombat(relicContent, state);

    expect(state.combat?.enemy.status.poison).toBe(2);

    state = winCurrentCombat(relicContent, state);
    expect(state.hp).toBe(65);
  });

  it("applies rest healing bonus and shop discount through relics", () => {
    const restContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
        medicinePack: {
          id: "medicinePack",
          name: "Medicine Pack",
          description: "Recover +3 HP from campfire recovery.",
          kind: "restHealBonus",
          value: 3,
        },
      },
      enemies: {
        sentinel: {
          id: "sentinel",
          name: "Sentinel",
          maxHp: 6,
          goldReward: 24,
          intents: [{ kind: "attack", description: "Jab for 2", damage: 2 }],
        },
      },
      character: createCharacter(["strike", "strike", "strike", "strike"], [], ["strike"]),
      acts: [createAct([
        { id: "gate", kind: "battle", encounterId: "sentinel", relicReward: "medicinePack", nextIds: ["camp"] },
        { id: "camp", kind: "rest", nextIds: ["market"] },
        { id: "market", kind: "shop", nextIds: [] },
      ])],
    };

    let restRun = createRun(restContent, 24);
    restRun = winCurrentCombat(restContent, restRun);
    restRun = applyAction(restContent, restRun, { type: "choosePath", nodeId: "camp" });
    restRun = { ...restRun, hp: 10 };
    restRun = applyAction(restContent, restRun, { type: "chooseRest", optionId: "recover" });
    expect(restRun.hp).toBe(37);

    const discountContent: RunContent = {
      cards: {
        strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      },
      relics: {
        starterCharm: {
          id: "starterCharm",
          name: "Starter Charm",
          description: "Starting relic for tests.",
          kind: "maxHp",
          value: 1,
        },
        merchantTag: {
          id: "merchantTag",
          name: "Merchant Tag",
          description: "Shop cards cost 1 less.",
          kind: "shopDiscount",
          value: 1,
        },
      },
      enemies: {
        sentinel: {
          id: "sentinel",
          name: "Sentinel",
          maxHp: 6,
          goldReward: 24,
          intents: [{ kind: "attack", description: "Jab for 2", damage: 2 }],
        },
      },
      character: createCharacter(["strike", "strike", "strike", "strike"], [], ["strike"]),
      acts: [createAct([
        { id: "gate", kind: "battle", encounterId: "sentinel", relicReward: "merchantTag", nextIds: ["market"] },
        { id: "market", kind: "shop", nextIds: [] },
      ])],
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

function beginAct(runContent: RunContent, state: RunState): RunState {
  if (state.phase !== "blessing") {
    return state;
  }

  return applyAction(runContent, state, { type: "chooseBlessing", blessingId: runContent.acts[state.act - 1]!.blessings[0]!.id });
}

function enterOpeningCombat(runContent: RunContent, state: RunState): RunState {
  let nextState = beginAct(runContent, state);

  if (nextState.phase === "map") {
    const currentNode = runContent.acts[nextState.act - 1]!.map.find((node) => node.id === nextState.currentNodeId)!;
    nextState = applyAction(runContent, nextState, { type: "choosePath", nodeId: currentNode.nextIds[0]! });
  }

  return nextState;
}

function winCurrentCombat(runContent: RunContent, state: RunState): RunState {
  let nextState = enterOpeningCombat(runContent, state);

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

function createAct(map: MapNode[]) {
  return {
    id: "act-1",
    map: [{ id: "start", kind: "start", nextIds: [map[0]!.id] }, ...map],
    blessings: [{ id: "act-1-heal", kind: "heal" as const, value: 1 }],
  };
}

function createCharacter(
  starterDeck: string[],
  rewardPool: string[] = [],
  shopPool: string[] = [],
  startingRelicId = "starterCharm",
) {
  const blessingCard = rewardPool[0] ?? shopPool[0] ?? starterDeck[0]!;

  return {
    id: "test",
    name: "Test",
    summary: "Test character.",
    maxHp: 80,
    startGold: 0,
    starterDeck,
    startingRelicId,
    blessingCards: [blessingCard, blessingCard, blessingCard],
    rewardCardPools: { common: rewardPool, rare: [], epic: [] },
    shopCardPools: { common: shopPool, rare: [], epic: [] },
    relicPools: { elite: [], boss: [] },
  };
}

function takeCardInstances(deck: RunState["deck"], cardIds: string[]): RunState["deck"] {
  const remaining = [...deck];

  return cardIds.map((cardId) => {
    const index = remaining.findIndex((card) => card.cardId === cardId);

    if (index < 0) {
      throw new Error(`missing test card instance for ${cardId}`);
    }

    return remaining.splice(index, 1)[0]!;
  });
}
