# M4 — Batch Eval + Baseline Bots

- Status: `planned`

## Goal

Turn TowerLab from a single-run environment into a benchmark that can compare policies across many seeds.

## Why this milestone exists

A harness is only useful if it can produce repeatable comparisons.
After M3 exposes a clean agent interface, the next step is to make large-scale evaluation and debugging easy.

## Included

- batch runner across many seeds
- summary metrics for wins, losses, gold, HP, and path choices
- baseline policies:
  - random
  - simple greedy combat bot
  - simple route/deck heuristic bot
- replay inspection for failed and successful seeds

## Explicit non-goals

- RL training loop
- distributed orchestration
- fancy dashboards
- leaderboard service

## Acceptance criteria

- the same policy produces deterministic results on the same seeds
- metrics are written in a machine-readable format
- baseline bots are simple enough to read in one sitting
- replay output is good enough to inspect obvious model mistakes

## Review bias

Baseline bots should be boring and legible.
Their job is to establish reference behavior, not to become a hidden game engine inside the evaluator.
