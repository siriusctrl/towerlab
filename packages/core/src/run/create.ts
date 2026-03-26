import { DEFAULT_MAX_HP, STARTING_GOLD } from "../constants.js";
import { enterNode } from "../node.js";
import { normalizeSeed } from "../rng.js";
import { appendLog } from "../shared.js";
import type { RunContent, RunState } from "../types.js";
import { validateContent } from "../validate.js";

export function createRun(content: RunContent, seed: number): RunState {
  const firstNode = content.map[0];

  if (!firstNode) {
    throw new Error("map must contain at least one node");
  }

  validateContent(content);

  const baseState: RunState = {
    seed,
    rng: normalizeSeed(seed),
    phase: "map",
    hp: DEFAULT_MAX_HP,
    maxHp: DEFAULT_MAX_HP,
    gold: STARTING_GOLD,
    floor: 1,
    currentNodeId: firstNode.id,
    deck: [...content.starterDeck],
    relics: [],
    log: [],
  };

  if (firstNode.kind === "start") {
    return appendLog(baseState, { type: "atEntrance" });
  }

  return enterNode(content, appendLog(baseState, { type: "enteredNode", nodeId: firstNode.id, kind: firstNode.kind }), firstNode);
}
