import { localizeErrorMessage, type Locale } from "../i18n.js";
import type { MapTreeCell } from "../view.js";

const MAP_CELL_COLORS: Record<string, string | undefined> = {
  current: "green",
  next: "yellow",
  nextChoice1: "cyan",
  nextChoice2: "magenta",
  nextChoice3: "blue",
  future: "white",
  futureChoice1: "cyan",
  futureChoice2: "magenta",
  futureChoice3: "blue",
  past: "gray",
  closed: "gray",
  connector: "gray",
  connectorChoice1: "cyan",
  connectorChoice2: "magenta",
  connectorChoice3: "blue",
};

export function readChoiceIndex(input: string, limit: number): number | null {
  if (!/^[1-9]$/.test(input)) {
    return null;
  }

  const index = Number(input) - 1;

  if (index < 0 || index >= limit) {
    return null;
  }

  return index;
}

export function getErrorMessage(error: unknown, locale: Locale): string {
  if (error instanceof Error) {
    return localizeErrorMessage(error.message, locale);
  }

  return localizeErrorMessage("unknown error", locale);
}

export function getMapCellColor(cell: MapTreeCell): string | undefined {
  return MAP_CELL_COLORS[cell.status];
}

export function isDimmedMapCell(cell: MapTreeCell): boolean {
  return cell.status === "closed" || cell.status === "past" || cell.status === "connector";
}

export function isEmphasizedMapCell(cell: MapTreeCell): boolean {
  return cell.status === "current" || cell.status === "next" || /^nextChoice/u.test(cell.status);
}

export function getChoiceColor(index: number): string | undefined {
  if (index === 0) return "cyan";
  if (index === 1) return "magenta";
  if (index === 2) return "blue";
  return undefined;
}

export function getTerminalTextWidth(text: string): number {
  let width = 0;

  for (const char of text) {
    const codePoint = char.codePointAt(0);

    if (codePoint === undefined) {
      continue;
    }

    if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      continue;
    }

    width += isWideCodePoint(codePoint) ? 2 : 1;
  }

  return width;
}

function isWideCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    codePoint === 0x2329 ||
    codePoint === 0x232a ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6)
  );
}
