import { enterNode } from "../node.js";
import { normalizeSeed } from "../rng.js";
import { appendLog, instantiateDeck } from "../shared.js";
import type { RunContent, RunState } from "../types.js";
import { validateContent } from "../validate.js";

export function createRun(content: RunContent, seed: number): RunState {
  const firstAct = content.acts[0];
  const firstNode = firstAct?.map[0];

  if (!firstNode) {
    throw new Error("content must contain at least one act with a start node");
  }

  validateContent(content);
  const starterDeck = instantiateDeck(content.character.starterDeck);

  const baseState: RunState = {
    seed,
    characterId: content.character.id,
    act: 1,
    rng: normalizeSeed(seed),
    phase: "blessing",
    hp: content.character.maxHp,
    maxHp: content.character.maxHp,
    gold: content.character.startGold,
    floor: 1,
    currentNodeId: firstNode.id,
    nextCardInstanceId: starterDeck.nextCardInstanceId,
    totalDeckRemovals: 0,
    deck: starterDeck.deck,
    relics: [content.character.startingRelicId],
    log: [],
  };

  if (firstNode.kind !== "start") {
    return enterNode(content, appendLog(baseState, { type: "enteredNode", nodeId: firstNode.id, kind: firstNode.kind }), firstNode);
  }

  return appendLog(appendLog(baseState, { type: "actStarted", act: 1 }), { type: "atEntrance" });
}
