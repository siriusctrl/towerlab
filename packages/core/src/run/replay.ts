import { applyAction } from "./actions.js";
import { createRun } from "./create.js";
import { observeRun } from "./observe.js";
import type { RunAction, RunContent, RunState, RunTrace, TraceStep } from "../types.js";

export function replayRun(content: RunContent, seed: number, actions: RunAction[]): RunState {
  let state = createRun(content, seed);

  for (const action of actions) {
    state = applyAction(content, state, action);
  }

  return state;
}

export function traceRun(content: RunContent, seed: number, actions: RunAction[]): RunTrace {
  let state = createRun(content, seed);
  const steps: TraceStep[] = [
    {
      action: null,
      observation: observeRun(content, state),
    },
  ];

  for (const action of actions) {
    state = applyAction(content, state, action);
    steps.push({
      action,
      observation: observeRun(content, state),
    });
  }

  return {
    seed,
    actions: [...actions],
    steps,
  };
}
