import { describe, expect, test } from "vitest";
import { createSeededContent } from "../../../content/src/index.js";

import { finishCombat } from "../combat.js";
import { createRun } from "../run/create.js";
import { applyAction } from "../run/actions.js";
import { legalActions, observeRun } from "../run/observe.js";

function createCombatRewardState(seed = 7) {
  const content = createSeededContent(seed, "warrior");
  let state = createRun(content, seed);
  const blessingId = legalActions(content, state)[0]?.type === "chooseBlessing" ? legalActions(content, state)[0].blessingId : null;

  if (!blessingId) {
    throw new Error("expected an opening blessing");
  }

  state = applyAction(content, state, { type: "chooseBlessing", blessingId });

  const eliteNode = observeRun(content, state).nextNodes.find((node) => node.kind === "elite") ?? observeRun(content, state).nextNodes[0];

  if (!eliteNode) {
    throw new Error("expected a reachable node");
  }

  state = applyAction(content, state, { type: "choosePath", nodeId: eliteNode.id });

  if (state.phase !== "combat" || !state.combat) {
    throw new Error("expected combat after choosing first path");
  }

  state = finishCombat(content, {
    ...state,
    combat: {
      ...state.combat,
      enemy: {
        ...state.combat.enemy,
        hp: 0,
      },
    },
  });

  return { content, state };
}

describe("combat rewards", () => {
  test("offers gold, relic, and card rewards in a unified reward menu", () => {
    const { content, state } = createCombatRewardState();
    const observation = observeRun(content, state);

    expect(observation.phase).toBe("reward");
    if (observation.phase !== "reward") {
      return;
    }

    expect(observation.mode).toBe("menu");
    expect(observation.rewardItems.map((item) => item.kind)).toEqual(["gold", "relic", "cards"]);
    expect(legalActions(content, state)).toContainEqual({ type: "skipReward" });
    expect(legalActions(content, state)).toContainEqual({ type: "takeReward", rewardIndex: observation.rewardItems[0]?.rewardIndex });
  });

  test("claims direct rewards and uses a second-level card choice menu", () => {
    const { content, state: initialState } = createCombatRewardState();
    const initialObservation = observeRun(content, initialState);

    if (initialObservation.phase !== "reward") {
      throw new Error("expected reward observation");
    }

    const goldReward = initialObservation.rewardItems.find((item) => item.kind === "gold");
    const relicReward = initialObservation.rewardItems.find((item) => item.kind === "relic");
    const cardReward = initialObservation.rewardItems.find((item) => item.kind === "cards");

    if (!goldReward || !relicReward || !cardReward) {
      throw new Error("expected gold, relic, and card rewards");
    }

    const afterGold = applyAction(content, initialState, { type: "takeReward", rewardIndex: goldReward.rewardIndex });
    expect(afterGold.gold).toBe(initialState.gold + goldReward.amount);

    const afterRelic = applyAction(content, afterGold, { type: "takeReward", rewardIndex: relicReward.rewardIndex });
    expect(afterRelic.relics).toContain(relicReward.relic.id);

    const cardMenuState = applyAction(content, afterRelic, { type: "takeReward", rewardIndex: cardReward.rewardIndex });
    const cardMenuObservation = observeRun(content, cardMenuState);

    expect(cardMenuObservation.phase).toBe("reward");
    if (cardMenuObservation.phase !== "reward") {
      return;
    }

    expect(cardMenuObservation.mode).toBe("cards");
    expect(legalActions(content, cardMenuState)).toContainEqual({ type: "backReward" });
    expect(cardMenuObservation.cardChoices.length).toBeGreaterThan(0);

    const chosenCardId = cardMenuObservation.cardChoices[0]!.id;
    const finishedState = applyAction(content, cardMenuState, { type: "takeRewardCard", rewardIndex: 0 });

    expect(finishedState.phase).toBe("map");
    expect(finishedState.reward).toBeUndefined();
    expect(finishedState.deck.some((card) => card.cardId === chosenCardId)).toBe(true);
  });
});
