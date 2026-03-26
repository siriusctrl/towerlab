# M5 — Character Runs + Multi-Act Structure

- Status: `done`

## Goal

Turn TowerLab from a single-character progression slice into a cleaner deckbuilder shape with explicit character context, multi-act progression, and a stronger inspection surface for both humans and agents.

## Why this milestone exists

Post-M4, the benchmark side existed, but the game side was still too thin.
The repo needed a more realistic run structure so planning pressure, content ownership, and agent-facing state all matched the actual game loop better.

## Included

- character-based content definitions
- per-character starter decks and starting relics
- per-character reward, shop, and relic pools
- two playable characters
- three-act tower progression
- blessing choice at the start of each act
- structured `LogEvent[]` state and observation logs
- TUI character selection
- TUI library and status inspection panels
- updated docs for the new gameplay and CLI contracts

## Explicit non-goals

- service layer or network API
- large event system
- large content explosion beyond the current two-character slice
- alternate renderer stack

## Acceptance criteria

- interactive TTY play can start from character selection or from an explicit `--character`
- each act begins with a blessing phase before route navigation
- the headless JSON contract requires character context and preserves deterministic replay
- `state.log` and `observation.log` expose structured events rather than renderer prose
- the TUI exposes both a character library view and an in-run status view

## Review bias

Keep the implementation direct.
Prefer a stronger end-state data model over temporary compatibility layers.
