# Agent Interface

TowerLab's agent surface is intentionally small. The goal is to let agents drive the same deterministic game logic that powers the TUI, without scraping rendered text.

## Core Contract

Use the shared deterministic loop as the source of truth:

- `createSeededContent(seed, characterId)` creates the character-specific content view for a run
- `createRun(content, seed)` creates the initial run state
- `observeRun(content, state)` returns the current phase-specific observation
- `legalActions(content, state)` enumerates the actions that are valid right now
- `applyAction(content, state, action)` advances the run by one chosen action
- replay is `seed + characterId + ordered action history`

The legal action set stays phase-aligned:
- blessing: choose a blessing
- combat: play a card, end the turn
- map: choose a path
- rest: choose a campfire option, then possibly choose a deck card to upgrade
- reward: take a reward, or skip it
- shop: buy a card, remove a card, or leave
- victory and defeat: no actions

## JSON / Headless CLI

The CLI exposes a non-TTY mode for automation that speaks structured data instead of Ink output.

Minimal operations:
- create a run from seed plus character
- observe the current state after prior actions
- step the run with one action
- replay a recorded seed plus action list
- batch baseline policies across many seeds for a fixed character

Headless mode requires `--character`.
That requirement is intentional: the current game is character-based, so seed alone is not enough to identify a run.

Typical entrypoints:
- `towerlab --json create --seed 7 --character warrior`
- `towerlab --json observe --seed 7 --character warrior --actions-file actions.json`
- `towerlab --json step --seed 7 --character warrior --actions-file actions.json --action '{"type":"endTurn"}'`
- `towerlab --json replay --seed 7 --character hunter --actions-file actions.json`

## Data Contract

The TTY Ink UI remains the human-facing renderer and should not be treated as the data model.
Agents should read the JSON payloads directly.

Important properties of the current contract:
- `state` is the raw source of truth
- `observation` is the player-facing projection
- `legalActions` is the authoritative choice set
- `map` is returned explicitly so agents do not have to infer the tower from local next-node context
- `state.log` and `observation.log` are structured `LogEvent[]` arrays
- runs are multi-act and include character context, current act, and total act count
- `state.deck` is `CardInstance[]`, so upgrades apply to individual copies rather than all cards sharing an id
- observed card objects may include structured fields such as `damage`, `block`, `draw`, `energy`, `heal`, and `keywords`
- observed card objects also include `upgraded`, and rest observations expose both the current card and upgraded preview for each upgradable deck entry
- combat observations expose both current `energy` and turn-base `baseEnergy`

Agent rule:
- treat card metadata as structured data
- do not parse localized card description prose to recover mechanics

## Trace And Replay

Trace output is step-oriented:
- seed
- character id
- ordered action history
- initial observation plus one observation after each applied action
- terminal outcome

That is enough to explain a run, reproduce it, and inspect where a policy diverged.

For the batch layer that sits on top of this surface, see [`docs/evaluation.md`](./evaluation.md).
