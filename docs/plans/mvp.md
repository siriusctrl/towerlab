# MVP Plan

## Goal

Ship the smallest playable terminal slice of TowerLab.

## Included in v0

- seeded run creation
- sample starter deck
- sample card data
- sample tower map with branching
- ASCII observation rendering
- deterministic tests for run setup

## Not included in v0

- full battle loop
- shops
- relic system
- events
- HTTP proxy
- benchmark runner

## Acceptance criteria

- `pnpm typecheck` passes
- `pnpm test` passes
- `pnpm cli -- --seed 7` prints a deterministic opening state
- package boundaries remain simple and obvious
