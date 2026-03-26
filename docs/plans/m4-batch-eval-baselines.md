# M4 — Batch Eval + Baseline Bots

- Status: `done`

## Goal

Turn TowerLab from a single-run environment into a benchmark that can compare policies across many seeds.

## Why this milestone exists

After the agent interface exists, the next step is to make large-scale evaluation and debugging easy without adding a second control path.

## Included

- batch runner across many seeds
- summary metrics for wins, losses, gold, HP, and path choices
- baseline policies:
  - random
  - simple greedy combat bot
  - simple route/deck heuristic bot
- replay inspection for failed and successful seeds
- character-aware batch entrypoints using the same headless contract as single-run replay

## Current Target Surface

The concrete working contract is tracked in [`docs/evaluation.md`](../evaluation.md).

The implemented CLI shape is deterministic JSON batch mode with named policies and explicit character context, for example:
- `towerlab --json batch --policy random --seeds 7,8,9 --character vanguard`
- `towerlab --json batch --policy greedy --seed-start 1 --count 20 --character bulwark`
- `towerlab --json batch --policy heuristic --seed-start 100 --count 50 --character vanguard`

The batch output stays machine-readable and compact:
- aggregate metrics for wins, losses, ending gold, ending HP, and path choices
- per-run summaries with at least `seed`, `characterId`, terminal outcome, and `actions`

That keeps replay inspection simple because any returned run can be fed back into the existing replay flow.

## Explicit non-goals

- RL training loop
- distributed orchestration
- fancy dashboards
- leaderboard service

## Acceptance criteria

- the same policy produces deterministic results on the same seeds for the same character
- metrics are written in a machine-readable format
- baseline bots are simple enough to read in one sitting
- replay output is good enough to inspect obvious model mistakes

## Review bias

Baseline bots should be boring and legible.
Their job is to establish reference behavior, not to become a hidden game engine inside the evaluator.
