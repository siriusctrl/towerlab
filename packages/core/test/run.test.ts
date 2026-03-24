import { describe, expect, it } from "vitest";

import {
  applyAction,
  createRun,
  observeRun,
  type CombatObservation,
  type RunContent,
  type RunState,
} from "../src/index.js";

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
      intents: [
        { kind: "attack", description: "Beam for 8", damage: 8 },
      ],
    },
  },
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
    const first = observeCombat(createRun(content, 7));
    const second = observeCombat(createRun(content, 8));

    expect(first.hand.map((card) => card.id)).not.toEqual(second.hand.map((card) => card.id));
  });
});

describe("run progression", () => {
  it("moves from combat to map to rest", () => {
    let state = createRun(content, 7);

    state = winCurrentCombat(state);
    expect(state.phase).toBe("map");

    state = applyAction(content, state, { type: "choosePath", nodeId: "camp" });
    const restView = observeRun(content, state);

    expect(restView.phase).toBe("rest");
    expect(restView.currentNode.id).toBe("camp");
  });

  it("applies the fortify rest option and keeps the run going", () => {
    let state = createRun(content, 7);

    state = winCurrentCombat(state);
    state = applyAction(content, state, { type: "choosePath", nodeId: "camp" });
    const hpBeforeRest = state.hp;
    state = applyAction(content, state, { type: "chooseRest", optionId: "fortify" });

    expect(state.phase).toBe("map");
    expect(state.maxHp).toBe(85);
    expect(state.hp).toBe(hpBeforeRest + 5);
  });
});

function observeCombat(state: RunState): CombatObservation {
  const view = observeRun(content, state);

  if (view.phase !== "combat") {
    throw new Error(`expected combat phase, received ${view.phase}`);
  }

  return view;
}

function winCurrentCombat(state: RunState): RunState {
  let nextState = state;

  while (nextState.phase === "combat") {
    const view = observeCombat(nextState);
    const heavyIndex = view.hand.findIndex((card) => card.id === "heavy");
    const strikeIndex = view.hand.findIndex((card) => card.id === "strike");
    const chosenIndex = heavyIndex >= 0 ? heavyIndex : strikeIndex;

    if (chosenIndex >= 0 && view.hand[chosenIndex].cost <= view.energy) {
      nextState = applyAction(content, nextState, { type: "playCard", handIndex: chosenIndex });
      continue;
    }

    nextState = applyAction(content, nextState, { type: "endTurn" });
  }

  return nextState;
}
