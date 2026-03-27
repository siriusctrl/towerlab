import { startCombat } from "./combat.js";
import { createShopState } from "./shop.js";
import { appendLog, buildUpgradableDeckIndices } from "./shared.js";
import type { MapNode, RunContent, RunState } from "./types.js";

export function enterNode(content: RunContent, state: RunState, node: MapNode): RunState {
  if (node.kind === "start") {
    return appendLog(
      {
        ...state,
        phase: "map",
        combat: undefined,
        rest: undefined,
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
        rest: {
          mode: "menu",
          upgradableDeckIndices: buildUpgradableDeckIndices(state.deck),
        },
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
        rest: undefined,
        reward: undefined,
        shop: shopState.shop,
        rng: shopState.rng,
      },
      { type: "shopEntered" },
    );
  }

  return startCombat(content, state, node);
}
