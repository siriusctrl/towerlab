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
    const state = applyAction(sampleContent, firstMapState(7), { type: "choosePath", nodeId: battleNode.id });
    const action = choosePolicyAction("greedy", state);
    const view = observeCombat(state);

    if (action.type !== "playCard") {
      throw new Error(`expected playCard, received ${action.type}`);
    }

    const chosenCard = view.hand[action.handIndex];
    const strongestPlayableDamage = view.hand
      .filter((card) => card.cost <= view.energy)
      .reduce((highest, card) => Math.max(highest, card.damage ?? 0), 0);

    expect(chosenCard?.damage ?? 0).toBe(strongestPlayableDamage);
  });

  it("greedy prefers the elite route from the opening map choice", () => {
    const state = firstMapState(7);
    const action = choosePolicyAction("greedy", state);

    if (action.type !== "choosePath") {
      throw new Error(`expected choosePath, received ${action.type}`);
    }

    expect(getNode(action.nodeId).kind).toBe("elite");
  });

  it("heuristic chooses a blessing before entering the act", () => {
    const state = createRun(sampleContent, 7);
    const action = choosePolicyAction("heuristic", state);

    if (action.type !== "chooseBlessing") {
      throw new Error(`expected chooseBlessing, received ${action.type}`);
    }

    expect(state.phase).toBe("blessing");
  });

  it("heuristic prefers the shop route when gold is available", () => {
    const state = gateMapState();
    const action = choosePolicyAction("heuristic", state);

    if (action.type !== "choosePath") {
      throw new Error(`expected choosePath, received ${action.type}`);
    }

    expect(getNode(action.nodeId).kind).toBe("shop");
  });

  it("heuristic removes a starter card in shop before buying", () => {
    const state = gateShopState();
    const action = choosePolicyAction("heuristic", state);

    if (action.type !== "removeDeckCard") {
      throw new Error(`expected removeDeckCard, received ${action.type}`);
    }

    expect(sampleContent.character.starterDeck).toContain(state.deck[action.deckIndex]?.cardId);
  });
});

function firstMapState(seed: number): RunState {
  const state = advanceOpeningBlessing(createRun(sampleContent, seed));

  if (state.phase !== "map") {
    throw new Error(`expected map phase, received ${state.phase}`);
  }

  return state;
}

function gateMapState(): RunState {
  const state = findMapStateWithNextKind("shop");

  if (state.phase !== "map") {
    throw new Error(`expected map phase, received ${state.phase}`);
  }

  return state;
}

function gateShopState(): RunState {
  const mapState = gateMapState();
  const shopNode = getImmediateNextByKind(mapState.currentNodeId, "shop");
  const state = applyAction(sampleContent, mapState, { type: "choosePath", nodeId: shopNode.id });

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
  const node = sampleMap.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new Error(`missing node ${nodeId}`);
  }
  return node;
}

function getOpeningChoiceByKind(kind: string) {
  const state = firstMapState(7);
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

function findMapStateWithNextKind(kind: string): RunState {
  for (let seed = 1; seed <= 40; seed += 1) {
    const initialState = advanceOpeningBlessing(createRun(sampleContent, seed));
    const queue: RunState[] = [initialState];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const observation = observeRun(sampleContent, current);
      const key = `${seed}:${current.phase}:${current.currentNodeId}:${current.floor}`;

      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      if (observation.phase === "map" && observation.nextNodes.some((candidate) => candidate.kind === kind)) {
        return current;
      }

      if (observation.phase !== "map") {
        continue;
      }

      for (const node of observation.nextNodes) {
        let next = applyAction(sampleContent, current, { type: "choosePath", nodeId: node.id });

        if (next.phase === "combat") {
          next = finishCombat(next);
        }

        if (next.phase === "reward") {
          next = applyAction(sampleContent, next, { type: "skipReward" });
        }

        if (next.phase === "rest") {
          const restObservation = observeRun(sampleContent, next);

          if (restObservation.phase === "rest") {
            next = applyAction(sampleContent, next, { type: "chooseRest", optionId: restObservation.restOptions[0]!.id });
          }
        }

        if (next.phase === "shop") {
          next = applyAction(sampleContent, next, { type: "leaveShop" });
        }

        if (next.phase === "map") {
          queue.push(next);
        }
      }
    }
  }

  throw new Error(`missing map state with next ${kind} option`);
}

function advanceOpeningBlessing(state: RunState): RunState {
  if (state.phase !== "blessing") {
    return state;
  }

  const blessingAction = legalActions(sampleContent, state).find(
    (action): action is Extract<RunAction, { type: "chooseBlessing" }> => action.type === "chooseBlessing",
  );

  if (!blessingAction) {
    throw new Error("missing opening blessing action");
  }

  return applyAction(sampleContent, state, blessingAction);
}

function getImmediateNextByKind(nodeId: string, kind: string) {
  const node = getNode(nodeId);
  const nextNode = node.nextIds.map((nextId) => getNode(nextId)).find((candidate) => candidate.kind === kind);

  if (!nextNode) {
    throw new Error(`missing ${kind} follow-up from ${nodeId}`);
  }

  return nextNode;
}

const sampleMap = sampleContent.acts[0]!.map;
