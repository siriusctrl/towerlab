import fs from "node:fs";

import { sampleContent } from "@towerlab/content";
import {
  applyAction,
  createRun,
  legalActions,
  type MapNode,
  observeRun,
  replayRun,
  traceRun,
  type Observation,
  type RunAction,
  type RunState,
} from "@towerlab/core";

import { runBatchWithPolicy } from "./eval.js";
import {
  DEFAULT_LOCALE,
  localizeErrorMessage,
  localizeNodeKind,
  localizeObservation,
  localizePhaseLabel,
  readLocale,
  SUPPORTED_LOCALES,
  text,
  type Locale,
} from "./i18n.js";
import { BASELINE_POLICY_NAMES, getBaselinePolicy, type BaselinePolicyName } from "./policies.js";
import { createMapListEntries, formatMapLine, getEarlierEventsLine, getMapLegend, getRecentLogView } from "./view.js";

export { App, type AppProps } from "./app.js";

type HeadlessMode = "batch" | "create" | "observe" | "step" | "replay";

type HeadlessParseResult = {
  action?: RunAction;
  actions: RunAction[];
  batchSeeds: number[];
  command: HeadlessMode;
  help: boolean;
  locale: Locale;
  policyName?: BaselinePolicyName;
  pretty: boolean;
  seed: number;
};

type HeadlessTraceStep = {
  step: number;
  action: RunAction | null;
  observation: Observation;
};

type HeadlessSnapshot = {
  seed: number;
  actions: RunAction[];
  locale: Locale;
  map: MapNode[];
  state: RunState;
  observation: Observation;
  legalActions: RunAction[];
};

type HeadlessCreateResponse = HeadlessSnapshot & {
  command: "create";
};

type HeadlessObserveResponse = HeadlessSnapshot & {
  command: "observe";
};

type HeadlessStepResponse = HeadlessSnapshot & {
  command: "step";
  action: RunAction;
  previousActions: RunAction[];
};

type HeadlessReplayResponse = HeadlessSnapshot & {
  command: "replay";
  trace: HeadlessTraceStep[];
};

type HeadlessBatchResponse = ReturnType<typeof runBatchWithPolicy> & {
  command: "batch";
  locale: Locale;
};

type HeadlessResponse =
  | HeadlessBatchResponse
  | HeadlessCreateResponse
  | HeadlessObserveResponse
  | HeadlessStepResponse
  | HeadlessReplayResponse;

const DEFAULT_SEED = 7;

export function readSeed(args: string[], locale: Locale = DEFAULT_LOCALE): number {
  return readSeedWithLocale(args, locale);
}

function readSeedWithLocale(args: string[], locale: Locale): number {
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

export function isHeadlessMode(args: string[]): boolean {
  return args.includes("--json");
}

export function runHeadless(args: string[]): string {
  const locale = readLocale(args);
  let parsed: HeadlessParseResult;

  try {
    parsed = parseHeadlessArgs(args, locale);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(localizeErrorMessage(message, locale));
  }

  if (parsed.help) {
    return encodeJson({ command: "help", locale, usage: getHeadlessUsage(locale) }, parsed.pretty);
  }

  try {
    const response = createHeadlessResponse(parsed);
    return encodeJson(response, parsed.pretty);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(localizeErrorMessage(message, parsed.locale));
  }
}

function createHeadlessResponse(parsed: HeadlessParseResult): HeadlessResponse {
  if (parsed.command === "batch") {
    if (!parsed.policyName) {
      throw new Error(localizeErrorMessage("batch mode requires --policy", parsed.locale));
    }

    if (parsed.batchSeeds.length === 0) {
      throw new Error(localizeErrorMessage("batch mode requires --seeds or --seed-start with --count", parsed.locale));
    }

    const policy = getBaselinePolicy(parsed.policyName);

    return {
      command: "batch",
      locale: parsed.locale,
      ...runBatchWithPolicy({
        policy: ({ content, state }) => policy.chooseAction(state, content),
        policyName: parsed.policyName,
        seeds: parsed.batchSeeds,
      }),
    };
  }

  if (parsed.command === "create") {
    const state = createRun(sampleContent, parsed.seed);

    return {
      command: "create",
      ...createSnapshot(parsed.seed, [], state, parsed.locale),
      locale: parsed.locale,
    };
  }

  if (parsed.command === "observe") {
    const state = replayRun(sampleContent, parsed.seed, parsed.actions);

    return {
      command: "observe",
      ...createSnapshot(parsed.seed, parsed.actions, state, parsed.locale),
      locale: parsed.locale,
    };
  }

  if (parsed.command === "step") {
    if (!parsed.action) {
      throw new Error(localizeErrorMessage("step mode requires --action", parsed.locale));
    }

    const previousState = replayRun(sampleContent, parsed.seed, parsed.actions);
    const nextState = applyAction(sampleContent, previousState, parsed.action);
    const allActions = [...parsed.actions, parsed.action];

    return {
      command: "step",
      action: parsed.action,
      previousActions: parsed.actions,
      ...createSnapshot(parsed.seed, allActions, nextState, parsed.locale),
      locale: parsed.locale,
    };
  }

  const state = replayRun(sampleContent, parsed.seed, parsed.actions);
  const trace = traceRun(sampleContent, parsed.seed, parsed.actions).steps.map((entry, index) => ({
    step: index,
    action: entry.action,
    observation: localizeObservation(entry.observation, parsed.locale),
  }));

  return {
    command: "replay",
    trace,
    ...createSnapshot(parsed.seed, parsed.actions, state, parsed.locale),
    locale: parsed.locale,
  };
}

function createSnapshot(seed: number, actions: RunAction[], state: RunState, locale: Locale = DEFAULT_LOCALE): HeadlessSnapshot {
  return {
    seed,
    actions,
    locale,
    map: sampleContent.map,
    state,
    observation: localizeObservation(observeRun(sampleContent, state), locale),
    legalActions: legalActions(sampleContent, state),
  };
}

function parseHeadlessArgs(args: string[], locale: Locale): HeadlessParseResult {
  const parsed: HeadlessParseResult = {
    actions: [],
    batchSeeds: [],
    command: "create",
    help: false,
    locale,
    pretty: false,
    seed: readSeedWithLocale(args, locale),
  };
  let seedStart: number | undefined;
  let count: number | undefined;
  let usedBatchSeedFlags = false;

  for (let index = 0; index < args.length; index++) {
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
      const actionArg = requireNextArg(args, index, "--action");
      parsed.action = parseAction(actionArg);
      index += 1;
      continue;
    }

    if (arg === "--actions") {
      const actionsArg = requireNextArg(args, index, "--actions");
      parsed.actions = parsed.actions.concat(parseActions(actionsArg));
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

function parseAction(raw: string): RunAction {
  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON action: ${raw}`);
  }

  if (!isRecord(decoded) || typeof decoded.type !== "string") {
    throw new Error(`Invalid action shape: ${raw}`);
  }

  switch (decoded.type) {
    case "choosePath": {
      if (typeof decoded.nodeId !== "string") {
        throw new Error(`Invalid choosePath action: ${raw}`);
      }

      return { type: "choosePath", nodeId: decoded.nodeId };
    }

    case "playCard": {
      if (typeof decoded.handIndex !== "number" || !Number.isInteger(decoded.handIndex)) {
        throw new Error(`Invalid playCard action: ${raw}`);
      }

      return { type: "playCard", handIndex: decoded.handIndex };
    }

    case "endTurn":
      return { type: "endTurn" };

    case "chooseRest": {
      if (decoded.optionId !== "recover" && decoded.optionId !== "fortify") {
        throw new Error(`Invalid chooseRest action: ${raw}`);
      }

      return { type: "chooseRest", optionId: decoded.optionId };
    }

    case "skipReward":
      return { type: "skipReward" };

    case "takeReward": {
      if (typeof decoded.rewardIndex !== "number" || !Number.isInteger(decoded.rewardIndex)) {
        throw new Error(`Invalid takeReward action: ${raw}`);
      }

      return { type: "takeReward", rewardIndex: decoded.rewardIndex };
    }

    case "buyShop": {
      if (typeof decoded.saleIndex !== "number" || !Number.isInteger(decoded.saleIndex)) {
        throw new Error(`Invalid buyShop action: ${raw}`);
      }

      return { type: "buyShop", saleIndex: decoded.saleIndex };
    }

    case "removeDeckCard": {
      if (typeof decoded.deckIndex !== "number" || !Number.isInteger(decoded.deckIndex)) {
        throw new Error(`Invalid removeDeckCard action: ${raw}`);
      }

      return { type: "removeDeckCard", deckIndex: decoded.deckIndex };
    }

    case "leaveShop":
      return { type: "leaveShop" };

    default:
      throw new Error(`Unsupported action type: ${decoded.type}`);
  }
}

function parseActions(raw: string): RunAction[] {
  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON action list: ${raw}`);
  }

  if (!Array.isArray(decoded)) {
    throw new Error("--actions must be a JSON array");
  }

  return decoded.map((entry) => parseAction(JSON.stringify(entry)));
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

function encodeJson(value: unknown, pretty = false): string {
  return JSON.stringify(value, undefined, pretty ? 2 : 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getHeadlessUsage(locale: Locale): { commands: string[]; examples: string[]; localeOptions: Locale[] } {
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

export function renderSnapshot(seed: number, locale: Locale = DEFAULT_LOCALE): string {
  const state = createRun(sampleContent, seed);
  const observation = localizeObservation(observeRun(sampleContent, state), locale);

  return renderObservation(observation, locale);
}

function renderObservation(observation: Observation, locale: Locale): string {
  const mapSection = createMapListEntries(sampleContent.map, observation).map((entry) => formatMapLine(entry, locale));
  const recentLog = getRecentLogView(observation.log);

  const lines = [
    text(locale, "snapshotTitle"),
    `${text(locale, "seed")}: ${observation.seed}`,
    `${text(locale, "phase")}: ${localizePhaseLabel(observation.phase, locale)}`,
    `${text(locale, "hp")}: ${observation.hp}/${observation.maxHp}  ${text(locale, "gold")}: ${observation.gold}  ${text(locale, "floor")}: ${observation.floor}`,
    `${text(locale, "node")}: ${observation.currentNode.id} (${localizeNodeKind(observation.currentNode.kind, locale)})`,
    `${text(locale, "relics")}: ${observation.relics.map((relic) => relic.name).join(", ") || text(locale, "none")}`,
    "",
    `${text(locale, "map")}:`,
    getMapLegend(locale),
    ...mapSection,
    "",
  ];

  if (observation.phase === "combat") {
    lines.push(
      `${text(locale, "enemy")}: ${observation.enemy.name} ${text(locale, "hp")} ${observation.enemy.hp}/${observation.enemy.maxHp} ${text(locale, "block")} ${observation.enemy.block}`,
      `${text(locale, "intent")}: ${observation.enemy.intent.description}`,
      `${text(locale, "energy")} ${observation.energy}  ${text(locale, "block")} ${observation.block}  ${text(locale, "draw")} ${observation.drawPileCount}  ${text(locale, "discard")} ${observation.discardPileCount}`,
      "",
      `${text(locale, "hand")}:`,
    );

    for (const [index, card] of observation.hand.entries()) {
      lines.push(`${index + 1}. ${card.name} [${card.cost}] ${card.description}`);
    }
  } else if (observation.phase === "map") {
    lines.push(`${text(locale, "paths")}`);

    for (const [index, node] of observation.nextNodes.entries()) {
      lines.push(`${index + 1}. ${node.id} (${localizeNodeKind(node.kind, locale)})`);
    }
  } else if (observation.phase === "rest") {
    lines.push(`${text(locale, "rest")}:`);

    for (const [index, option] of observation.restOptions.entries()) {
      lines.push(`${index + 1}. ${option.label} - ${option.description}`);
    }
  } else if (observation.phase === "reward") {
    lines.push(`${text(locale, "reward")}:`);

    for (const [index, card] of observation.cardChoices.entries()) {
      lines.push(`${index + 1}. ${card.name} [${card.cost}] ${card.description}`);
    }

    lines.push(`s. ${text(locale, "skipReward")}`);
  } else if (observation.phase === "shop") {
    lines.push(`${text(locale, "shop")}:`);

    for (const [index, card] of observation.forSale.entries()) {
      lines.push(`${index + 1}. ${text(locale, "buy")} ${card.name} [${card.cost}]`);
    }

    lines.push("");
    lines.push(text(locale, "deckRemoval"));
    lines.push(`${text(locale, "cost")}: ${observation.removeDeckCardCost} ${text(locale, "removeCost")}.`);

    for (const entry of observation.removableDeckCards) {
      lines.push(`${entry.deckIndex + 1}. ${text(locale, "remove")} ${entry.card.name} (${observation.removeDeckCardCost} ${text(locale, "gold").toLowerCase()})`);
    }

    if (observation.removableDeckCards.length === 0) {
      lines.push(text(locale, "noRemovableCards"));
    }

    lines.push(`${observation.forSale.length + observation.removableDeckCards.length + 1}. ${text(locale, "leaveShop")}`);
  } else {
    lines.push(`${text(locale, "outcome")}: ${localizePhaseLabel(observation.phase, locale)}`);
  }

  lines.push("", `${text(locale, "recentLog")}:`);

  for (const entry of recentLog.entries) {
    lines.push(`- ${entry}`);
  }

  const earlierEvents = getEarlierEventsLine(recentLog.hiddenCount, locale);
  if (earlierEvents) {
    lines.push(earlierEvents);
  }

  return lines.join("\n");
}
