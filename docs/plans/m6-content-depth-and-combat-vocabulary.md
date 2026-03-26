# M6 — Content Depth + Combat Vocabulary

- Status: `active`

## Goal

Take TowerLab from a structurally correct but still shallow two-character slice to a meaningfully replayable deckbuilder slice.

The target is not to clone a full commercial card game.
The target is to make the current two-character tower deep enough that:
- repeated runs do not collapse into the same small set of card choices
- both humans and baseline policies face real medium-horizon deckbuilding tradeoffs
- the engine exposes a small but expressive combat vocabulary without turning into a giant status-system rewrite

## Why this milestone exists

M5 fixed the shape of the game:
- character context
- multi-act runs
- blessing flow
- structured logs
- usable TUI inspection

What it did not solve was content depth.
Even with the correct run shape, the game remained too narrow if:
- the card pools were too small
- every card read like the same damage/block template
- relics stayed too shallow
- batch baselines could overfit on a tiny pool

M6 exists to deepen the actual game while preserving the current KISS architecture.

## Current landed sub-scope

The following M6 work is already on `main`:
- card effects now support `draw`, `energy`, `heal`, `exhaust`, and `retain`
- `exhaust` and `retain` are represented as structured card keywords rather than prose-only text
- cards render as:
  - name + cost
  - keyword lines
  - effect body
- both current characters have broader first-pass and second-pass card pools than M5 shipped with
- acts now need deeper route stacks and more meaningful combat-to-utility pacing than the post-M5 map shape provided

This milestone remains active because the full content-depth target is still ahead.

## Included

### 1. Character card-pool depth

- broaden `Vanguard` and `Bulwark` card pools substantially
- keep `common / rare / epic` as the rarity model
- ensure each character has multiple recognizable deck directions rather than one flat pile
- use blessing cards to point at real archetype directions rather than only raw-rate upgrades
- keep shop and reward pools wide enough that short seed samples still show variety

Target shape:
- enough commons that repeated act-1 rewards do not feel solved
- enough rare/epic cards that shop and reward decisions include actual build direction
- enough keyword-bearing cards that the card renderer and library remain meaningfully informative

### 2. Small, structured combat vocabulary

Continue extending combat expression through explicit data fields rather than prose parsing.

Already landed:
- `damage`
- `block`
- `draw`
- `energy`
- `heal`
- `keywords: ["exhaust"]`
- `keywords: ["retain"]`

Planned next candidates, in order of pressure:
- `ethereal`
- lightweight discard interactions
- a minimal debuff layer such as `weak` or `vulnerable` only if the content pressure justifies the state cost

Rules for expansion:
- every mechanic must be represented as structured state or structured card data
- do not infer rules from human-readable description strings
- do not introduce a large generalized effect engine unless the current targeted fields stop being legible

### 3. Relic depth

The current relic system is still shallower than the card system.
M6 should expand relic depth in a way that matches the current architecture.

Included relic work:
- broaden shared relics
- broaden character-specific relics
- broaden boss relic choices
- extend relic effect kinds only when they express real gameplay differences

Expected effect areas:
- combat start economy
- combat start defense
- route or shop economy
- rest recovery shaping
- deck-building incentives that align with each character’s archetypes

Non-goal:
- a giant triggered-event relic engine with speculative hooks for every future mechanic

### 4. Enemy and encounter pressure

The enemy roster is already act-specific, but depth and pressure still need to keep pace with content growth.

Included:
- maintain enemies as shared content across characters
- expand or tune encounter variety where card/relic growth makes current enemies too solved
- keep each act readable while improving pressure diversity
- deepen act route length so a run cannot skip from blessing to boss through only a handful of meaningful decisions

Focus:
- pressure patterns that punish one-dimensional decks
- enough variation that build choices matter
- no character-specific enemy pools
- maps should remain legible in TTY while carrying more medium-horizon planning weight than the current shallow route tree

### 5. Balance and benchmark sanity

M6 is not “done” just because content count increases.
The milestone includes repeated sanity checks across both characters.

Included:
- batch eval sweeps across both characters
- spot checks across all acts
- review of blessing, reward, shop, and relic pool quality
- obvious overperformers and dead cards should be trimmed rather than left as known rot

The goal is not perfect balance.
The goal is to avoid:
- one character clearly dominating
- one archetype obviously solving the tower
- large parts of the pool being filler

### 6. Documentation and inspection

As content and mechanics deepen, docs and inspection surfaces must stay aligned.

Included:
- keep roadmap truth in `docs/plans`
- update CLI docs when card rendering changes
- update agent-facing docs when card or observation schema changes
- keep library/status views useful as the pool grows

## Explicit non-goals

- adding a service layer or network API
- adding more top-level packages
- introducing a plugin system for cards or relics
- building a generic scripting language for effects
- adding a third playable character before the first two are deep enough
- rewriting the renderer stack
- aiming for perfect imitation of STS1 or STS2 data

## Acceptance criteria

M6 can move to `done` when all of the following are true:

- both current characters have materially broader card pools with multiple viable deck directions
- card mechanics beyond raw damage/block are present and readable through structured fields
- at least one structured keyword beyond bare prose is part of the stable rendering and content pipeline
- card views in TTY and snapshot mode consistently render keyword lines separate from effect text
- relic pools are materially deeper than M5 and produce visibly different run incentives
- act encounters remain shared across characters and still create pressure against narrow deck shapes
- map depth and route pacing create more than a handful of consequential choices per act without breaking TTY readability
- batch sanity checks across both characters do not show an obviously broken baseline state
- docs accurately describe the current card rendering, agent-facing card data, and active milestone scope

## Review bias

- prefer direct fields over generalized effect interpreters
- prefer real content depth over placeholder names with cloned numbers
- keep `core` deterministic and readable in one pass
- keep `content` as data, not behavior
- keep `cli` as a renderer and inspector, not a second source of rules
