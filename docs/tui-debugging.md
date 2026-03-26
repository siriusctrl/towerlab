# TUI Debugging Guide

How to inspect, verify, and fix the Ink-based terminal UI without guessing.

## The Core Problem

The Ink TUI renders to a PTY using ANSI escape sequences and the alternate
screen buffer. Agents running inside a PTY see raw escape codes, not the
rendered picture. This makes layout bugs nearly invisible to automated tools.

## Non-TTY Snapshot: The Primary Debugging Surface

When stdout is not a TTY and `--json` is not passed, the CLI prints a
deterministic plain-text snapshot of the current game state. This is the
single most useful tool for verifying TUI output without a terminal.

```bash
# build first
corepack pnpm build

# print the snapshot
node packages/cli/dist/cli/src/main.js --seed 7
node packages/cli/dist/cli/src/main.js --seed 7 --lang zh
```

The snapshot includes the full map tree, phase details, and recent activity
in readable plain text. Use this output to verify layout changes instead of
trying to interpret PTY output.

## Verifying a Change

After any edit to `view.ts`, `app.tsx`, or rendering-related code:

1. Build: `corepack pnpm build`
2. Run the snapshot: `node packages/cli/dist/cli/src/main.js --seed 7`
3. Compare the output against expectations.
4. Run tests: `corepack pnpm test`

If the snapshot looks wrong, the TUI will look wrong too. Fix the snapshot
first.

## Verification Ladder

For TUI work, do not stop after one green test file. Use this order:

1. Non-TTY snapshot
   - `node packages/cli/dist/cli/src/main.js --seed 7 --lang zh`
   - Fastest way to catch layout regressions in the opening state.
2. `ink-testing-library`
   - Assert the actual rendered frame for concrete sizes such as `80x24` and
     `100x24`.
   - Use this for compact layout, clipping, and text wrapping checks.
3. Real CLI in a TTY
   - Run `corepack pnpm cli -- --seed <seed> --lang zh` in a real terminal, or
     drive the built CLI in `tmux`.
   - If the change affects navigation or minimaps, actually move into the next
     state instead of only checking the opening frame.

For map rendering changes, the work is not verified until all three layers
agree.

## Stepping Through Game States

The `--json` headless mode lets you advance the game and inspect state at
each step without touching the TUI:

```bash
# create a fresh run
node packages/cli/dist/cli/src/main.js --json create --seed 7 --pretty

# observe current state
node packages/cli/dist/cli/src/main.js --json observe --seed 7 --pretty

# step with an action
node packages/cli/dist/cli/src/main.js --json step --seed 7 \
  --action '{"type":"choosePath","nodeId":"gate"}' --pretty

# replay a sequence
node packages/cli/dist/cli/src/main.js --json replay --seed 7 \
  --actions '[{"type":"choosePath","nodeId":"gate"},{"type":"endTurn"}]' --pretty
```

Each response includes `observation`, `legalActions`, and `state`. These are
the source of truth — the TUI is just a view of this data.

## Snapshot at Different Game Phases

To see how the TUI renders at different phases, replay to the desired state
and then use the non-TTY snapshot. The `renderSnapshot` function in
`index.ts` accepts a seed and renders the initial state. For later states,
use `--json replay` to verify the data, then check the Ink rendering via
`ink-testing-library` (see below).

## Using ink-testing-library

For programmatic rendering verification without a real terminal:

```ts
import { render } from 'ink-testing-library';
import { App } from './app.js';

const { lastFrame } = render(<App seed={7} locale="en" />);
// lastFrame() returns the rendered text without ANSI escapes
console.log(lastFrame());
```

`lastFrame()` gives you the exact text the user would see, minus colors.
Use this in tests to assert layout properties.

## Using tmux for Real-CLI Verification

When you need a real TTY but want deterministic automation, use `tmux` and
capture the pane after driving input:

```bash
session="codex_verify_17"
tmux new-session -d -x 100 -y 24 -s "$session" \
  "cd /root/towerlab && node packages/cli/dist/cli/src/main.js --seed 17 --lang zh"

sleep 1
tmux send-keys -t "$session" '1'
sleep 1
tmux capture-pane -pt "$session" -S -24
tmux kill-session -t "$session"
```

Rules:

- Always kill temporary `tmux` sessions after verification.
- Prefer the built CLI in `dist/` so the code under test matches what users
  run.
- For renderer bugs, check at least one opening frame and one frame after
  advancing the game state.

For broad map changes, verify at least five different seeds. This catches
branching and minimap regressions that a single authored example will miss.

## Map Rendering Specifically

The map is a seeded DAG generated in `packages/content/src/map/`. The view
layer in `view.ts` delegates to the dedicated renderer in
`packages/cli/src/map/` and transforms the result into renderable rows. Key
functions:

- `createMapFloorRows()` — builds renderable rows from map data
- `formatMapLines()` — converts row cells to plain text strings
- `renderDagreMap()` — orchestrates layout, routing, and rasterization
- `generateMap()` — materializes a deterministic map from a seed

To debug map rendering in isolation:

```ts
import { createSeededContent } from '@towerlab/content';
import { createRun, observeRun } from '@towerlab/core';
import { createMapFloorRows, formatMapLines, deriveVisitedNodeIds } from './view.js';

const content = createSeededContent(7);
const state = createRun(content, 7);
const obs = observeRun(content, state);
const visited = deriveVisitedNodeIds(content.map, []);
const rows = createMapFloorRows(content.map, obs, 'en', visited, 80);
console.log(formatMapLines(rows).join('\n'));
```

## What NOT to Do

- Do not try to verify TUI layout by reading PTY output or ANSI escape
  sequences. The rendering depends on terminal dimensions, font, and
  locale in ways that are not reliably parseable.
- Do not assume the Ink component tree matches the visual layout. Ink uses
  flexbox, and `overflow="hidden"` can silently clip content.
- Do not skip the build step. The CLI runs from `dist/`, not `src/`.

## Checklist for TUI Changes

1. [ ] Does `corepack pnpm build` succeed?
2. [ ] Does `corepack pnpm test` pass?
3. [ ] Does the non-TTY snapshot (`node packages/cli/dist/cli/src/main.js --seed 7`) look correct?
4. [ ] Does the `--json observe` output still match the expected schema?
5. [ ] If map rendering changed, do the `view.test.ts` snapshots match?
6. [ ] Have you checked `ink-testing-library` frames for the target terminal sizes?
7. [ ] If the change affects interactive map rendering, have you verified a real TTY frame after moving into the next state?
8. [ ] For map generation or routing changes, have you verified at least five seeds and cleaned up temporary `tmux` sessions?
