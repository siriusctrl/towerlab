# Architecture

## Current scope

The repository is intentionally small.

### `packages/core`
Pure game logic and deterministic state transitions.

Responsibilities:
- state types
- seeded randomness
- run creation and node progression
- combat, reward, and shop transitions
- relic application and simple deterministic effects
- pure observation shaping

### `packages/content`
Static game content.

Responsibilities:
- card definitions
- enemy definitions
- starter deck
- sample map

### `packages/cli`
Ink renderer and local entrypoint.

Responsibilities:
- render human-readable state
- collect keyboard input
- load sample content
- create a run from a seed
- drive pure core actions for the current observation
- print a deterministic snapshot when the CLI is not attached to a TTY

## Dependency rules

- `content` may depend on `core` types.
- `cli` may depend on `core` and `content`.
- `core` must stay pure and must not depend on renderer code.

## Explicit non-goals for v0

- no HTTP API
- no persistence layer
- no plugin system
- no multi-player support
- no compatibility shims for hypothetical future clients

If we add a headless proxy or evaluator later, it should be added because the repo needs it, not because it sounds platform-ish.
