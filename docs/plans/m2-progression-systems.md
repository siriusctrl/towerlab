# M2 — Progression Systems

- Status: `done`
- Landed on `main` via PR #2

## Goal

Turn TowerLab from a playable combat loop into a game with actual medium-horizon planning pressure.

## Why this milestone exists

A tower deckbuilder is not interesting as a planning environment if each fight is isolated.
The game needs persistent rewards and route tradeoffs so choices in one encounter affect later ones.

## Included

- post-combat card rewards with skip
- shop phase with buy + remove + leave actions
- minimal relic system with simple deterministic effects
- map routes with battle / elite / rest / shop / boss tradeoffs
- Ink TUI support for reward and shop phases
- tests covering progression, rewards, shop behavior, and relic effects

## Explicit non-goals

- events
- benchmark runner
- headless evaluation API
- baseline bots
- web UI

## Acceptance criteria

- reward, shop, and relic state live in core, not in the renderer
- route choice creates real tradeoffs rather than cosmetic branching
- shop removal has an explicit cost
- relic effects are deterministic and covered by tests
- `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm cli -- --seed 7` pass

## Notes

This milestone is complete. The highest-value follow-up is not more content breadth; it is exposing the game cleanly to agents and evaluation tooling.
