import { sampleContent } from "@towerlab/content";
import { createRun, observeRun, type Observation } from "@towerlab/core";

export { App, type AppProps } from "./app.js";

export function readSeed(args: string[]): number {
  const seedFlagIndex = args.indexOf("--seed");

  if (seedFlagIndex === -1) {
    return 7;
  }

  const rawSeed = args[seedFlagIndex + 1];
  const seed = Number(rawSeed);

  if (!Number.isInteger(seed)) {
    throw new Error("--seed must be an integer");
  }

  return seed;
}

export function renderSnapshot(seed: number): string {
  return renderObservation(observeRun(sampleContent, createRun(sampleContent, seed)));
}

function renderObservation(observation: Observation): string {
  const lines = [
    "TowerLab",
    `Seed: ${observation.seed}`,
    `Phase: ${observation.phase}`,
    `HP: ${observation.hp}/${observation.maxHp}  Gold: ${observation.gold}  Floor: ${observation.floor}`,
    `Node: ${observation.currentNode.id} (${observation.currentNode.kind})`,
    "",
  ];

  if (observation.phase === "combat") {
    lines.push(
      `Enemy: ${observation.enemy.name} HP ${observation.enemy.hp}/${observation.enemy.maxHp} Block ${observation.enemy.block}`,
      `Intent: ${observation.enemy.intent.description}`,
      `You: Energy ${observation.energy}  Block ${observation.block}  Draw ${observation.drawPileCount}  Discard ${observation.discardPileCount}`,
      "",
      "Hand:",
    );

    for (const [index, card] of observation.hand.entries()) {
      lines.push(`${index + 1}. ${card.name} [${card.cost}] ${card.description}`);
    }
  } else if (observation.phase === "map") {
    lines.push("Paths:");

    for (const [index, node] of observation.nextNodes.entries()) {
      lines.push(`${index + 1}. ${node.id} (${node.kind})`);
    }
  } else if (observation.phase === "rest") {
    lines.push("Rest:");

    for (const [index, option] of observation.restOptions.entries()) {
      lines.push(`${index + 1}. ${option.label} - ${option.description}`);
    }
  } else {
    lines.push(`Outcome: ${observation.phase === "victory" ? "Victory" : "Defeat"}`);
  }

  lines.push("", "Log:");

  for (const entry of observation.log) {
    lines.push(`- ${entry}`);
  }

  return lines.join("\n");
}
