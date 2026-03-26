import { REWARD_CARD_COUNT } from "./constants.js";
import { appendLog, selectCardsFromPool } from "./shared.js";
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
  const cardSelection = selectCardsFromPool(content.rewardCardPool, REWARD_CARD_COUNT, state.rng);
  const cardChoices = cardSelection.cards.filter((cardId) => content.cards[cardId]);

  return {
    cards: cardChoices,
    rng: cardSelection.rng,
  };
}
