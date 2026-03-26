import { REWARD_CARD_COUNT_PLANS } from "./constants.js";
import { appendLog, selectCardsFromBuckets } from "./shared.js";
import type { MapNode, RunContent, RunState } from "./types.js";
import { getRelic } from "./validate.js";

export function grantRelicReward(content: RunContent, state: RunState, currentNode: MapNode): RunState {
  const relicId = currentNode.relicReward;

  if (!relicId) {
    return state;
  }

  if (state.relics.includes(relicId)) {
    return appendLog(state, { type: "relicAlreadyOwned", relicId });
  }

  const relic = getRelic(content, relicId);
  let nextState: RunState = {
    ...state,
    relics: [...state.relics, relicId],
  };

  if (relic.kind === "maxHp") {
    nextState = {
      ...nextState,
      maxHp: state.maxHp + relic.value,
      hp: state.hp + relic.value,
    };
  }

  return appendLog(nextState, { type: "relicAcquired", relicId });
}

export function getRewardChoices(content: RunContent, state: RunState): { cards: string[]; rng: number } {
  const planSelection = selectCardsFromBuckets(
    content.character.rewardCardPools,
    REWARD_CARD_COUNT_PLANS[state.rng % REWARD_CARD_COUNT_PLANS.length]!,
    state.rng,
  );
  const cardChoices = planSelection.cards.filter((cardId) => content.cards[cardId]);

  return {
    cards: cardChoices,
    rng: planSelection.rng,
  };
}
