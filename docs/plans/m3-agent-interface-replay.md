# M3 — Agent Interface + Replay

- Status: `done`

## Goal

Expose TowerLab as a clean, deterministic environment for agents without letting the TUI become the source of truth.

## Why this milestone exists

A real harness needs explicit legal actions, replayable state transitions, and a headless way to run agents against the same game logic.

## Included

- machine-enumerable `legalActions(content, state)` surface
- stable headless entrypoint for create / observe / step / replay flows
- seed plus character based replay contract
- step-by-step trace output for each run
- deterministic CLI/JSON mode for automation-friendly execution
- structured `LogEvent[]` logs in state and observation payloads

## Explicit non-goals

- REST service layer
- web UI
- plugin architecture
- training infrastructure
- large content explosion unrelated to the interface contract

## Acceptance criteria

- every interactive phase has a corresponding legal action representation, including blessing selection
- an agent can play a full run without scraping Ink output
- traces capture enough information to explain run outcomes
- a finished run can be replayed deterministically from seed, character, and chosen actions
- the TUI continues to consume core state rather than own it

## Delivered surface

1. `legalActions(content, state)` in core
2. headless runner entrypoint for create / observe / step / replay
3. trace format for run steps and terminal outcomes
4. replay utility that rebuilds a run from recorded actions
5. docs describing the agent-facing surface

## Agent Surface Doc

The concrete surface is tracked in [`docs/agent-interface.md`](../agent-interface.md).
This milestone is complete because that surface is implemented and verified in both core and CLI.

## Review bias

Prefer the smallest possible interface that is still good enough for agent evaluation.
Do not service-ify the project too early.
