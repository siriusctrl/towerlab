# MVP Plan

## Goal

Ship a reviewable playable terminal slice of TowerLab.

## Included in v0

- seeded run creation
- sample starter deck
- sample card data
- sample enemies and intents
- sample tower map with branching
- Ink-based interactive CLI
- deterministic combat, map, and rest transitions
- deterministic tests for run setup and combat flow

## Not included in v0

- shops
- relic system
- events
- HTTP proxy
- benchmark runner

## Acceptance criteria

- `pnpm typecheck` passes
- `pnpm test` passes
- `pnpm cli -- --seed 7` launches a deterministic playable run
- package boundaries remain simple and obvious
