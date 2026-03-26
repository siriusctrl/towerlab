import { render } from "ink";

import { DEFAULT_CHARACTER_ID } from "@towerlab/content";

import { App, isHeadlessMode, readCharacterId, readSeed, renderSnapshot, runHeadless } from "./index.js";
import { DEFAULT_LOCALE, localizeErrorMessage, readLocale } from "./i18n.js";

const args = process.argv.slice(2);

await main();

async function main() {
  try {
    const locale = readLocale(args);

    if (isHeadlessMode(args)) {
      console.log(runHeadless(args));
      return;
    }

    const seed = readSeed(args, locale);
    const characterId = readCharacterId(args, locale);

    if (process.stdout.isTTY && process.stdin.isTTY) {
      const cleanupTerminal = enterAlternateScreen(process.stdout);

      try {
        const app = render(<App seed={seed} characterId={characterId} locale={locale} />);
        await app.waitUntilExit();
      } finally {
        cleanupTerminal();
      }

      return;
    }

    console.log(renderSnapshot(seed, locale, characterId ?? DEFAULT_CHARACTER_ID));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const locale = (() => {
      try {
        return readLocale(args);
      } catch {
        return DEFAULT_LOCALE;
      }
    })();

    console.error(localizeErrorMessage(message, locale));
    process.exitCode = 1;
  }
}

function enterAlternateScreen(stdout: NodeJS.WriteStream): () => void {
  stdout.write("\u001b[?1049h\u001b[?25l\u001b[2J\u001b[H");

  let restored = false;

  return () => {
    if (restored) {
      return;
    }

    restored = true;
    stdout.write("\u001b[?25h\u001b[?1049l");
  };
}
