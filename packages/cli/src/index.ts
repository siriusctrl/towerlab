import type { Observation } from "@towerlab/core";

export function renderObservation(observation: Observation): string {
  const nextNodeLine = observation.nextNodes.length === 0
    ? "none"
    : observation.nextNodes.map((node) => `${node.id}:${node.kind}`).join(", ");

  const handLines = observation.hand
    .map((card, index) => `${index + 1}. ${card.name} [${card.cost}] - ${card.description}`)
    .join("\n");

  return [
    "# TowerLab",
    "",
    `Seed: ${observation.seed}`,
    `HP: ${observation.hp}/${observation.maxHp}`,
    `Gold: ${observation.gold}`,
    `Floor: ${observation.floor}`,
    `Current node: ${observation.currentNode.id} (${observation.currentNode.kind})`,
    `Next nodes: ${nextNodeLine}`,
    `Draw pile: ${observation.drawPileCount}`,
    `Discard pile: ${observation.discardPileCount}`,
    "",
    "Opening hand:",
    handLines,
  ].join("\n");
}
