import { render } from "ink";

import { App } from "./app.js";

const seed = readSeed(process.argv.slice(2));

render(<App seed={seed} />);

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
