import type { NodeKind } from "@towerlab/core";

export type RegularNodeKind = Exclude<NodeKind, "boss" | "start">;
export type TransitionStyle = "balanced" | "left" | "right";

export const REGULAR_ROW_PATTERNS = [
  [3, 4, 4, 5, 4, 4, 3, 3],
  [3, 4, 5, 4, 5, 4, 3, 3],
  [3, 5, 4, 5, 4, 4, 3, 3],
] as const;

export const EARLY_KIND_POOL: RegularNodeKind[] = ["battle", "battle", "elite", "rest", "shop"];
export const MID_KIND_POOL: RegularNodeKind[] = ["battle", "battle", "elite", "rest", "shop"];
export const LATE_KIND_POOL: RegularNodeKind[] = ["battle", "battle", "rest", "rest", "shop"];
export const OPENING_KINDS: RegularNodeKind[] = ["battle", "battle", "elite"];
export const TRANSITION_STYLES: TransitionStyle[] = ["balanced", "left", "right"];
