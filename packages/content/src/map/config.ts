export const ACT_COUNT = 3;
export const MAX_ACT_GENERATION_ATTEMPTS = 1024;

export type RegularNodeKind = "battle" | "elite" | "rest" | "shop";

export type TransitionStyle = "left" | "center" | "right";

export type ActPathConstraint = {
  minEliteCount: number;
  maxEliteCount: number;
  maxEliteSpread: number;
  easyEliteCount: number;
  hardEliteCount: number;
  maxConsecutiveElite: number;
};

export type ActGenerationConfig = {
  battlePool: string[];
  elitePool: string[];
  bossPool: string[];
  pathConstraints?: ActPathConstraint;
};

export const ACT_ROW_PATTERNS: number[][] = [
  [3, 4, 4, 4, 4, 4, 4, 4, 3],
  [3, 4, 3, 4, 4, 4, 4, 4, 3],
  [3, 3, 4, 4, 4, 4, 4, 3, 3],
];

export const REGULAR_ROW_PATTERNS = ACT_ROW_PATTERNS;

export const OPENING_KINDS: RegularNodeKind[] = ["battle", "elite", "battle"];

export const EARLY_KIND_POOL: RegularNodeKind[] = ["battle", "battle", "battle", "battle", "elite", "rest", "shop"];

export const MID_KIND_POOL: RegularNodeKind[] = ["battle", "battle", "battle", "battle", "elite", "elite", "rest", "shop"];

export const LATE_KIND_POOL: RegularNodeKind[] = ["battle", "battle", "battle", "elite", "elite", "rest", "shop"];

export const TRANSITION_STYLES: TransitionStyle[] = ["left", "center", "right"];
export const EXTRA_CROSS_LINKS_PER_TRANSITION = 1;

export const ACT_PATH_CONSTRAINTS: ActPathConstraint[] = [
  {
    minEliteCount: 0,
    maxEliteCount: 2,
    maxEliteSpread: 2,
    easyEliteCount: 0,
    hardEliteCount: 2,
    maxConsecutiveElite: 1,
  },
  {
    minEliteCount: 1,
    maxEliteCount: 2,
    maxEliteSpread: 1,
    easyEliteCount: 1,
    hardEliteCount: 2,
    maxConsecutiveElite: 1,
  },
  {
    minEliteCount: 1,
    maxEliteCount: 3,
    maxEliteSpread: 2,
    easyEliteCount: 1,
    hardEliteCount: 3,
    maxConsecutiveElite: 1,
  },
];

export const ACT_CONFIGS: ActGenerationConfig[] = [
  {
    battlePool: ["sentry", "raider", "skirmisher", "emberAdept", "ashScout", "pikeBrute"],
    elitePool: ["crusher", "bannerCaptain", "siegeSmith"],
    bossPool: ["forgeKeeper", "ironColossus"],
    pathConstraints: ACT_PATH_CONSTRAINTS[0],
  },
  {
    battlePool: ["watcher", "boltHound", "lensAdept", "circuitMantis", "sparkRogue", "mirrorDrone"],
    elitePool: ["watchCore", "stormBishop", "voltSentinel"],
    bossPool: ["spireWarden", "tempestPrism"],
    pathConstraints: ACT_PATH_CONSTRAINTS[1],
  },
  {
    battlePool: ["ashenKnight", "voidPriest", "mawSentinel", "ruinStalker", "graveBinder", "duskMarauder"],
    elitePool: ["grimEngine", "hollowRegent", "ruinBehemoth"],
    bossPool: ["ancientTitan", "voidSovereign"],
    pathConstraints: ACT_PATH_CONSTRAINTS[2],
  },
];
