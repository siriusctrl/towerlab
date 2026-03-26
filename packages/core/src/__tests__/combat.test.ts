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

describe("combat transitions", () => {
  it("plays cards, spends energy, and advances enemy intents on end turn", () => {
    const content = createCombatContent();
    let state = enterOpeningCombat(content, createRun(content, 3));
    const opening = observeCombat(content, state);
    const defendIndex = opening.hand.findIndex((card) => card.id === "defend");

    expect(defendIndex).toBeGreaterThanOrEqual(0);

    state = applyAction(content, state, { type: "playCard", handIndex: defendIndex });
    const afterCard = observeCombat(content, state);

    expect(afterCard.energy).toBe(2);
    expect(afterCard.block).toBe(5);

    state = applyAction(content, state, { type: "endTurn" });
    const nextTurn = observeCombat(content, state);

    expect(nextTurn.block).toBe(0);
    expect(nextTurn.energy).toBe(3);
    expect(nextTurn.enemy.intent.description).toBe("Brace for 4 block");
    expect(state.hp).toBe(79);
  });

  it("ends the run in defeat when enemy damage drops the player to zero", () => {
    const content = createCombatContent();
    const opening = enterOpeningCombat(content, createRun(content, 1));
    const doomed: RunState = {
      ...opening,
      hp: 4,
    };
    const next = applyAction(content, doomed, { type: "endTurn" });

    expect(next.phase).toBe("defeat");
    expect(next.hp).toBe(0);
  });

  it("wins a boss encounter and marks the run as victory", () => {
    const content = createBossContent();
    let state = enterOpeningCombat(content, createRun(content, 11));

    while (state.phase === "combat") {
      const view = observeCombat(content, state);
      const strikeIndex = view.hand.findIndex((card) => card.id === "strike");

      if (strikeIndex >= 0 && view.energy >= 1) {
        state = applyAction(content, state, { type: "playCard", handIndex: strikeIndex });
        continue;
      }

      state = applyAction(content, state, { type: "endTurn" });
    }

    expect(state.phase).toBe("victory");
    expect(state.gold).toBe(15);
  });
});

function observeCombat(content: RunContent, state: RunState): CombatObservation {
  const view = observeRun(content, state);

  if (view.phase !== "combat") {
    throw new Error(`expected combat phase, received ${view.phase}`);
  }

  return view;
}

function enterOpeningCombat(content: RunContent, state: RunState): RunState {
  let nextState = state;

  if (nextState.phase === "blessing") {
    nextState = applyAction(content, nextState, { type: "chooseBlessing", blessingId: content.acts[0]!.blessings[0]!.id });
  }

  if (nextState.phase === "map") {
    const currentNode = content.acts[0]!.map.find((node) => node.id === nextState.currentNodeId)!;
    nextState = applyAction(content, nextState, { type: "choosePath", nodeId: currentNode.nextIds[0]! });
  }

  return nextState;
}

function createCombatContent(): RunContent {
  return {
    cards: {
      strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
      defend: { id: "defend", name: "Defend", cost: 1, description: "Gain 5 block.", block: 5 },
    },
    relics: {
      starterCharm: { id: "starterCharm", name: "Starter Charm", description: "Gain 1 max HP.", kind: "maxHp", value: 1 },
    },
    enemies: {
      guard: {
        id: "guard",
        name: "Guard",
        maxHp: 24,
        goldReward: 12,
        intents: [
          { kind: "attack", description: "Slash for 6", damage: 6 },
          { kind: "block", description: "Brace for 4 block", block: 4 },
        ],
      },
    },
    character: createCharacter(["strike", "strike", "strike", "defend", "defend", "defend"]),
    acts: [createAct([{ id: "gate", kind: "battle", encounterId: "guard", nextIds: [] }])],
  };
}

function createBossContent(): RunContent {
  return {
    cards: {
      strike: { id: "strike", name: "Strike", cost: 1, description: "Deal 6 damage.", damage: 6 },
    },
    relics: {
      starterCharm: { id: "starterCharm", name: "Starter Charm", description: "Gain 1 max HP.", kind: "maxHp", value: 1 },
    },
    enemies: {
      core: {
        id: "core",
        name: "Core",
        maxHp: 12,
        goldReward: 15,
        intents: [{ kind: "attack", description: "Pulse for 3", damage: 3 }],
      },
    },
    character: createCharacter(["strike", "strike", "strike", "strike", "strike"]),
    acts: [createAct([{ id: "summit", kind: "boss", encounterId: "core", nextIds: [] }])],
  };
}

function createAct(map: MapNode[]) {
  return {
    id: "act-1",
    map: [{ id: "start", kind: "start", nextIds: [map[0]!.id] }, ...map],
    blessings: [{ id: "act-1-heal", kind: "heal" as const, value: 1 }],
  };
}

function createCharacter(starterDeck: string[]) {
  return {
    id: "test",
    name: "Test",
    summary: "Test character.",
    maxHp: 80,
    startGold: 0,
    starterDeck,
    startingRelicId: "starterCharm",
    blessingCards: [starterDeck[0]!, starterDeck[0]!, starterDeck[0]!],
    rewardCardPools: { common: [], uncommon: [], rare: [] },
    shopCardPools: { common: [], uncommon: [], rare: [] },
    relicPools: { elite: [], boss: [] },
  };
}
