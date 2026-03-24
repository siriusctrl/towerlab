# Evaluation Surface

TowerLab's M4 surface stays intentionally small. The goal is to compare simple policies across many seeds without adding a service layer or a second game engine.

## Batch Mode

The target CLI entrypoint is a deterministic JSON batch mode:

- `towerlab --json batch --policy random --seeds 7,8,9`
- `towerlab --json batch --policy greedy --seed-start 1 --count 20`
- `towerlab --json batch --policy heuristic --seed-start 100 --count 50`

The exact flag spelling can stay small, but the machine-readable output should cover:

- policy name
- seed list or seed range
- aggregate metrics:
  - wins
  - losses
  - average ending gold
  - average ending HP
  - path choice counts
- per-run summaries for replay inspection

Per-run summaries should include at least:

- seed
- terminal outcome
- action history

That is enough to feed a specific run back into the existing replay interface and inspect obvious mistakes.

## Baseline Policies

The baseline bots should be boring and legible:

- `random`: picks among legal actions deterministically for the same run
- `greedy`: favors immediate combat value and simple direct choices
- `heuristic`: adds lightweight route, reward, and shop preferences

These policies are reference behavior, not hidden game solvers. They should be readable in one pass and easy to compare.

## Relationship To M3

M4 builds directly on the M3 agent surface:

- `legalActions(...)` provides the choice set
- `applyAction(...)` advances the run
- replay from `seed + action history` explains batch outcomes

Batch tooling should stay a thin layer over that surface rather than introducing a parallel control path.
