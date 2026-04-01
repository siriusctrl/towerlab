import { describe, expect, it } from "vitest";

import {
  applyAction,
  createRun,
  legalActions,
  observeRun,
  replayRun,
  traceRun,
  type MapNode,
  type RunAction,
  type RunContent,
  type RunState,
} from "../index.js";

const content: RunContent = {
  cards: {
    strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
    defend: { id: "defend", name: "Defend", cost: 1, description: "Gain 5 block.", block: 5 },
    bash: { id: "bash", name: "Bash", cost: 2, description: "Deal 9 damage.", damage: 9 },
    overload: { id: "overload", name: "Overload", cost: 4, description: "Deal 20 damage.", damage: 20 },
  },
  enemies: {
    scout: {
      id: "scout",
      name: "Scout",
      maxHp: 12,
      goldReward: 12,
      intents: [{ kind: "attack", description: "Poke for 2", damage: 2 }],
    },
    captain: {
      id: "captain",
      name: "Captain",
      maxHp: 18,
      goldReward: 14,
      intents: [{ kind: "attack", description: "Strike for 3", damage: 3 }],
    },
    core: {
      id: "core",
      name: "Core",
      maxHp: 12,
      goldReward: 25,
      intents: [{ kind: "attack", description: "Pulse for 3", damage: 3 }],
    },
  },
  relics: {
    starterCharm: {
      id: "starterCharm",
      name: "Starter Charm",
      description: "Gain 1 max HP.",
      kind: "maxHp",
      value: 1,
    },
    openingToken: {
      id: "openingToken",
      name: "Opening Token",
      description: "Test blessing relic.",
      kind: "restHealBonus",
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
  character: createCharacter(
    ["strike", "defend", "bash", "overload", "strike"],
    ["bash", "defend", "strike"],
    ["bash", "strike"],
  ),
  acts: [createAct([
    { id: "gate", kind: "battle", encounterId: "scout", nextIds: ["camp", "market"] },
    { id: "camp", kind: "rest", nextIds: ["summit"] },
    { id: "market", kind: "shop", nextIds: ["summit"] },
    { id: "summit", kind: "boss", encounterId: "core", nextIds: [] },
  ])],
};

describe("legalActions", () => {
  it("enumerates opening blessing actions before entering the act", () => {
    const state = createRun(content, 5);

    expect(legalActions(content, state)).toEqual([{ type: "chooseBlessing", blessingId: "act-1-heal" }]);
  });

  it("enumerates playable combat actions plus endTurn", () => {
    const state = enterOpeningCombat(content, createRun(content, 5));
    const view = observeRun(content, state);
    const actions = legalActions(content, state);

    if (view.phase !== "combat") {
      throw new Error(`expected combat phase, received ${view.phase}`);
    }

    const overloadIndex = view.hand.findIndex((card) => card.id === "overload");
    const affordableIndexes = view.hand
      .map((card, handIndex) => (card.cost <= view.energy ? handIndex : null))
      .filter((handIndex): handIndex is number => handIndex !== null);

    expect(actions).toContainEqual({ type: "endTurn" });
    for (const handIndex of affordableIndexes) {
      expect(actions).toContainEqual({ type: "playCard", handIndex });
    }
    expect(overloadIndex).toBeGreaterThanOrEqual(0);
    expect(actions).not.toContainEqual({ type: "playCard", handIndex: overloadIndex });
    expect(actions.every((action) => action.type === "playCard" || action.type === "endTurn")).toBe(true);
  });

  it("enumerates route, rest, reward, shop, and terminal actions", () => {
    let state = createRun(content, 5);
    state = winCurrentCombat(content, state);

    const rewardState = state;
    expect(legalActions(content, rewardState)).toEqual([
      { type: "takeReward", rewardIndex: 0 },
      { type: "takeReward", rewardIndex: 1 },
      { type: "skipReward" },
    ]);

    state = applyAction(content, state, { type: "takeReward", rewardIndex: 0 });
    state = applyAction(content, state, { type: "skipReward" });

    expect(legalActions(content, state)).toEqual([
      { type: "choosePath", nodeId: "camp" },
      { type: "choosePath", nodeId: "market" },
    ]);

    const restState = applyAction(content, state, { type: "choosePath", nodeId: "camp" });
    expect(legalActions(content, restState)).toEqual([
      { type: "chooseRest", optionId: "recover" },
      { type: "chooseRest", optionId: "upgrade" },
    ]);

    const shopState = applyAction(content, state, { type: "choosePath", nodeId: "market" });
    expect(legalActions(content, shopState)).toEqual([
      { type: "buyShop", saleIndex: 0 },
      { type: "buyShop", saleIndex: 1 },
      { type: "leaveShop" },
    ]);

    const brokeShopState: RunState = {
      ...shopState,
      gold: 0,
    };
    expect(legalActions(content, brokeShopState)).toEqual([{ type: "leaveShop" }]);

    const victoryState = replayRun(content, 5, completeRunActions(5));
    expect(legalActions(content, victoryState)).toEqual([]);
  });

  it("respects shop discounts when deciding whether buy actions are legal", () => {
    let state = createRun(content, 5);
    state = winCurrentCombat(content, state);
    state = applyAction(content, state, { type: "skipReward" });
    state = {
      ...state,
      relics: ["starterCharm", "merchantTag"],
    };
    state = applyAction(content, state, { type: "choosePath", nodeId: "market" });

    if (state.phase !== "shop") {
      throw new Error(`expected shop phase, received ${state.phase}`);
    }

    const discountedState: RunState = {
      ...state,
      gold: 11,
    };

    expect(legalActions(content, discountedState)).toEqual([
      { type: "buyShop", saleIndex: 0 },
      { type: "buyShop", saleIndex: 1 },
      { type: "leaveShop" },
    ]);
  });
});

describe("replayRun", () => {
  it("rebuilds the same final state from seed plus action history", () => {
    const actions = completeRunActions(5);
    const replayed = replayRun(content, 5, actions);

    let stepped = createRun(content, 5);
    for (const action of actions) {
      stepped = applyAction(content, stepped, action);
    }

    expect(replayed).toEqual(stepped);
    expect(observeRun(content, replayed)).toEqual(observeRun(content, stepped));
  });
});

describe("traceRun", () => {
  it("records the initial observation and each resulting observation", () => {
    const actions = completeRunActions(5);
    const trace = traceRun(content, 5, actions);
    const finalState = replayRun(content, 5, actions);

    expect(trace.seed).toBe(5);
    expect(trace.actions).toEqual(actions);
    expect(trace.steps).toHaveLength(actions.length + 1);
    expect(trace.steps[0]?.action).toBeNull();
    expect(trace.steps[0]?.observation).toEqual(observeRun(content, createRun(content, 5)));
    expect(trace.steps.at(-1)?.observation).toEqual(observeRun(content, finalState));

    for (const [index, action] of actions.entries()) {
      expect(trace.steps[index + 1]?.action).toEqual(action);
    }
  });
});

function completeRunActions(seed: number): RunAction[] {
  let state = createRun(content, seed);
  const actions: RunAction[] = [];

  while (state.phase !== "victory" && state.phase !== "defeat") {
    const action = chooseAction(content, state);
    actions.push(action);
    state = applyAction(content, state, action);
  }

  return actions;
}

function chooseAction(runContent: RunContent, state: RunState): RunAction {
  const actions = legalActions(runContent, state);

  if (state.phase === "blessing") {
    return actions[0]!;
  }

  if (state.phase === "combat") {
    return actions.find((action) => action.type === "playCard") ?? { type: "endTurn" };
  }

  if (state.phase === "map") {
    return actions[0]!;
  }

  if (state.phase === "rest") {
    return { type: "chooseRest", optionId: "recover" };
  }

  if (state.phase === "reward") {
    return { type: "skipReward" };
  }

  if (state.phase === "shop") {
    return { type: "leaveShop" };
  }

  throw new Error(`no action available for phase ${state.phase}`);
}

function winCurrentCombat(runContent: RunContent, state: RunState): RunState {
  let nextState = state;

  if (nextState.phase === "blessing") {
    nextState = applyAction(runContent, nextState, { type: "chooseBlessing", blessingId: runContent.acts[0]!.blessings[0]!.id });
  }

  if (nextState.phase === "map") {
    nextState = applyAction(runContent, nextState, { type: "choosePath", nodeId: "gate" });
  }

  while (nextState.phase === "combat") {
    const action = chooseAction(runContent, nextState);
    nextState = applyAction(runContent, nextState, action);
  }

  return nextState;
}

function enterOpeningCombat(runContent: RunContent, state: RunState): RunState {
  return applyAction(
    runContent,
    applyAction(runContent, state, { type: "chooseBlessing", blessingId: runContent.acts[0]!.blessings[0]!.id }),
    { type: "choosePath", nodeId: "gate" },
  );
}

function createAct(map: MapNode[]) {
  return {
    id: "act-1",
    map: [{ id: "start", kind: "start", nextIds: [map[0]!.id] }, ...map],
    blessings: [{ id: "act-1-heal", kind: "relic" as const, relicId: "openingToken" }],
  };
}

function createCharacter(starterDeck: string[], rewardPool: string[], shopPool: string[]) {
  return {
    id: "test",
    name: "Test",
    summary: "Test character.",
    maxHp: 80,
    startGold: 0,
    starterDeck,
    startingRelicId: "starterCharm",
    blessingCardPools: { act1: [starterDeck[0]!], act2: [starterDeck[0]!], act3: [starterDeck[0]!] },
    blessingRelicPools: { act1: ["openingToken"], act2: ["openingToken"], act3: ["openingToken"] },
    rewardCardPools: { common: rewardPool, rare: [], epic: [] },
    shopCardPools: { common: shopPool, rare: [], epic: [] },
    relicPools: { elite: [], boss: [] },
  };
}
