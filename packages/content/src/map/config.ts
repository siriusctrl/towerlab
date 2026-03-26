export const ACT_COUNT = 3;

export type RegularNodeKind = "battle" | "elite" | "rest" | "shop";

export type TransitionStyle = "left" | "center" | "right";

export type ActGenerationConfig = {
  battlePool: string[];
  elitePool: string[];
  bossPool: string[];
};

export const ACT_ROW_PATTERNS: number[][] = [
  [3, 4, 4, 3, 3],
  [3, 4, 3, 4, 3],
  [3, 3, 4, 4, 3],
];

export const REGULAR_ROW_PATTERNS = ACT_ROW_PATTERNS;

export const OPENING_KINDS: RegularNodeKind[] = ["battle", "elite", "battle"];

export const EARLY_KIND_POOL: RegularNodeKind[] = ["battle", "battle", "elite", "rest", "shop"];

export const MID_KIND_POOL: RegularNodeKind[] = ["battle", "battle", "elite", "elite", "rest", "shop"];

export const LATE_KIND_POOL: RegularNodeKind[] = ["battle", "elite", "elite", "rest", "shop", "shop"];

export const TRANSITION_STYLES: TransitionStyle[] = ["left", "center", "right"];

export const ACT_CONFIGS: ActGenerationConfig[] = [
  {
    battlePool: ["sentry", "raider", "skirmisher", "emberAdept"],
    elitePool: ["crusher", "bannerCaptain"],
    bossPool: ["forgeKeeper", "ironColossus"],
  },
  {
    battlePool: ["watcher", "boltHound", "lensAdept", "circuitMantis"],
    elitePool: ["watchCore", "stormBishop"],
    bossPool: ["spireWarden", "tempestPrism"],
  },
  {
    battlePool: ["ashenKnight", "voidPriest", "mawSentinel", "ruinStalker"],
    elitePool: ["grimEngine", "hollowRegent"],
    bossPool: ["ancientTitan", "voidSovereign"],
  },
];
