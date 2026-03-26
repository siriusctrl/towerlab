# Evaluation Surface

TowerLab's batch-eval surface stays intentionally small. The goal is to compare simple policies across many deterministic runs without adding a service layer or a second game engine.

## Batch Mode

The working CLI entrypoint is deterministic JSON batch mode.
Batch runs are character-specific and therefore require `--character`.

Examples:
- `towerlab --json batch --policy random --seeds 7,8,9 --character vanguard`
- `towerlab --json batch --policy greedy --seed-start 1 --count 20 --character bulwark`
- `towerlab --json batch --policy heuristic --seed-start 100 --count 50 --character vanguard`

The current game model being evaluated is:
- a character-based run
- 3 acts
- a blessing choice at the start of each act
- deterministic combat, routing, rewards, shops, and relic effects

The machine-readable output should cover:
- policy name
- character id
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
- character id
- terminal outcome
- action history

That is enough to feed a specific run back into the replay interface and inspect obvious mistakes.

## Baseline Policies

The baseline bots should be boring and legible:
- `random`: picks among legal actions deterministically for the same run
- `greedy`: favors immediate combat value and simple direct choices
- `heuristic`: adds lightweight route, reward, and shop preferences

These policies are reference behavior, not hidden game solvers. They should be readable in one pass and easy to compare.

## Relationship To The Agent Surface

Batch mode builds directly on the agent surface:
- `legalActions(...)` provides the choice set
- `applyAction(...)` advances the run
- replay from `seed + characterId + action history` explains batch outcomes
- batch summaries inherit structured state and observation logs from the shared core contract

Batch tooling should stay a thin layer over that surface rather than introducing a parallel control path.
