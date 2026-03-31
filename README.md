# TowerLab

CLI-native deckbuilding tower game for humans and agents.

## What this is

TowerLab is a TypeScript monorepo for a deterministic terminal deckbuilder inspired by roguelike card games.

The project has two equally important goals:
- build a game that a human can actually play in the terminal
- build a clean evaluation harness for long-horizon planning and agentic behavior

The current playable slice is small, but no longer toy-sized:
- two playable characters with different starter decks, relics, and card pools
- both characters now have materially broader STS-style card pools instead of near-starter-only runs
- campfires now offer percentage-based recovery or a one-card upgrade
- cards now support a small structured combat vocabulary beyond raw damage/block
- blessings now bias toward relic buffs and archetype-starting cards instead of flat gold/HP picks
- build-defining cards and blessing relics can establish combat passives that visibly change card evaluation during a run
- card views render emphasized keyword lines separately from effect text
- combat hands now use stronger color contrast between playable and blocked cards
- three acts, each starting with a blessing choice before route navigation
- acts now use deeper room stacks with more route decisions before each boss
- map generation now enforces per-path elite density bands so most routes stay in a controlled risk band while still leaving distinct easy/hard routes
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
corepack pnpm cli -- --seed 7 --character warrior

corepack pnpm cli -- --json create --seed 7 --character warrior --pretty
corepack pnpm cli -- --json observe --seed 7 --character warrior --actions '[]' --pretty
corepack pnpm cli -- --json batch --policy heuristic --seeds 7,8,9 --character warrior --pretty
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
- blessing choices now surface either a relic buff or a card pickup aimed at starting a deck direction

Key controls:
- character select: `1-9` choose character, `l` open character library
- blessing/map/rest: `1-9` choose the indexed option
- reward menu: `1-9` claim the indexed reward item
- reward card submenu: `1-9` choose the indexed card, `b` go back
- combat: `1-9` play the indexed card, `space` end turn
- reward: `s` skip remaining rewards
- shop top menu: `1` buy, `2` remove, `0` leave
- shop buy/remove submenus: `1-9` choose current page, `[` `]` page, `b` go back
- shop card prices vary by rarity
- deck removal cost increases across the whole run, does not reset between shops, and each shop allows at most 3 removals
- inspection panels: `d` status, `l` library, `[` `]` switch sections, `j/k` or arrow keys scroll, `esc` close
- `esc` quit
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
- `towerlab --json create --seed 7 --character warrior`
- `towerlab --json observe --seed 7 --character hunter --actions-file actions.json`
- `towerlab --json replay --seed 7 --character warrior --actions-file actions.json`
- `towerlab --json batch --policy random --seeds 7,8,9 --character hunter`

The JSON surface returns raw state plus player-facing observation data, legal actions, the full map, and structured log events.
Use this interface for agents and scripts instead of scraping TTY output.

## Current content model

The current card rarity model is:
- `common`
- `rare`
- `epic`

Rendered card titles now surface rarity directly:
- zh: `[普]`, `[稀]`, `[史]`
- en: `[C]`, `[R]`, `[E]`

Characters own their own starter decks, starter relics, reward pools, shop pools, and relic pools.
Core state stores deck cards as stable card instances, so upgrades are tracked per copy instead of per card id.
Enemies stay shared across characters and vary by act.

The current structured card vocabulary includes:
- `damage`
- `block`
- `draw`
- `energy`
- `heal`
- `weak`
- `vulnerable`
- `poison`
- `passives`
- `keywords`

Card descriptions are now rendered from these structured fields first in both CLI and snapshots.  
Fallback translation now runs only on unmatched description clauses for non-structured cards.

Rendered card blocks use a compact three-layer layout:
- title row: rarity badge plus card name and cost
- optional keyword row: emphasized keywords such as `Exhaust`, `Retain`, and `Ethereal`
- effect row: structured combat effects collapsed into one compact prose line

The structured keywords currently in use are:
- `exhaust`
- `retain`
- `ethereal`

The current structured passive effects include:
- `strikeBonusDamage`
- `exhaustBlock`
- `retainBlock`
- `attackPoison`
- `debuffBonusDamage`
- `debuffDraw`

Combat snapshots and the TUI surface active combat passives in a dedicated `Powers` line so run-defining buffs stay visible during play.
In TTY combat:
- wider layouts move `Combat Effects` into the right sidebar so enemy and hand flow stay uninterrupted
- tighter layouts collapse those effects into a one-line summary under the status bar

## Why TypeScript

One language across engine, content, CLI, and agent tooling keeps the project small and coherent.

## License

MIT
