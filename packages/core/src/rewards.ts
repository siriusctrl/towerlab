import {
  BATTLE_REWARD_CARD_COUNT_PLANS,
  BOSS_REWARD_CARD_COUNT_PLANS,
  ELITE_REWARD_CARD_COUNT_PLANS,
} from "./constants.js";
import { appendLog, selectCardsFromBuckets } from "./shared.js";
import type { MapNode, RunContent, RunState } from "./types.js";
import { getRelic } from "./validate.js";

export function grantRelicReward(content: RunContent, state: RunState, relicId: string): RunState {
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

export function getSelectableRelicReward(state: RunState, currentNode: MapNode): string | null {
  const relicId = currentNode.relicReward;

  if (!relicId || state.relics.includes(relicId)) {
    return null;
  }

  return relicId;
}

function getRewardPlanForNode(currentNode: MapNode) {
  if (currentNode.kind === "boss") return BOSS_REWARD_CARD_COUNT_PLANS;
  if (currentNode.kind === "elite") return ELITE_REWARD_CARD_COUNT_PLANS;
  return BATTLE_REWARD_CARD_COUNT_PLANS;
}

export function getRewardChoices(content: RunContent, state: RunState, currentNode: MapNode): { cards: string[]; rng: number } {
  const rewardPlans = getRewardPlanForNode(currentNode);
  const planSelection = selectCardsFromBuckets(
    content.character.rewardCardPools,
    rewardPlans[state.rng % rewardPlans.length]!,
    state.rng,
  );
  const cardChoices = planSelection.cards.filter((cardId) => content.cards[cardId]);

  return {
    cards: cardChoices,
    rng: planSelection.rng,
  };
}
