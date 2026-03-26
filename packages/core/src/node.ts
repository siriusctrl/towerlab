import { startCombat } from "./combat.js";
import { createShopState } from "./shop.js";
import { appendLog } from "./shared.js";
import type { MapNode, RunContent, RunState } from "./types.js";

export function enterNode(content: RunContent, state: RunState, node: MapNode): RunState {
  if (node.kind === "start") {
    return appendLog(
      {
        ...state,
        phase: "map",
        combat: undefined,
        reward: undefined,
        shop: undefined,
      },
      { type: "chooseNextPath" },
    );
  }

  if (node.kind === "rest") {
    return appendLog(
      {
        ...state,
        phase: "rest",
        combat: undefined,
        reward: undefined,
        shop: undefined,
      },
      { type: "chooseCampfire" },
    );
  }

  if (node.kind === "shop") {
    const shopState = createShopState(content, state);

    return appendLog(
      {
        ...state,
        phase: "shop",
        combat: undefined,
        reward: undefined,
        shop: shopState.shop,
        rng: shopState.rng,
      },
      { type: "shopEntered" },
    );
  }

  return startCombat(content, state, node);
}
