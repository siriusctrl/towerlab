# TowerLab

CLI-native deckbuilding tower game for humans and agents.

## What this is

TowerLab is a TypeScript monorepo for a simple terminal game inspired by deckbuilding roguelikes.

The project has two equally important goals:
- build a game that a human can play in the terminal
- build a clean evaluation harness for long-term planning and agentic behavior

The current repo intentionally stays small:
- pure game state in `packages/core`
- data-only starter content in `packages/content`
- Ink-based terminal UI in `packages/cli`

There is no web app, no service layer, and no speculative abstraction in v0.

## Design stance

- engine first
- deterministic seeds
- renderer is view, not truth
- minimal flavor text
- simple rules over clever architecture

## Monorepo layout

```text
packages/
  core/     pure rules and state transitions
  content/  cards, starter deck, sample tower map
  cli/      terminal renderer and local executable

docs/
  agent-interface.md
  architecture.md
  evaluation.md
  golden-principles.md
  plans/INDEX.md
  plans/*.md
```

## Milestone planning

Milestones are tracked in `docs/plans/INDEX.md` and expanded in one doc per milestone.
This is the stable roadmap source of truth for both humans and agents.
The current agent-facing contract for M3 lives in `docs/agent-interface.md`.
The current M4 batch-eval contract lives in `docs/evaluation.md`.

## Development

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
corepack pnpm cli -- --seed 7
corepack pnpm cli -- --json create --seed 7
```

`pnpm cli` launches the playable MVP slice. In a real terminal it starts the Ink UI; without a TTY it prints a deterministic opening snapshot instead. Controls are shown in the terminal:
- combat: number keys play cards, `e` ends the turn
- map/rest: number keys choose the option
- reward: number keys pick reward, `s` skips reward
- shop: number keys buy or remove a card, or leave
- `q` quits
- `r` restarts after win/loss

The same entrypoint also exposes the headless harness surface. The current target shape is:
- `towerlab --json create --seed 7`
- `towerlab --json replay --seed 7 --actions-file actions.json`
- `towerlab --json batch --policy random --seeds 7,8,9`

## Why TypeScript

One language across engine, content, CLI, and future agent interfaces keeps the project small and coherent.

## License

MIT
