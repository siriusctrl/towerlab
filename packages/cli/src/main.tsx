import { render } from "ink";

import { App, isHeadlessMode, readSeed, renderSnapshot, runHeadless } from "./index.js";
import { DEFAULT_LOCALE, localizeErrorMessage, readLocale } from "./i18n.js";

const args = process.argv.slice(2);

try {
  const locale = readLocale(args);
  const seed = readSeed(args, locale);

  if (isHeadlessMode(args)) {
    console.log(runHeadless(args));
  } else if (process.stdout.isTTY && process.stdin.isTTY) {
    render(<App seed={seed} locale={locale} />);
  } else {
    console.log(renderSnapshot(seed, locale));
  }
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
  process.exit(1);
}
