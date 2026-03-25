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

## Map Rendering Specifically

The map is a DAG defined in `packages/content`. The view layer in `view.ts`
transforms it into renderable rows. Key functions:

- `createMapTreeRows()` — builds the tree structure from map data
- `formatMapLines()` — converts tree rows to plain text strings

To debug map rendering in isolation:

```ts
import { sampleContent } from '@towerlab/content';
import { createRun, observeRun } from '@towerlab/core';
import { createMapTreeRows, formatMapLines, deriveVisitedNodeIds } from './view.js';

const state = createRun(sampleContent, 7);
const obs = observeRun(sampleContent, state);
const visited = deriveVisitedNodeIds(sampleContent.map, []);
const rows = createMapTreeRows(sampleContent.map, obs, 'en', visited);
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
6. [ ] Have you tested with at least two seeds to catch layout edge cases?
