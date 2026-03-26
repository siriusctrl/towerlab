import { createSeededContent, DEFAULT_CHARACTER_ID, sampleContent } from "@towerlab/content";
import {
  applyAction,
  createRun,
  legalActions,
  observeRun,
  type Observation,
  type RunAction,
  type RunContent,
  type RunState,
} from "@towerlab/core";

const DEFAULT_MAX_STEPS = 512;

export interface PolicyContext {
  content: RunContent;
  legalActions: RunAction[];
  observation: Observation;
  seed: number;
  state: RunState;
}

export type Policy = (context: PolicyContext) => RunAction | null;

export interface RunSeedOptions {
  characterId?: string;
  content?: RunContent;
  maxSteps?: number;
  policyName?: string;
}

export interface RunSeedConfig extends RunSeedOptions {
  policy: Policy;
  policyName: string;
  seed: number;
}

export interface RunSeedSummary {
  seed: number;
  policyName: string;
  terminalPhase: RunState["phase"];
  outcome: "win" | "loss" | "error" | "incomplete";
  finalGold: number;
  finalHp: number;
  finalFloor: number;
  steps: number;
  actions: RunAction[];
  pathChoiceCounts: Record<string, number>;
  error?: string;
}

export interface BatchConfig extends RunSeedOptions {
  characterId: string;
  policy: Policy;
  policyName: string;
  seeds: number[];
}

export interface BatchAggregateMetrics {
  wins: number;
  losses: number;
  averageGold: number;
  averageEndingHp: number;
  pathChoiceCounts: Record<string, number>;
}

export interface BatchSummary {
  policyName: string;
  seeds: number[];
  runs: RunSeedSummary[];
  metrics: BatchAggregateMetrics;
}

function actionsMatch(a: RunAction, b: RunAction): boolean {
  if (a.type !== b.type) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key]);
}

function isLegalAction(action: RunAction, legal: RunAction[]): boolean {
  return legal.some((candidate) => actionsMatch(action, candidate));
}

function mergePathChoices(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const merged = { ...a };
  for (const [nodeId, count] of Object.entries(b)) {
    merged[nodeId] = (merged[nodeId] ?? 0) + count;
  }
  return merged;
}

export function runSeedWithPolicy({
  policy,
  policyName,
  seed,
  characterId = DEFAULT_CHARACTER_ID,
  content = sampleContent,
  maxSteps = DEFAULT_MAX_STEPS,
}: RunSeedConfig): RunSeedSummary {
  const runContent = content === sampleContent ? createSeededContent(seed, characterId) : content;
  let state = createRun(runContent, seed);
  const actions: RunAction[] = [];
  const pathChoiceCounts: Record<string, number> = {};
  let error: string | undefined;
  let outcome: RunSeedSummary["outcome"] = "incomplete";
  let status: "ok" | "error" = "ok";

  for (let step = 0; step < maxSteps; step++) {
    const observation = observeRun(runContent, state);

    if (state.phase === "victory" || state.phase === "defeat") {
      outcome = state.phase === "victory" ? "win" : "loss";
      break;
    }

    const legal = legalActions(runContent, state);
    if (legal.length === 0) {
      status = "error";
      error = "policy run ended with no legal actions";
      break;
    }

    const action = policy({
      content: runContent,
      legalActions: legal,
      observation,
      seed,
      state,
    });

    if (action === null) {
      status = "error";
      error = "policy returned no action";
      break;
    }

    if (!isLegalAction(action, legal)) {
      status = "error";
      error = "policy returned an illegal action";
      break;
    }

    if (action.type === "choosePath") {
      pathChoiceCounts[action.nodeId] = (pathChoiceCounts[action.nodeId] ?? 0) + 1;
    }

    state = applyAction(runContent, state, action);
    actions.push(action);
  }

  if (outcome === "incomplete" && status === "ok") {
    if (state.phase === "victory") {
      outcome = "win";
    } else if (state.phase === "defeat") {
      outcome = "loss";
    } else {
      outcome = "error";
      error = `max steps reached (${maxSteps})`;
    }
  }

  if (status === "error" && error !== undefined) {
    outcome = "error";
  }

  return {
    actions,
    error,
    finalFloor: state.floor,
    finalGold: state.gold,
    finalHp: state.hp,
    outcome,
    pathChoiceCounts,
    policyName,
    seed,
    steps: actions.length,
    terminalPhase: state.phase,
  };
}

function computePathChoiceCounts(runs: RunSeedSummary[]): Record<string, number> {
  return runs.reduce((acc, run) => mergePathChoices(acc, run.pathChoiceCounts), {});
}

export function runBatchWithPolicy({ policy, policyName, seeds, characterId, content, maxSteps }: BatchConfig): BatchSummary {
  const runs = seeds.map((seed) =>
    runSeedWithPolicy({
      characterId,
      content,
      maxSteps,
      policy,
      policyName,
      seed,
    }),
  );

  const metrics: BatchAggregateMetrics = {
    losses: runs.filter((run) => run.outcome === "loss").length,
    wins: runs.filter((run) => run.outcome === "win").length,
    averageGold: runs.length === 0 ? 0 : runs.reduce((sum, run) => sum + run.finalGold, 0) / runs.length,
    averageEndingHp: runs.length === 0 ? 0 : runs.reduce((sum, run) => sum + run.finalHp, 0) / runs.length,
    pathChoiceCounts: computePathChoiceCounts(runs),
  };

  return {
    policyName,
    seeds,
    runs,
    metrics,
  };
}
