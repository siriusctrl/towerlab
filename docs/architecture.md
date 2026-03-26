# Architecture

## Current scope

The repository is intentionally small.

### `packages/core`

Pure game logic and deterministic state transitions.

Responsibilities:
- run state types and legal actions
- seeded randomness
- run creation and act progression
- blessing, combat, map, rest, reward, shop, victory, and defeat transitions
- relic application and deterministic effects
- structured `LogEvent[]` recording for state and observation
- pure observation shaping
- replay from seed plus ordered action history

### `packages/content`

Static game content plus seeded content assembly.

Responsibilities:
- character definitions
- card definitions
- structured card keywords and effect metadata
- relic definitions
- enemy definitions
- per-character starter decks, blessing pools, reward pools, and shop pools
- per-character relic pools
- act configuration and seeded tower map generation

### `packages/cli`

Ink renderer and local entrypoint.

Responsibilities:
- render human-readable state
- collect keyboard input
- host character selection and TUI-only shell state
- render status and library inspection panels
- render cards with emphasized keyword lines without becoming the rules source
- create a run from seed plus character context
- print deterministic snapshots when the CLI is not attached to a TTY
- expose deterministic headless JSON mode for agents and batch tooling
- host simple baseline policies and batch evaluation helpers
- localize structured state into human-facing strings without becoming the source of truth

## Dependency rules

- `content` may depend on `core` types.
- `cli` may depend on `core` and `content`.
- `core` must stay pure and must not depend on renderer code.

## Boundary notes

- `core` owns the rules and the structured log/event protocol.
- `content` owns character content, card/relic pools, keyword metadata, and seeded act/map inputs.
- `cli` owns presentation, localization, keybindings, keyword emphasis, and convenience policy tooling.
- renderer output is never the source of truth; headless and replay surfaces must stay aligned with core state.

## Explicit non-goals for v0

- no HTTP API
- no persistence layer
- no plugin system
- no multi-player support
- no compatibility shims for hypothetical future clients

If we add a headless proxy or evaluator later, it should be added because the repo needs it, not because it sounds platform-ish.
