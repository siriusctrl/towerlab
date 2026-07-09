# AGENTS.md

This file is the operating map for agents working in this repo. Keep product
vision in `README.md`, durable design rules in `docs/`, and roadmap details in
`docs/plans/`.

## Source Map

- `packages/core/`: pure game state, deterministic rules, combat, rewards, map,
  progression, RNG, and validation.
- `packages/content/`: cards, enemies, relics, and starter content data.
- `packages/cli/`: terminal UI, local CLI entrypoint, rendering, policies, eval,
  and generated run helpers.
- `docs/architecture.md`: package boundaries and design rules.
- `docs/golden-principles.md`: durable gameplay and codebase invariants.
- `docs/plans/INDEX.md`: roadmap source of truth.
- `docs/tui-debugging.md`: terminal UI verification workflow.
- `docs/agent-interface.md`: agent-facing interface and replay expectations.

## Engineering Invariants

- Keep game rules pure and deterministic.
- All randomness must be seedable.
- Renderer output is a view, never the source of truth.
- Validate external input at boundaries.
- Prefer plain objects and functions over inheritance.
- Keep the CLI genuinely playable in a terminal.
- Keep agent/evaluation affordances explicit; do not hide gameplay state in UI
  side effects.
- Avoid speculative extension points, version shims, or migration layers unless
  explicitly requested.
- When a plan scope or status changes, update the relevant plan doc and
  `docs/plans/INDEX.md` in the same change.

## Task Routing

- Unfamiliar task: start with `README.md`, then route through `docs/INDEX`-like
  links above.
- Gameplay rules, state transitions, validation, RNG: inspect `packages/core/`
  and read `docs/golden-principles.md`.
- Cards, enemies, relics, starter data: inspect `packages/content/`.
- Terminal rendering or local CLI: read `docs/tui-debugging.md`, then inspect
  `packages/cli/`.
- Planning or milestone changes: start at `docs/plans/INDEX.md`.
- Agent interface, replay, or evaluation work: read `docs/agent-interface.md`
  and `docs/evaluation.md`.

## Verification

- Run `corepack pnpm build`.
- Run `corepack pnpm test`.
- Run `corepack pnpm typecheck`.
- For terminal UI work, follow `docs/tui-debugging.md`; do not rely only on raw
  ANSI output.
- For interactive map rendering, verify a real TTY state after taking at least
  one in-game action.
- For map generation, routing, compact map layout, minimaps, or connector
  rendering, verify at least five seeds.
- When using `tmux` or other terminal harnesses, close temporary sessions before
  finishing.

## Docs Update Rules

- User-visible CLI behavior: update `README.md` and relevant `docs/cli.md`
  content.
- Architecture or package-boundary changes: update `docs/architecture.md`.
- Gameplay invariants: update `docs/golden-principles.md`.
- Plan or milestone changes: update the relevant `docs/plans/*.md` file and
  `docs/plans/INDEX.md`.
- TUI verification changes: update `docs/tui-debugging.md`.
- Agent-facing interface or replay changes: update `docs/agent-interface.md`.

## Commit Rules

- Use Conventional Commits with a body.
- Keep commits focused and reviewable.
- Do not revert unrelated user changes.
