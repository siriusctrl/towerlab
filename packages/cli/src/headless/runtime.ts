import { createSeededContent } from "@towerlab/content";
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
  type RunContent,
  type RunState,
} from "@towerlab/core";

import { runBatchWithPolicy } from "../eval.js";
import { DEFAULT_LOCALE, localizeErrorMessage, localizeObservation, readLocale, type Locale } from "../i18n.js";
import { getBaselinePolicy } from "../policies.js";
import { getHeadlessUsage, parseHeadlessArgs, readSeed } from "./args.js";
import type {
  HeadlessCreateResponse,
  HeadlessObserveResponse,
  HeadlessParseResult,
  HeadlessReplayResponse,
  HeadlessSnapshot,
  HeadlessStepResponse,
} from "./types.js";

export { readSeed } from "./args.js";

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

  const content = createSeededContent(parsed.seed);

  if (parsed.command === "create") {
    const state = createRun(content, parsed.seed);

    return {
      command: "create",
      ...createSnapshot(content, parsed.seed, [], state, parsed.locale),
      locale: parsed.locale,
    };
  }

  if (parsed.command === "observe") {
    const state = replayRun(content, parsed.seed, parsed.actions);

    return {
      command: "observe",
      ...createSnapshot(content, parsed.seed, parsed.actions, state, parsed.locale),
      locale: parsed.locale,
    };
  }

  if (parsed.command === "step") {
    if (!parsed.action) {
      throw new Error(localizeErrorMessage("step mode requires --action", parsed.locale));
    }

    const previousState = replayRun(content, parsed.seed, parsed.actions);
    const nextState = applyAction(content, previousState, parsed.action);
    const allActions = [...parsed.actions, parsed.action];

    return {
      command: "step",
      action: parsed.action,
      previousActions: parsed.actions,
      ...createSnapshot(content, parsed.seed, allActions, nextState, parsed.locale),
      locale: parsed.locale,
    };
  }

  const state = replayRun(content, parsed.seed, parsed.actions);
  const trace = traceRun(content, parsed.seed, parsed.actions).steps.map((entry, index) => ({
    step: index,
    action: entry.action,
    observation: localizeObservation(entry.observation, parsed.locale),
  }));

  return {
    command: "replay",
    trace,
    ...createSnapshot(content, parsed.seed, parsed.actions, state, parsed.locale),
    locale: parsed.locale,
  };
}

function createSnapshot(
  content: RunContent,
  seed: number,
  actions: RunAction[],
  state: RunState,
  locale: Locale = DEFAULT_LOCALE,
): HeadlessSnapshot {
  return {
    seed,
    actions,
    locale,
    map: content.map,
    state,
    observation: localizeObservation(observeRun(content, state), locale),
    legalActions: legalActions(content, state),
  };
}

function encodeJson(value: unknown, pretty = false): string {
  return JSON.stringify(value, undefined, pretty ? 2 : 0);
}
