# Milestone Index

This directory is the source of truth for TowerLab milestone planning.

Use it the way harness engineering plans are meant to be used:
- keep milestones small enough to review in one pass
- define clear non-goals so scope stays honest
- write acceptance criteria that can actually be verified
- update the index and the touched milestone doc in the same PR when status changes

## Status legend

- `planned` — agreed direction, not started
- `active` — current implementation target
- `done` — landed on `main`
- `superseded` — kept for history, no longer current

## Milestones

| Milestone | Status | Focus | Doc |
|---|---|---|---|
| M1 | done | First playable terminal slice | [`mvp.md`](./mvp.md) |
| M2 | done | Progression systems: rewards, shop, relics, route tradeoffs | [`m2-progression-systems.md`](./m2-progression-systems.md) |
| M3 | done | Agent interface + replay | [`m3-agent-interface-replay.md`](./m3-agent-interface-replay.md) |
| M4 | done | Batch eval + baseline bots | [`m4-batch-eval-baselines.md`](./m4-batch-eval-baselines.md) |
| M5 | done | Character runs + multi-act structure | [`m5-character-runs-and-multi-act-structure.md`](./m5-character-runs-and-multi-act-structure.md) |

## Working agreement

When a contributor starts or finishes milestone work:
1. update the relevant milestone doc status
2. update this index if the active milestone changes
3. keep completed milestone docs stable except for factual corrections
4. do not dump roadmap notes into chat only — land them here

## Current recommendation

There is no active post-M5 milestone yet.
If work continues, land the next content-depth or benchmark-oriented scope as a new milestone doc rather than leaving it as chat-only intent.
