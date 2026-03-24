# M3 — Agent Interface + Replay

- Status: `active`

## Goal

Expose TowerLab as a clean, deterministic environment for agents without letting the TUI become the source of truth.

## Why this milestone exists

Right now TowerLab is playable for humans, but the benchmark side is still weak.
A real harness needs explicit legal actions, replayable state transitions, and a headless way to run agents against the same game logic.

## Included

- machine-enumerable `legalActions(state)` surface
- stable headless entrypoint for create / observe / step flows
- step-by-step trace output for each run
- replay support from seed + action history
- deterministic CLI/JSON mode for automation-friendly execution

## Explicit non-goals

- REST service layer
- web UI
- plugin architecture
- training infrastructure
- large new content expansion

## Acceptance criteria

- every interactive phase has a corresponding legal action representation
- an agent can play a full run without scraping Ink output
- traces capture enough information to explain run outcomes
- a finished run can be replayed deterministically from seed plus chosen actions
- the TUI continues to consume core state rather than own it

## Proposed deliverables

1. `legalActions(state)` in core
2. headless runner entrypoint for create / observe / apply flows
3. trace format for run steps and terminal outcomes
4. replay utility that can rebuild a run from recorded actions
5. docs describing the agent-facing surface

## Review bias

Prefer the smallest possible interface that is still good enough for agent evaluation.
Do not service-ify the project too early.
