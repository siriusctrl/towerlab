import { sampleContent } from "@towerlab/content";
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

function isChoosePathAction(action: RunAction, legal: RunAction[]): action is { type: "choosePath"; nodeId: string } {
  return action.type === "choosePath" && legal.some((candidate) => candidate.type === "choosePath" && candidate.nodeId === action.nodeId);
}

function isPlayCardAction(action: RunAction, legal: RunAction[]): action is { type: "playCard"; handIndex: number } {
  return action.type === "playCard" && legal.some((candidate) => candidate.type === "playCard" && candidate.handIndex === action.handIndex);
}

function isChooseRestAction(action: RunAction, legal: RunAction[]): action is { type: "chooseRest"; optionId: "recover" | "fortify" } {
  return (
    action.type === "chooseRest" &&
    legal.some((candidate) => candidate.type === "chooseRest" && candidate.optionId === action.optionId)
  );
}

function isTakeRewardAction(action: RunAction, legal: RunAction[]): action is { type: "takeReward"; rewardIndex: number } {
  return (
    action.type === "takeReward" &&
    legal.some((candidate) => candidate.type === "takeReward" && candidate.rewardIndex === action.rewardIndex)
  );
}

function isBuyShopAction(action: RunAction, legal: RunAction[]): action is { type: "buyShop"; saleIndex: number } {
  return action.type === "buyShop" && legal.some((candidate) => candidate.type === "buyShop" && candidate.saleIndex === action.saleIndex);
}

function isRemoveDeckCardAction(
  action: RunAction,
  legal: RunAction[],
): action is { type: "removeDeckCard"; deckIndex: number } {
  return (
    action.type === "removeDeckCard" &&
    legal.some((candidate) => candidate.type === "removeDeckCard" && candidate.deckIndex === action.deckIndex)
  );
}

function isLegalAction(action: RunAction, legal: RunAction[]): boolean {
  if (action.type === "endTurn" || action.type === "skipReward" || action.type === "leaveShop") {
    return legal.some((candidate) => candidate.type === action.type);
  }

  if (action.type === "choosePath") {
    return isChoosePathAction(action, legal);
  }

  if (action.type === "playCard") {
    return isPlayCardAction(action, legal);
  }

  if (action.type === "chooseRest") {
    return isChooseRestAction(action, legal);
  }

  if (action.type === "takeReward") {
    return isTakeRewardAction(action, legal);
  }

  if (action.type === "buyShop") {
    return isBuyShopAction(action, legal);
  }

  if (action.type === "removeDeckCard") {
    return isRemoveDeckCardAction(action, legal);
  }

  return false;
}

function mergePathChoices(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const merged = { ...a };
  for (const [nodeId, count] of Object.entries(b)) {
    merged[nodeId] = (merged[nodeId] ?? 0) + count;
  }
  return merged;
}

export function runSeedWithPolicy({ policy, policyName, seed, content = sampleContent, maxSteps = DEFAULT_MAX_STEPS }: RunSeedConfig): RunSeedSummary {
  let state = createRun(content, seed);
  const actions: RunAction[] = [];
  const pathChoiceCounts: Record<string, number> = {};
  let error: string | undefined;
  let outcome: RunSeedSummary["outcome"] = "incomplete";
  let status: "ok" | "error" = "ok";

  for (let step = 0; step < maxSteps; step++) {
    const observation = observeRun(content, state);

    if (state.phase === "victory" || state.phase === "defeat") {
      outcome = state.phase === "victory" ? "win" : "loss";
      break;
    }

    const legal = legalActions(content, state);
    if (legal.length === 0) {
      status = "error";
      error = "policy run ended with no legal actions";
      break;
    }

    const action = policy({
      content,
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

    state = applyAction(content, state, action);
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

export function runBatchWithPolicy({ policy, policyName, seeds, content, maxSteps }: BatchConfig): BatchSummary {
  const runs = seeds.map((seed) =>
    runSeedWithPolicy({
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
