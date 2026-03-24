import { render } from "ink";

import { App, readSeed, renderSnapshot } from "./index.js";

const seed = readSeed(process.argv.slice(2));

if (process.stdout.isTTY && process.stdin.isTTY) {
  render(<App seed={seed} />);
} else {
  console.log(renderSnapshot(seed));
}
