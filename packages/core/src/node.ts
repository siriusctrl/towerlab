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
      "Choose the next path.",
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
      "Choose how to use the campfire.",
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
      "You found a shop. Browse the offers.",
    );
  }

  return startCombat(content, state, node);
}
