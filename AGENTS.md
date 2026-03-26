Principles for agents contributing to this repository.

## Mission

Build a CLI-native deckbuilding tower game for humans and agents.

The project has two goals:
1. Be genuinely playable in a terminal.
2. Be a clean harness for testing long-horizon planning and agentic decision making.

## Core Principles

1. **KISS**
   - Prefer the simplest solution that works.
   - Avoid premature abstraction.
   - If a function is enough, do not create a class.
   - If one package is enough, do not invent a framework.

2. **No speculative forward-compatibility**
   - Do not add extension points, plugin systems, version shims, or migration layers unless explicitly requested.
   - Build for the current requirements, not imaginary future ones.

3. **Conventional Commits with real bodies**
   - Use Conventional Commits for every commit.
   - Do not write title-only commits.
   - In the commit body, explain both:
     - what changed
     - why the change was made

## Navigation

Use the docs to understand constraints first. Use the package directories only after you know which part of the system you need to change.

Keep this file coarse-grained. Do not try to mirror every subdirectory here. For detailed structure inside a package, inspect that package directly when needed.

### Read these docs first

- `README.md` — project overview, local development, and entrypoints.
- `docs/architecture.md` — package boundaries and design rules.
- `docs/golden-principles.md` — durable codebase invariants.
- `docs/plans/INDEX.md` — roadmap and milestone source of truth.

### Read these docs when the task matches

- Planning or milestone changes:
  - Read `docs/plans/INDEX.md` first.
  - Then read the relevant file in `docs/plans/*.md`.
  - If scope or status changes, update the plan doc and the index in the same change.

- Rendering or terminal UI work:
  - Read `docs/tui-debugging.md` before touching renderer code.

- Architecture or package-boundary changes:
  - Read `docs/architecture.md` before editing code.

- Rules, determinism, or core gameplay invariants:
  - Read `docs/golden-principles.md` before editing code.

### Top-level source map

- `packages/core` — pure game state and deterministic rules.
- `packages/content` — cards, map, and starter data.
- `packages/cli` — terminal rendering and local entrypoint.

## Task Routing

When starting work, route yourself by task type:

- For an unfamiliar task, start with `README.md`, then read only the relevant docs from the navigation section above.
- For a code change, read the relevant docs first, then inspect the matching top-level package.
- For a plan or milestone change, treat `docs/plans/INDEX.md` as the source of truth and update the relevant plan doc in the same change.
- For renderer work, read `docs/tui-debugging.md` before changing code in `packages/cli`.
- For gameplay rules or state transitions, inspect `packages/core`.
- For cards, map generation inputs, or starter data, inspect `packages/content`.
- For terminal rendering or the local CLI entrypoint, inspect `packages/cli`.

## Engineering Rules

- TypeScript everywhere.
- Keep game rules pure and deterministic.
- All randomness must be seedable.
- Renderer output is a view, never the source of truth.
- Validate external input at boundaries.
- Prefer plain objects and functions over inheritance.
- Update docs when the architecture or development contract changes.
- Treat `docs/plans/INDEX.md` as the roadmap source of truth.
- When milestone scope or status changes, update the relevant plan doc and the index in the same change.

## Verification Requirements

- Do not claim a TUI or renderer change is done without running the built CLI and the relevant tests.
- For terminal UI work, follow `docs/tui-debugging.md` instead of relying on reasoning or raw ANSI output.
- Minimum bar for TUI changes:
  - `corepack pnpm build`
  - `corepack pnpm test`
  - non-TTY snapshot check against `dist/`
  - `ink-testing-library` frame check for the affected terminal sizes
- If the change affects interactive map rendering, also verify a real TTY state after taking at least one in-game action.
- If the change affects map generation, map routing, compact map layout, minimaps, or connector rendering, verify at least five seeds, not just one happy-path seed.
- When using `tmux` or other terminal harnesses for verification, always close temporary sessions after use. Do not leave idle terminals behind.

## Collaboration Preferences

- Use direct engineering judgment.
- Keep implementations small and legible.
- Optimize for code that future agents can read in one pass.
- Hold the requested quality bar. Do not quietly retreat to a weaker, partial, or more convenient option just to finish faster.
- If the original goal appears infeasible, blocked by constraints, or materially more complex than requested, stop and discuss the constraint before lowering the target.
- When work can be cleanly parallelized into low-conflict chunks, prefer using multiple agents.
- Keep one main agent responsible for decomposition, integration, and final quality decisions.

## Agent Strategy Defaults

Use these as default choices, not absolute rules.

- Prefer multiple agents when work can be split into clear, low-conflict chunks with separable ownership.
- Do not delegate the immediate critical-path blocker if the main agent needs that answer before it can proceed.
- For broad reasoning, tricky review, architectural judgment, or ambiguous debugging, prefer Codex subagents running `gpt-5.4` with `high` or `xhigh` reasoning.
- For explicit, bounded, coding-centric implementation tasks, prefer Codex subagents running `gpt-5.3-codex-spark` because it is usually faster.
- The main agent should stay responsible for decomposition, integration, final review, verification, and merge-quality decisions.
