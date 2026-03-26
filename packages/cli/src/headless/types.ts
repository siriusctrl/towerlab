import type { Observation, RunAction, RunState, TowerAct } from "@towerlab/core";

import type { Locale } from "../i18n.js";
import type { BaselinePolicyName } from "../policies.js";

export type HeadlessMode = "batch" | "create" | "observe" | "step" | "replay";

export interface HeadlessParseResult {
  action?: RunAction;
  actions: RunAction[];
  batchSeeds: number[];
  characterId?: string;
  command: HeadlessMode;
  help: boolean;
  locale: Locale;
  policyName?: BaselinePolicyName;
  pretty: boolean;
  seed: number;
}

export interface HeadlessTraceStep {
  step: number;
  action: RunAction | null;
  observation: Observation;
}

export interface HeadlessSnapshot {
  seed: number;
  actions: RunAction[];
  locale: Locale;
  acts: TowerAct[];
  state: RunState;
  observation: Observation;
  legalActions: RunAction[];
}

export interface HeadlessCreateResponse extends HeadlessSnapshot {
  command: "create";
}

export interface HeadlessObserveResponse extends HeadlessSnapshot {
  command: "observe";
}

export interface HeadlessStepResponse extends HeadlessSnapshot {
  command: "step";
  action: RunAction;
  previousActions: RunAction[];
}

export interface HeadlessReplayResponse extends HeadlessSnapshot {
  command: "replay";
  trace: HeadlessTraceStep[];
}
