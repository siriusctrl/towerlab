import { describe, expect, it } from "vitest";

import { sampleContent } from "@towerlab/content";
import { applyAction, createRun, legalActions, observeRun, type RunAction, type RunState } from "@towerlab/core";

import { BASELINE_POLICY_NAMES, choosePolicyAction, getBaselinePolicy } from "./policies.js";

describe("baseline policies", () => {
  it("exports the expected policy names", () => {
    expect(BASELINE_POLICY_NAMES).toEqual(["random", "greedy", "heuristic"]);
    expect(getBaselinePolicy("greedy").name).toBe("greedy");
  });

  it("random stays deterministic for the same run state", () => {
    const state = createRun(sampleContent, 7);

    expect(choosePolicyAction("random", state)).toEqual(choosePolicyAction("random", state));
  });

  it("greedy prefers the highest-damage playable combat card", () => {
    const state = applyAction(sampleContent, createRun(sampleContent, 7), { type: "choosePath", nodeId: "gate" });
    const action = choosePolicyAction("greedy", state);
    const view = observeCombat(state);

    if (action.type !== "playCard") {
      throw new Error(`expected playCard, received ${action.type}`);
    }

    expect(view.hand[action.handIndex]?.id).toBe("heavyBlow");
  });

  it("greedy prefers the elite route from the opening map choice", () => {
    const state = createRun(sampleContent, 7);

    expect(choosePolicyAction("greedy", state)).toEqual({ type: "choosePath", nodeId: "forge" });
  });

  it("heuristic prefers the shop route when gold is available", () => {
    const state = gateMapState(7);

    expect(choosePolicyAction("heuristic", state)).toEqual({ type: "choosePath", nodeId: "market" });
  });

  it("heuristic removes a starter strike in shop before buying", () => {
    const state = gateShopState(7);
    const action = choosePolicyAction("heuristic", state);

    if (action.type !== "removeDeckCard") {
      throw new Error(`expected removeDeckCard, received ${action.type}`);
    }

    expect(state.deck[action.deckIndex]).toBe("strike");
  });
});

function firstMapState(seed: number): RunState {
  const state = createRun(sampleContent, seed);

  if (state.phase !== "map") {
    throw new Error(`expected map phase, received ${state.phase}`);
  }

  return state;
}

function gateMapState(seed: number): RunState {
  let state = firstMapState(seed);
  state = applyAction(sampleContent, state, { type: "choosePath", nodeId: "gate" });
  state = finishCombat(state);

  if (state.phase === "reward") {
    state = applyAction(sampleContent, state, { type: "skipReward" });
  }

  if (state.phase !== "map") {
    throw new Error(`expected map phase, received ${state.phase}`);
  }

  return state;
}

function gateShopState(seed: number): RunState {
  const state = applyAction(sampleContent, gateMapState(seed), { type: "choosePath", nodeId: "market" });

  if (state.phase !== "shop") {
    throw new Error(`expected shop phase, received ${state.phase}`);
  }

  return state;
}

function finishCombat(state: RunState): RunState {
  let nextState = state;

  while (nextState.phase === "combat") {
    const action = chooseFirstPlayableAction(nextState);
    nextState = applyAction(sampleContent, nextState, action);
  }

  return nextState;
}

function chooseFirstPlayableAction(state: RunState): RunAction {
  const playableAction = legalActions(sampleContent, state).find((action) => action.type === "playCard");
  return playableAction ?? { type: "endTurn" };
}

function observeCombat(state: RunState) {
  const observation = observeRun(sampleContent, state);

  if (observation.phase !== "combat") {
    throw new Error(`expected combat phase, received ${observation.phase}`);
  }

  return observation;
}
