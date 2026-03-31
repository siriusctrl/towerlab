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
corepack pnpm cli -- --seed 7 --character warrior

corepack pnpm cli -- --json create --seed 7 --character warrior --pretty
corepack pnpm cli -- --json batch --policy heuristic --seeds 7,8,9 --character hunter --pretty
```

Language can be selected with `--lang en|zh`.
`--locale` is accepted as an alias.

## Interactive Mode

When stdout and stdin are attached to a TTY, `pnpm cli` starts the Ink interface.
The TUI enters the terminal alternate screen, redraws on terminal resize, and restores the previous screen on exit.

Entry behavior:
- without `--character`, the TUI starts at character selection
- with `--character`, the TUI starts that character directly
- each act begins with a blessing choice before the first route selection
- the current tower has 3 acts
- blessing menus now offer relic buffs and archetype-starting cards instead of flat gold / max-HP utility picks

In-run UI structure:
- the map tree is rendered inside the main play panel
- recent activity is shown as a compact panel instead of a full raw log dump
- `d` opens the current status panel
- `l` opens the current character library

Controls:
- character select:
  - `1-9` choose a character and start a run
  - `l` open the character library
  - while the library is open: `1-9` switch character page, `[` `]` switch section, `j/k` or `↑/↓` scroll, `l` or `esc` close
- blessing:
  - `1-9` choose the indexed blessing
- combat:
  - `1-9` play the indexed card
  - `space` end the turn
- map:
  - `1-9` choose the indexed path
- rest:
  - `1-9` choose the indexed campfire action
  - if `Upgrade` is chosen, `1-9` choose the indexed deck card to upgrade
- reward:
  - reward menu: `1-9` claim the indexed reward item
  - card submenu: `1-9` choose the indexed card reward, `b` go back
  - `s` skip all remaining rewards
- shop top menu:
  - `1` buy
  - `2` remove
  - `0` leave
- shop buy menu:
  - `1-9` buy the indexed card on the current page
  - `[` `]` switch pages when the shop inventory exceeds 9 cards
  - `b` go back
- shop remove menu:
  - `1-9` remove the indexed deck card on the current page
  - `[` `]` switch pages when more than 9 removable cards are shown
  - `b` go back
- inspection panels:
  - `d` toggle status
  - `l` toggle library
  - `[` `]` switch sections
  - `j/k` or `↑/↓` scroll
  - `esc` close
- global:
  - `esc` quit
  - `r` restart after victory or defeat

## Status And Library Panels

Status panel sections:
- `Deck`
- `Current Relics`

The relic section shows the active relic descriptions inline.
The deck section is rendered from the current upgraded card instances, not from the starter list.

Library panel sections:
- starter deck
- common cards
- rare cards
- epic cards
- relic library

The current rarity model is `common / rare / epic`.

Cards are rendered in a three-part shape rather than a single prose line:
- title row: rarity badge plus name and cost
- zero or more keyword lines
- one compact effect row for ordinary structured effects

Rarity badges are explicit in card titles:
- zh: `[普]`, `[稀]`, `[史]`
- en: `[C]`, `[R]`, `[E]`

Combat hand affordance:
- combat cards use higher-contrast color treatment when affordable and a much dimmer treatment when blocked on energy
- this distinction is intentionally visual in TTY; snapshot mode stays text-only

Combat effects affordance:
- structured combat passives are labeled as `Combat Effects` / `本场效果`
- on wider combat layouts, that summary moves into the right sidebar above the compact map
- on tighter combat layouts without a sidebar, the same summary sits directly under the main status bar
- the main combat flow no longer places that text between the enemy panel and the hand list

Current keyword behavior:
- keywords are rendered as a separate emphasized line
- the renderer currently uses this for `Exhaust`, `Retain`, and `Ethereal`
- keyword semantics come from structured card data, not from parsing card description strings

Card text rendering pipeline:
- card effects are derived from structured card metadata (`damage`, `block`, `draw`, `energy`, `heal`, statuses, etc.).
- if structured fields are missing, description strings are split into clauses and translated with a locale-aware clause parser.
- duplicate clauses that are already represented by structured lines or already-present keywords are dropped.
- this keeps full-sentence description dictionaries as a fallback-only mechanism instead of the primary localization source.

Campfire upgrade flow:
- choosing `Upgrade` opens a card-selection subpage
- each entry shows the current card and the upgraded preview side by side in the same panel
- the chosen upgrade is applied to one card instance, not to every card sharing that id

Shop behavior:
- buy offers now carry explicit per-card prices in the observation and renderer
- buy prices vary by card rarity instead of using one flat shop price
- remove uses a run-global escalating price
- remove price does not reset between shops
- each shop allows at most 3 deck removals

Reward behavior:
- combat rewards are gathered into a single reward menu after combat resolves
- gold and relic rewards are claimed directly from the top-level reward menu
- card rewards open a second-level card choice menu
- skipping reward leaves all currently unclaimed rewards behind and advances the run

Blessing behavior:
- blessing choices are currently `relic` or `card`
- relic blessings grant the relic immediately when chosen
- card blessings add the chosen card to the deck immediately
- blessing cards and blessing relics are intended to start or reinforce actual deck directions, not just provide flat safety resources

Combat powers:
- some cards and relics now create structured combat passives
- when active, the combat pane renders a `Combat Effects` / `本场效果` summary outside the enemy-to-hand reading flow
- this line is derived from structured passive metadata, not from ad-hoc prose

## Route Tree

The TUI and non-TTY snapshot both show the tower as a top-down branching tree with explicit connector lines.

Markers:
- `S` start / crossroads
- `F` normal fight
- `E` elite
- `R` rest
- `$` shop
- `B` boss
- `@` current node
- `1-9` current map choices
- `+` passed nodes
- `.` future nodes on the current route
- `x` closed nodes that are no longer reachable

Each rendered node keeps the status token and kind marker, for example `@S Crossroads (start)` or `1F Gate (battle)`.
The tree is rendered from content data, not from renderer-local state.
Shared DAG nodes may appear more than once so each branch remains readable in the tree view.

## Recent Activity

The CLI keeps a compact recent-activity panel instead of rendering the full log at all times.

- only the most recent entries are shown
- if older entries exist, the UI shows how many earlier events were collapsed
- on wide terminals, the panel can move to a right-hand column to preserve vertical room
- on tighter terminals, the panel may be hidden so combat and map information stay readable
- core state preserves structured `LogEvent[]`
- the CLI formats those events into localized human-readable lines for TTY and snapshot output

## Non-TTY Snapshot Mode

When the CLI is not attached to a TTY and `--json` is not present, it prints a deterministic text snapshot.

Examples:

```bash
node packages/cli/dist/cli/src/main.js --seed 7 --lang zh
node packages/cli/dist/cli/src/main.js --seed 7 --lang zh --character hunter
```

Snapshot behavior:
- if `--character` is passed, that character is rendered
- if `--character` is omitted, snapshot mode falls back to the default character so the snapshot stays deterministic

The snapshot includes:
- run header
- full tower map
- current phase details
- combat hand affordability tags when a combat snapshot is rendered
- recent activity

## JSON Mode

`--json` enables machine-readable output.

Commands:
- `create`
- `observe`
- `step`
- `replay`
- `batch`

Headless mode requires `--character` for every command except `--help`.

Examples:

```bash
towerlab --json create --seed 7 --character warrior
towerlab --json observe --seed 7 --character warrior --actions-file actions.json
towerlab --json step --seed 7 --character warrior --actions-file actions.json --action '{"type":"endTurn"}'
towerlab --json replay --seed 7 --character warrior --actions-file actions.json
towerlab --json batch --policy heuristic --seed-start 1 --count 10 --character hunter
```

Useful flags:
- `--pretty` pretty-prints JSON
- `--seed <int>` selects the deterministic run seed
- `--character <id>` selects the character context for the run
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
- `batch`: aggregate metrics plus per-seed run summaries

Field semantics:
- `state` is the raw core state and remains the source of truth
- `observation` is the player-facing projection and is localized when `--lang` is set
- `state.log` and `observation.log` are structured `LogEvent[]` arrays, not localized prose strings
- `state.deck` is raw `CardInstance[]`, so each copy keeps its own `instanceId` and `upgraded` flag
- observed cards are resolved renderable cards with fields such as `id`, `name`, `cost`, `upgraded`, and structured effect metadata
- `map` is the full graph from content so agents do not need to infer the tower from `nextNodes` alone
- `legalActions` is the current valid action set from `packages/core`
- `state` and `observation` include character and act context for multi-act runs

Node naming:
- TUI and snapshot text use localized display names such as `城门` or `Gate`
- JSON payloads keep stable raw ids such as generated map node ids and blessing ids
- action objects must continue using the raw `nodeId`

## Action Shapes

Supported action objects:

```json
{"type":"chooseBlessing","blessingId":"<blessingId>"}
{"type":"choosePath","nodeId":"<nodeId>"}
{"type":"playCard","handIndex":0}
{"type":"endTurn"}
{"type":"chooseRest","optionId":"recover"}
{"type":"chooseRest","optionId":"upgrade"}
{"type":"upgradeRestCard","deckIndex":3}
{"type":"skipReward"}
{"type":"takeReward","rewardIndex":1}
{"type":"takeRewardCard","rewardIndex":1}
{"type":"backReward"}
{"type":"buyShop","saleIndex":0}
{"type":"removeDeckCard","deckIndex":3}
{"type":"leaveShop"}
```

## Notes

- The renderer is a view. Game rules remain in `packages/core`.
- Localization is applied in the CLI layer.
- Seeds are deterministic across interactive, snapshot, and JSON paths.
- Headless runs are deterministic only when both `seed` and `character` are fixed.
