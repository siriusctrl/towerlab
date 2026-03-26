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
    characterId: content.character.id,
    rng: normalizeSeed(seed),
    phase: "map",
    hp: content.character.maxHp,
    maxHp: content.character.maxHp,
    gold: content.character.startGold,
    floor: 1,
    currentNodeId: firstNode.id,
    deck: [...content.character.starterDeck],
    relics: [content.character.startingRelicId],
    log: [],
  };

  if (firstNode.kind === "start") {
    return appendLog(baseState, { type: "atEntrance" });
  }

  return enterNode(content, appendLog(baseState, { type: "enteredNode", nodeId: firstNode.id, kind: firstNode.kind }), firstNode);
}
