import fs from "node:fs";

import { sampleContent } from "@towerlab/content";
import {
  applyAction,
  createRun,
  legalActions,
  observeRun,
  replayRun,
  traceRun,
  type Observation,
  type RunAction,
  type RunState,
} from "@towerlab/core";

import { runBatchWithPolicy } from "./eval.js";
import { BASELINE_POLICY_NAMES, getBaselinePolicy, type BaselinePolicyName } from "./policies.js";

export { App, type AppProps } from "./app.js";

type HeadlessMode = "batch" | "create" | "observe" | "step" | "replay";

type HeadlessParseResult = {
  action?: RunAction;
  actions: RunAction[];
  batchSeeds: number[];
  command: HeadlessMode;
  help: boolean;
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
};

type HeadlessResponse =
  | HeadlessBatchResponse
  | HeadlessCreateResponse
  | HeadlessObserveResponse
  | HeadlessStepResponse
  | HeadlessReplayResponse;

const DEFAULT_SEED = 7;

export function readSeed(args: string[]): number {
  const seedFlagIndex = args.indexOf("--seed");

  if (seedFlagIndex === -1) {
    return DEFAULT_SEED;
  }

  const rawSeed = args[seedFlagIndex + 1];
  const seed = Number(rawSeed);

  if (!Number.isInteger(seed)) {
    throw new Error("--seed must be an integer");
  }

  return seed;
}

export function isHeadlessMode(args: string[]): boolean {
  return args.includes("--json");
}

export function runHeadless(args: string[]): string {
  const parsed = parseHeadlessArgs(args);

  if (parsed.help) {
    return encodeJson({ command: "help", usage: getHeadlessUsage() }, parsed.pretty);
  }

  const response = createHeadlessResponse(parsed);
  return encodeJson(response, parsed.pretty);
}

function createHeadlessResponse(parsed: HeadlessParseResult): HeadlessResponse {
  if (parsed.command === "batch") {
    if (!parsed.policyName) {
      throw new Error("batch mode requires --policy");
    }

    if (parsed.batchSeeds.length === 0) {
      throw new Error("batch mode requires --seeds or --seed-start with --count");
    }

    const policy = getBaselinePolicy(parsed.policyName);

    return {
      command: "batch",
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
      ...createSnapshot(parsed.seed, [], state),
    };
  }

  if (parsed.command === "observe") {
    const state = replayRun(sampleContent, parsed.seed, parsed.actions);

    return {
      command: "observe",
      ...createSnapshot(parsed.seed, parsed.actions, state),
    };
  }

  if (parsed.command === "step") {
    if (!parsed.action) {
      throw new Error("step mode requires --action");
    }

    const previousState = replayRun(sampleContent, parsed.seed, parsed.actions);
    const nextState = applyAction(sampleContent, previousState, parsed.action);
    const allActions = [...parsed.actions, parsed.action];

    return {
      command: "step",
      action: parsed.action,
      previousActions: parsed.actions,
      ...createSnapshot(parsed.seed, allActions, nextState),
    };
  }

  const state = replayRun(sampleContent, parsed.seed, parsed.actions);
  const trace = traceRun(sampleContent, parsed.seed, parsed.actions).steps.map((entry, index) => ({
    step: index,
    action: entry.action,
    observation: entry.observation,
  }));

  return {
    command: "replay",
    trace,
    ...createSnapshot(parsed.seed, parsed.actions, state),
  };
}

function createSnapshot(seed: number, actions: RunAction[], state: RunState): HeadlessSnapshot {
  return {
    seed,
    actions,
    state,
    observation: observeRun(sampleContent, state),
    legalActions: legalActions(sampleContent, state),
  };
}

function parseHeadlessArgs(args: string[]): HeadlessParseResult {
  const parsed: HeadlessParseResult = {
    actions: [],
    batchSeeds: [],
    command: "create",
    help: false,
    pretty: false,
    seed: readSeed(args),
  };
  let seedStart: number | undefined;
  let count: number | undefined;
  let usedBatchSeedFlags = false;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--json") {
      continue;
    }

    if (arg === "--help") {
      parsed.help = true;
      continue;
    }

    if (arg === "--seed") {
      parsed.seed = requireNextNumberArg(args, index, "--seed");
      index += 1;
      continue;
    }

    if (arg === "--seed-start") {
      usedBatchSeedFlags = true;
      seedStart = requireNextNumberArg(args, index, "--seed-start");
      index += 1;
      continue;
    }

    if (arg === "--count") {
      usedBatchSeedFlags = true;
      count = requireNextNumberArg(args, index, "--count");
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
        throw new Error(`--policy must be one of ${BASELINE_POLICY_NAMES.join(", ")}`);
      }

      parsed.policyName = policyName;
      index += 1;
      continue;
    }

    if (arg === "--seeds") {
      usedBatchSeedFlags = true;
      parsed.batchSeeds = parseSeeds(requireNextArg(args, index, "--seeds"));
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
      throw new Error("--seed-start and --count must be provided together");
    }

    if (count <= 0) {
      throw new Error("--count must be a positive integer");
    }

    parsed.batchSeeds = Array.from({ length: count }, (_, offset) => seedStart + offset);
  }

  if (parsed.command === "create" && (parsed.actions.length > 0 || parsed.action)) {
    throw new Error("create mode does not accept actions");
  }

  if (parsed.command === "batch" && (parsed.actions.length > 0 || parsed.action)) {
    throw new Error("batch mode does not accept actions");
  }

  if (parsed.command !== "batch" && (parsed.policyName || parsed.batchSeeds.length > 0 || usedBatchSeedFlags)) {
    throw new Error("--policy, --seeds, --seed-start, and --count are only valid in batch mode");
  }

  if ((parsed.command === "observe" || parsed.command === "replay") && parsed.action) {
    throw new Error(`${parsed.command} mode does not accept --action`);
  }

  if (parsed.command === "step" && !parsed.action) {
    throw new Error("step mode requires --action");
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

function requireNextNumberArg(args: string[], index: number, flag: string): number {
  const raw = requireNextArg(args, index, flag);
  const parsed = Number(raw);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${flag} must be an integer`);
  }

  return parsed;
}

function isHeadlessCommand(value: string): value is HeadlessMode {
  return value === "batch" || value === "create" || value === "observe" || value === "step" || value === "replay";
}

function isBaselinePolicyName(value: string): value is BaselinePolicyName {
  return BASELINE_POLICY_NAMES.includes(value as BaselinePolicyName);
}

function parseSeeds(raw: string): number[] {
  const seeds = raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value));

  if (seeds.length === 0) {
    throw new Error("--seeds must contain at least one integer");
  }

  if (seeds.length !== raw.split(",").filter((part) => part.trim().length > 0).length) {
    throw new Error("--seeds must be a comma-separated list of integers");
  }

  return seeds;
}

function encodeJson(value: unknown, pretty = false): string {
  return JSON.stringify(value, undefined, pretty ? 2 : 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getHeadlessUsage(): { commands: string[]; examples: string[] } {
  return {
    commands: ["batch", "create", "observe", "step", "replay"],
    examples: [
      "towerlab --json batch --policy random --seeds 7,8,9",
      "towerlab --json create --seed 7",
      "towerlab --json observe --seed 7 --actions '[{\"type\":\"endTurn\"}]'",
      "towerlab --json step --seed 7 --actions '[{\"type\":\"endTurn\"}]' --action '{\"type\":\"playCard\",\"handIndex\":0}'",
      "towerlab --json replay --seed 7 --actions-file actions.json",
    ],
  };
}

export function renderSnapshot(seed: number): string {
  const state = createRun(sampleContent, seed);
  const observation = observeRun(sampleContent, state);

  return renderObservation(observation);
}

function renderObservation(observation: Observation): string {
  const lines = [
    "TowerLab",
    `Seed: ${observation.seed}`,
    `Phase: ${observation.phase}`,
    `HP: ${observation.hp}/${observation.maxHp}  Gold: ${observation.gold}  Floor: ${observation.floor}`,
    `Node: ${observation.currentNode.id} (${observation.currentNode.kind})`,
    `Relics: ${observation.relics.map((relic) => relic.name).join(", ") || "None"}`,
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
  } else if (observation.phase === "reward") {
    lines.push("Reward:");

    for (const [index, card] of observation.cardChoices.entries()) {
      lines.push(`${index + 1}. ${card.name} [${card.cost}] ${card.description}`);
    }

    lines.push("s. Skip");
  } else if (observation.phase === "shop") {
    lines.push("Shop:");

    for (const [index, card] of observation.forSale.entries()) {
      lines.push(`${index + 1}. Buy ${card.name} [${card.cost}]`);
    }

    lines.push("");
    lines.push("Deck removal:");
    lines.push(`Cost: ${observation.removeDeckCardCost} gold each.`);

    for (const entry of observation.removableDeckCards) {
      lines.push(`${entry.deckIndex + 1}. Remove ${entry.card.name} (${observation.removeDeckCardCost} gold)`);
    }

    if (observation.removableDeckCards.length === 0) {
      lines.push("No removable cards are available.");
    }

    lines.push(`${observation.forSale.length + observation.removableDeckCards.length + 1}. Leave shop`);
  } else {
    lines.push(`Outcome: ${observation.phase === "victory" ? "Victory" : "Defeat"}`);
  }

  lines.push("", "Log:");

  for (const entry of observation.log) {
    lines.push(`- ${entry}`);
  }

  return lines.join("\n");
}
