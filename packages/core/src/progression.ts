import type { MapNode, RunState } from "./types.js";

import { appendLog } from "./shared.js";

export function finishNode(state: RunState, currentNode: MapNode): RunState {
  if (currentNode.nextIds.length === 0) {
    const finalPhase = state.hp > 0 ? "victory" : "defeat";
    const message = finalPhase === "victory"
      ? currentNode.kind === "boss"
        ? "The boss falls. The tower is clear."
        : "The path ends in victory."
      : "Your climb ends here.";

    return appendLog(
      {
        ...state,
        phase: finalPhase,
        reward: undefined,
        shop: undefined,
      },
      message,
    );
  }

  return appendLog(
    {
      ...state,
      phase: "map",
      reward: undefined,
      shop: undefined,
    },
    "Choose the next path.",
  );
}
