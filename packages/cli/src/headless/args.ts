import fs from "node:fs";

import { DEFAULT_LOCALE, localizeErrorMessage, SUPPORTED_LOCALES, type Locale } from "../i18n.js";
import { BASELINE_POLICY_NAMES, type BaselinePolicyName } from "../policies.js";
import { parseAction, parseActions } from "./actions.js";
import type { HeadlessMode, HeadlessParseResult } from "./types.js";

const DEFAULT_SEED = 7;

export function readSeed(args: string[], locale: Locale = DEFAULT_LOCALE): number {
  const seedFlagIndex = args.indexOf("--seed");

  if (seedFlagIndex === -1) {
    return DEFAULT_SEED;
  }

  const rawSeed = args[seedFlagIndex + 1];
  const seed = Number(rawSeed);

  if (!Number.isInteger(seed)) {
    throw new Error(localizeErrorMessage("--seed must be an integer", locale));
  }

  return seed;
}

export function parseHeadlessArgs(args: string[], locale: Locale): HeadlessParseResult {
  const parsed: HeadlessParseResult = {
    actions: [],
    batchSeeds: [],
    command: "create",
    help: false,
    locale,
    pretty: false,
    seed: readSeed(args, locale),
  };
  let seedStart: number | undefined;
  let count: number | undefined;
  let usedBatchSeedFlags = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--json") {
      continue;
    }

    if (arg === "--lang" || arg === "--locale") {
      index += 1;
      continue;
    }

    if (arg === "--help") {
      parsed.help = true;
      continue;
    }

    if (arg === "--seed") {
      parsed.seed = requireNextNumberArg(args, index, "--seed", locale);
      index += 1;
      continue;
    }

    if (arg === "--seed-start") {
      usedBatchSeedFlags = true;
      seedStart = requireNextNumberArg(args, index, "--seed-start", locale);
      index += 1;
      continue;
    }

    if (arg === "--count") {
      usedBatchSeedFlags = true;
      count = requireNextNumberArg(args, index, "--count", locale);
      index += 1;
      continue;
    }

    if (arg === "--pretty") {
      parsed.pretty = true;
      continue;
    }

    if (arg === "--policy") {
      usedBatchSeedFlags = true;
      const policyName = requireNextArg(args, index, "--policy");

      if (!isBaselinePolicyName(policyName)) {
        throw new Error(localizeErrorMessage(`--policy must be one of ${BASELINE_POLICY_NAMES.join(", ")}`, locale));
      }

      parsed.policyName = policyName;
      index += 1;
      continue;
    }

    if (arg === "--seeds") {
      usedBatchSeedFlags = true;
      parsed.batchSeeds = parseSeeds(requireNextArg(args, index, "--seeds"), locale);
      index += 1;
      continue;
    }

    if (arg === "--action") {
      parsed.action = parseAction(requireNextArg(args, index, "--action"));
      index += 1;
      continue;
    }

    if (arg === "--actions") {
      parsed.actions = parsed.actions.concat(parseActions(requireNextArg(args, index, "--actions")));
      index += 1;
      continue;
    }

    if (arg === "--actions-file") {
      const path = requireNextArg(args, index, "--actions-file");
      parsed.actions = parsed.actions.concat(parseActions(fs.readFileSync(path, "utf8")));
      index += 1;
      continue;
    }

    if (!arg.startsWith("--") && isHeadlessCommand(arg)) {
      parsed.command = arg;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unknown positional argument: ${arg}`);
    }
  }

  if (seedStart !== undefined || count !== undefined) {
    if (seedStart === undefined || count === undefined) {
      throw new Error(localizeErrorMessage("--seed-start and --count must be provided together", locale));
    }

    if (count <= 0) {
      throw new Error(localizeErrorMessage("--count must be a positive integer", locale));
    }

    parsed.batchSeeds = Array.from({ length: count }, (_, offset) => seedStart + offset);
  }

  if (parsed.command === "create" && (parsed.actions.length > 0 || parsed.action)) {
    throw new Error(localizeErrorMessage("create mode does not accept actions", locale));
  }

  if (parsed.command === "batch" && (parsed.actions.length > 0 || parsed.action)) {
    throw new Error(localizeErrorMessage("batch mode does not accept actions", locale));
  }

  if (parsed.command !== "batch" && (parsed.policyName || parsed.batchSeeds.length > 0 || usedBatchSeedFlags)) {
    throw new Error(localizeErrorMessage("--policy, --seeds, --seed-start, and --count are only valid in batch mode", locale));
  }

  if ((parsed.command === "observe" || parsed.command === "replay") && parsed.action) {
    throw new Error(localizeErrorMessage(`${parsed.command} mode does not accept --action`, locale));
  }

  if (parsed.command === "step" && !parsed.action) {
    throw new Error(localizeErrorMessage("step mode requires --action", locale));
  }

  return parsed;
}

export function getHeadlessUsage(locale: Locale): { commands: string[]; examples: string[]; localeOptions: Locale[] } {
  return {
    commands: ["batch", "create", "observe", "step", "replay"],
    examples: [
      "towerlab --json batch --policy random --seeds 7,8,9",
      "towerlab --json create --seed 7",
      `towerlab --json create --seed 7 --lang ${locale}`,
      "towerlab --json observe --seed 7 --actions '[{\"type\":\"endTurn\"}]'",
      "towerlab --json step --seed 7 --actions '[{\"type\":\"endTurn\"}]' --action '{\"type\":\"playCard\",\"handIndex\":0}'",
      "towerlab --json replay --seed 7 --actions-file actions.json",
    ],
    localeOptions: [...SUPPORTED_LOCALES],
  };
}

function requireNextArg(args: string[], index: number, flag: string): string {
  const value = args[index + 1];

  if (value === undefined) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

function requireNextNumberArg(args: string[], index: number, flag: string, locale: Locale): number {
  const raw = requireNextArg(args, index, flag);
  const parsed = Number(raw);

  if (!Number.isInteger(parsed)) {
    throw new Error(localizeErrorMessage(`${flag} must be an integer`, locale));
  }

  return parsed;
}

function isHeadlessCommand(value: string): value is HeadlessMode {
  return value === "batch" || value === "create" || value === "observe" || value === "step" || value === "replay";
}

function isBaselinePolicyName(value: string): value is BaselinePolicyName {
  return BASELINE_POLICY_NAMES.includes(value as BaselinePolicyName);
}

function parseSeeds(raw: string, locale: Locale): number[] {
  const seeds = raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value));

  if (seeds.length === 0) {
    throw new Error(localizeErrorMessage("--seeds must contain at least one integer", locale));
  }

  if (seeds.length !== raw.split(",").filter((part) => part.trim().length > 0).length) {
    throw new Error(localizeErrorMessage("--seeds must be a comma-separated list of integers", locale));
  }

  return seeds;
}
