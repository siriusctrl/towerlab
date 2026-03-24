import { render } from "ink";

import { App, isHeadlessMode, readSeed, renderSnapshot, runHeadless } from "./index.js";

const seed = readSeed(process.argv.slice(2));

const args = process.argv.slice(2);

try {
  if (isHeadlessMode(args)) {
    console.log(runHeadless(args));
  } else if (process.stdout.isTTY && process.stdin.isTTY) {
    render(<App seed={seed} />);
  } else {
    console.log(renderSnapshot(seed));
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
