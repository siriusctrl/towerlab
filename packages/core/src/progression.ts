import type { MapNode, RunState } from "./types.js";

import { appendLog } from "./shared.js";

export function finishNode(state: RunState, currentNode: MapNode): RunState {
  if (currentNode.nextIds.length === 0) {
    const finalPhase = state.hp > 0 ? "victory" : "defeat";
    const event = finalPhase === "victory"
      ? currentNode.kind === "boss"
        ? { type: "bossCleared" as const }
        : { type: "pathVictory" as const }
      : { type: "climbEnded" as const };

    return appendLog(
      {
        ...state,
        phase: finalPhase,
        reward: undefined,
        shop: undefined,
      },
      event,
    );
  }

  return appendLog(
    {
      ...state,
      phase: "map",
      reward: undefined,
      shop: undefined,
    },
    { type: "chooseNextPath" },
  );
}
