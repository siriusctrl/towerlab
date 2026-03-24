# Agent Interface

TowerLab's M3 surface is intentionally small. The goal is to let agents drive the same deterministic game logic that powers the TUI, without scraping rendered text.

## Core Contract

Use the core loop as the source of truth:

- `createRun(content, seed)` creates a deterministic run.
- `observeRun(content, state)` returns the current phase-specific observation.
- `legalActions(...)` enumerates the actions that are valid right now.
- `applyAction(content, state, action)` advances the run by one chosen action.
- replay is just `seed + ordered action history`.

The legal action set should stay phase-aligned:

- combat: play a card, end the turn
- map: choose a path
- rest: choose a campfire option
- reward: take a reward, or skip it
- shop: buy a card, remove a card, or leave
- victory and defeat: no actions

## JSON / Headless CLI

The CLI should expose a non-TTY mode for automation that speaks structured data instead of Ink output.

The minimal operations are:

- create a run from a seed and content
- observe the current state
- step the run with one action
- replay a recorded seed plus action list

The JSON payloads should be stable enough for agents and batch tools to read directly. The TTY Ink UI remains the human-facing renderer and should not be treated as the data model.

Typical entrypoints look like:

- `towerlab --json create --seed 7`
- `towerlab --json observe --seed 7 --actions-file actions.json`
- `towerlab --json step --seed 7 --actions-file actions.json --action '{"type":"endTurn"}'`
- `towerlab --json replay --seed 7 --actions-file actions.json`

## Trace And Replay

For M3, trace output should be step-oriented:

- seed
- action history
- initial observation plus one observation after each applied action
- terminal outcome

That is enough to explain a run, reproduce it, and inspect where a policy diverged.

For the M4 batch layer that sits on top of this surface, see [`docs/evaluation.md`](./evaluation.md).
