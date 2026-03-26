# TowerLab

CLI-native deckbuilding tower game for humans and agents.

## What this is

TowerLab is a TypeScript monorepo for a deterministic terminal deckbuilder inspired by roguelike card games.

The project has two equally important goals:
- build a game that a human can actually play in the terminal
- build a clean evaluation harness for long-horizon planning and agentic behavior

The current playable slice is small, but no longer toy-sized:
- two playable characters with different starter decks, relics, and card pools
- cards now support a small structured combat vocabulary beyond raw damage/block
- card views render emphasized keyword lines separately from effect text
- three acts, each starting with a blessing choice before route navigation
- deterministic combat, rewards, shop, relics, and branching map routing
- TUI status and library panels for inspecting current run state and character content
- headless JSON mode for replay, policy evaluation, and agent control

## Design stance

- engine first
- deterministic seeds
- renderer is view, not truth
- simple rules over clever architecture
- no speculative service or plugin layer

## Monorepo layout

```text
packages/
  core/     pure rules, deterministic state transitions, structured log events
  content/  characters, cards, relics, enemies, act configs, seeded map generation
  cli/      Ink renderer, snapshots, headless JSON mode, baseline policies

docs/
  cli.md
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
The current agent-facing contract lives in `docs/agent-interface.md`.
The current batch-eval contract lives in `docs/evaluation.md`.

## Development

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm test

corepack pnpm cli -- --seed 7
corepack pnpm cli -- --seed 7 --lang zh
corepack pnpm cli -- --seed 7 --character vanguard

corepack pnpm cli -- --json create --seed 7 --character vanguard --pretty
corepack pnpm cli -- --json observe --seed 7 --character vanguard --actions '[]' --pretty
corepack pnpm cli -- --json batch --policy heuristic --seeds 7,8,9 --character vanguard --pretty
```

## Interactive CLI

`pnpm cli` launches the playable terminal UI.

Behavior depends on the environment:
- in a real TTY, the Ink UI starts
- without a TTY and without `--json`, the CLI prints a deterministic text snapshot
- if snapshot mode is used without `--character`, it falls back to the default character so the output stays deterministic

TTY flow:
- without `--character`, the run starts at character selection
- with `--character`, the UI skips selection and starts that character immediately
- each act opens with a blessing phase before the first route choice

Key controls:
- character select: `1-9` choose character, `l` open character library
- blessing/map/rest/reward: `1-9` choose the indexed option
- combat: `1-9` play the indexed card, `e` end turn
- reward: `s` skip reward
- shop top menu: `1` buy, `2` remove, `0` leave
- shop buy/remove submenus: `b` go back
- inspection panels: `d` status, `l` library, `[` `]` switch sections, `j/k` or arrow keys scroll, `esc` close
- `q` quit
- `r` restart after victory or defeat

The route tree is rendered directly in the main play surface rather than a separate map screen.
The TUI also adapts to terminal resize and keeps route, combat, and recent activity in one terminal-native layout.

Detailed CLI behavior lives in `docs/cli.md`.

## Headless JSON mode

The same entrypoint also exposes the automation surface.
Headless mode always requires `--character`.

Supported commands:
- `create`
- `observe`
- `step`
- `replay`
- `batch`

Examples:
- `towerlab --json create --seed 7 --character vanguard`
- `towerlab --json observe --seed 7 --character bulwark --actions-file actions.json`
- `towerlab --json replay --seed 7 --character vanguard --actions-file actions.json`
- `towerlab --json batch --policy random --seeds 7,8,9 --character bulwark`

The JSON surface returns raw state plus player-facing observation data, legal actions, the full map, and structured log events.
Use this interface for agents and scripts instead of scraping TTY output.

## Current content model

The current card rarity model is:
- `common`
- `rare`
- `epic`

Characters own their own starter decks, starter relics, reward pools, shop pools, and relic pools.
Enemies stay shared across characters and vary by act.

The current structured card vocabulary includes:
- `damage`
- `block`
- `draw`
- `energy`
- `heal`
- `keywords`

The first structured keyword currently in use is:
- `exhaust`

## Why TypeScript

One language across engine, content, CLI, and agent tooling keeps the project small and coherent.

## License

MIT
