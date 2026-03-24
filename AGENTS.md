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

## Repository Map

Start here, then follow the relevant docs:

- `README.md` — project overview and local development.
- `docs/architecture.md` — current package boundaries and design rules.
- `docs/golden-principles.md` — durable invariants for the codebase.
- `docs/plans/mvp.md` — current execution plan for the first playable version.
- `packages/core` — pure game state and deterministic rules.
- `packages/content` — cards, map, and starter data.
- `packages/cli` — terminal rendering and local entrypoint.

## Engineering Rules

- TypeScript everywhere.
- Keep game rules pure and deterministic.
- All randomness must be seedable.
- Renderer output is a view, never the source of truth.
- Validate external input at boundaries.
- Prefer plain objects and functions over inheritance.
- Update docs when the architecture or development contract changes.

## Collaboration Preferences

- Use direct engineering judgment.
- Keep implementations small and legible.
- Optimize for code that future agents can read in one pass.
