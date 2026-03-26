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
    const battleNode = getOpeningChoiceByKind("battle");
    const state = applyAction(sampleContent, createRun(sampleContent, 7), { type: "choosePath", nodeId: battleNode.id });
    const action = choosePolicyAction("greedy", state);
    const view = observeCombat(state);

    if (action.type !== "playCard") {
      throw new Error(`expected playCard, received ${action.type}`);
    }

    expect(view.hand[action.handIndex]?.id).toBe("heavyBlow");
  });

  it("greedy prefers the elite route from the opening map choice", () => {
    const state = createRun(sampleContent, 7);
    const action = choosePolicyAction("greedy", state);

    expect(action.type).toBe("choosePath");
    expect(getNode(action.nodeId).kind).toBe("elite");
  });

  it("heuristic prefers the shop route when gold is available", () => {
    const state = gateMapState(7);
    const action = choosePolicyAction("heuristic", state);

    expect(action.type).toBe("choosePath");
    expect(getNode(action.nodeId).kind).toBe("shop");
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
  state = applyAction(sampleContent, state, { type: "choosePath", nodeId: getBattleChoiceWithShopFollowUp().id });
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
  const shopNode = getImmediateNextByKind(getBattleChoiceWithShopFollowUp().id, "shop");
  const state = applyAction(sampleContent, gateMapState(seed), { type: "choosePath", nodeId: shopNode.id });

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

function getNode(nodeId: string) {
  const node = sampleContent.map.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new Error(`missing node ${nodeId}`);
  }
  return node;
}

function getOpeningChoiceByKind(kind: string) {
  const state = createRun(sampleContent, 7);
  const observation = observeRun(sampleContent, state);

  if (observation.phase !== "map") {
    throw new Error(`expected map phase, received ${observation.phase}`);
  }

  const node = observation.nextNodes.find((candidate) => candidate.kind === kind);
  if (!node) {
    throw new Error(`missing opening ${kind} node`);
  }

  return node;
}

function getBattleChoiceWithShopFollowUp() {
  const openingBattles = createRun(sampleContent, 7);
  const observation = observeRun(sampleContent, openingBattles);

  if (observation.phase !== "map") {
    throw new Error(`expected map phase, received ${observation.phase}`);
  }

  const node = observation.nextNodes.find(
    (candidate) => candidate.kind === "battle" && candidate.nextIds.some((nextId) => getNode(nextId).kind === "shop"),
  );

  if (!node) {
    throw new Error("missing battle route that leads to a shop");
  }

  return node;
}

function getImmediateNextByKind(nodeId: string, kind: string) {
  const node = getNode(nodeId);
  const nextNode = node.nextIds.map((nextId) => getNode(nextId)).find((candidate) => candidate.kind === kind);

  if (!nextNode) {
    throw new Error(`missing ${kind} follow-up from ${nodeId}`);
  }

  return nextNode;
}
