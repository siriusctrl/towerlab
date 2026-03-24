# CLI Guide

## Scope

The CLI has two modes:
- interactive TTY mode for humans
- deterministic `--json` mode for agents, scripts, and evaluation tooling

The same executable supports both.

## Quick Start

```bash
corepack pnpm cli -- --seed 7
corepack pnpm cli -- --seed 7 --lang zh
corepack pnpm cli -- --json create --seed 7 --lang zh
```

Language can be selected with `--lang en|zh`.
`--locale` is accepted as an alias.

## Interactive Mode

When stdout and stdin are attached to a TTY, `pnpm cli` starts the Ink interface.
The TUI enters the terminal alternate screen, redraws on terminal resize, and restores the previous screen on exit.
The layout also adapts between stacked and side-by-side panels based on terminal width.

Controls:
- combat: `1-9` play the indexed card, `e` ends the turn
- map: `1-9` choose the indexed path
- rest: `1-9` choose the indexed campfire action
- reward: `1-9` take the indexed reward, `s` skips
- shop: `1-9` buy, remove, or leave
- `q` quits
- `r` restarts after victory or defeat

## Map Panel

The TUI and non-TTY snapshot both show the full tower map.

Markers:
- `✓` nodes already taken on the current route
- `▶` current node
- `→` immediate next node when a path is not currently selectable
- `[1]`, `[2]`, ... immediate map choices during map phase
- `·` future nodes still reachable from the current route
- `×` nodes that belong to branches the current run can no longer reach

The map is rendered from content data, not from renderer-local state.

## Recent Activity

The CLI keeps a compact recent-activity panel instead of rendering the full log at all times.

- only the most recent entries are shown
- if older entries exist, the UI shows how many earlier events were collapsed
- on tighter terminals, the panel may be hidden so combat and map information stay readable
- core replay state still preserves the log behavior defined by `packages/core`

## Non-TTY Snapshot Mode

When the CLI is not attached to a TTY and `--json` is not present, it prints a deterministic text snapshot.

Example:

```bash
node packages/cli/dist/cli/src/main.js --seed 7 --lang zh
```

This snapshot includes:
- run header
- full tower map
- current phase details
- recent activity

## JSON Mode

`--json` enables machine-readable output.

Commands:
- `create`
- `observe`
- `step`
- `replay`
- `batch`

Examples:

```bash
towerlab --json create --seed 7 --lang zh
towerlab --json observe --seed 7 --actions '[{"type":"endTurn"}]'
towerlab --json step --seed 7 --actions '[{"type":"endTurn"}]' --action '{"type":"playCard","handIndex":0}'
towerlab --json replay --seed 7 --actions-file actions.json
towerlab --json batch --policy heuristic --seed-start 1 --count 10
```

Useful flags:
- `--pretty` pretty-prints JSON
- `--seed <int>` selects the deterministic run seed
- `--actions <json-array>` supplies prior actions inline
- `--actions-file <path>` loads prior actions from disk
- `--action <json-object>` supplies the single step action for `step`
- `--policy <name>` selects a baseline policy for `batch`
- `--seeds <a,b,c>` supplies explicit batch seeds
- `--seed-start <int> --count <int>` supplies a seed range for `batch`

## JSON Response Shape

`create`, `observe`, `step`, and `replay` return:
- `seed`
- `actions`
- `locale`
- `map`
- `state`
- `observation`
- `legalActions`

Additional command-specific fields:
- `step`: `action`, `previousActions`
- `replay`: `trace`
- `batch`: aggregated metrics plus per-seed run summaries

Field semantics:
- `state` is the raw core state and remains the source of truth
- `observation` is the player-facing projection and is localized when `--lang` is set
- `map` is the full graph from content so agents do not need to infer the tower from `nextNodes` alone
- `legalActions` is the current valid action set from `packages/core`

Node naming:
- TUI and snapshot text use localized display names such as `城门` or `Gate`
- JSON payloads keep stable raw ids such as `gate`, `hall`, and `market`
- action objects must continue using the raw `nodeId`

## Action Shapes

Supported action objects:

```json
{"type":"choosePath","nodeId":"hall"}
{"type":"playCard","handIndex":0}
{"type":"endTurn"}
{"type":"chooseRest","optionId":"recover"}
{"type":"skipReward"}
{"type":"takeReward","rewardIndex":1}
{"type":"buyShop","saleIndex":0}
{"type":"removeDeckCard","deckIndex":3}
{"type":"leaveShop"}
```

## Notes

- The renderer is a view. Game rules remain in `packages/core`.
- Localization is applied in the CLI layer.
- Seeds are deterministic across interactive, snapshot, and JSON paths.
