# M1 — First Playable Terminal Slice

- Status: `done`
- Superseded by later milestones as the active target, but kept as the record of the first playable slice.

## Goal

Ship the smallest reviewable TowerLab version that a human can actually play in the terminal.

## Included

- seeded run creation
- sample starter deck
- sample card data
- sample enemies and intents
- sample tower map with branching
- Ink-based interactive CLI
- deterministic combat and rest transitions
- deterministic tests for run setup and combat flow

## Explicit non-goals

- shops
- relic system
- benchmark runner
- headless evaluation interface
- events

## Acceptance criteria

- `pnpm typecheck` passes
- `pnpm test` passes
- `pnpm cli -- --seed 7` launches a deterministic playable run in a TTY and prints a deterministic opening snapshot otherwise
- package boundaries remain simple and obvious

## Notes

This milestone is complete and preserved mainly as history.
For current planning, use the milestone index and later milestone docs in this directory.
