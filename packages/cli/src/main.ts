import { sampleContent } from "@towerlab/content";
import { createRun, observeRun } from "@towerlab/core";

import { renderObservation } from "./index.js";

const seed = readSeed(process.argv.slice(2));
const state = createRun(sampleContent, seed);
const observation = observeRun(sampleContent, state);

console.log(renderObservation(observation));

function readSeed(args: string[]): number {
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
