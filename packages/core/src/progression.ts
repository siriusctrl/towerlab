import type { MapNode, RunContent, RunState } from "./types.js";

import { appendLog, getAct } from "./shared.js";

export function finishNode(content: RunContent, state: RunState, currentNode: MapNode): RunState {
  if (currentNode.kind === "boss" && state.hp > 0 && state.act < content.acts.length) {
    return appendLog(
      {
        ...state,
        act: state.act + 1,
        phase: "blessing",
        floor: 1,
        currentNodeId: getAct(content, state.act + 1).map[0]!.id,
        reward: undefined,
        shop: undefined,
      },
      { type: "actStarted", act: state.act + 1 },
    );
  }

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
