import type { EnemyDefinition, EnemyIntent, EnemyPhaseDefinition } from "@towerlab/core";

function joinClauses(...clauses: Array<string | null | undefined>): string {
  return clauses.filter((clause): clause is string => Boolean(clause)).join(" and ");
}

function attackClause(damage: number, hits = 1): string {
  return hits > 1 ? `Attack for ${damage} x${hits}` : `Attack for ${damage}`;
}

function blockClause(block: number): string {
  return `Gain ${block} block`;
}

function healClause(heal: number): string {
  return `Recover ${heal} HP`;
}

function applyClause(label: "Weak" | "Vulnerable" | "Poison", amount: number): string {
  return `Apply ${amount} ${label}`;
}

function strengthClause(amount: number): string {
  return `Gain ${amount} Strength`;
}

function clearBlockClause(): string {
  return "Clear your block";
}

function cleanseClause(): string {
  return "Cleanse debuffs";
}

function attack(damage: number, options: Partial<EnemyIntent> = {}): EnemyIntent {
  const hits = options.hits ?? 1;
  return {
    kind: "attack",
    damage,
    ...options,
    description: joinClauses(
      attackClause(damage, hits),
      options.clearPlayerBlock ? clearBlockClause() : null,
      options.weak ? applyClause("Weak", options.weak) : null,
      options.vulnerable ? applyClause("Vulnerable", options.vulnerable) : null,
      options.poison ? applyClause("Poison", options.poison) : null,
      options.selfStrength ? strengthClause(options.selfStrength) : null,
    ),
  };
}

function attackBlock(damage: number, block: number, options: Partial<EnemyIntent> = {}): EnemyIntent {
  const hits = options.hits ?? 1;
  return {
    kind: "attackBlock",
    damage,
    block,
    ...options,
    description: joinClauses(
      attackClause(damage, hits),
      blockClause(block),
      options.clearPlayerBlock ? clearBlockClause() : null,
      options.weak ? applyClause("Weak", options.weak) : null,
      options.vulnerable ? applyClause("Vulnerable", options.vulnerable) : null,
      options.poison ? applyClause("Poison", options.poison) : null,
      options.selfStrength ? strengthClause(options.selfStrength) : null,
    ),
  };
}

function block(blockAmount: number, options: Partial<EnemyIntent> = {}): EnemyIntent {
  return {
    kind: options.selfStrength || options.cleanse ? "buff" : "block",
    block: blockAmount,
    ...options,
    description: joinClauses(
      blockClause(blockAmount),
      options.selfStrength ? strengthClause(options.selfStrength) : null,
      options.cleanse ? cleanseClause() : null,
    ),
  };
}

function heal(healAmount: number, options: Partial<EnemyIntent> = {}): EnemyIntent {
  return {
    kind: "heal",
    heal: healAmount,
    ...options,
    description: joinClauses(
      healClause(healAmount),
      options.cleanse ? cleanseClause() : null,
      options.selfStrength ? strengthClause(options.selfStrength) : null,
    ),
  };
}

function buff(options: { block?: number; selfStrength?: number; cleanse?: boolean; weak?: number; vulnerable?: number; poison?: number }): EnemyIntent {
  return {
    kind: "buff",
    block: options.block,
    selfStrength: options.selfStrength,
    cleanse: options.cleanse,
    weak: options.weak,
    vulnerable: options.vulnerable,
    poison: options.poison,
    description: joinClauses(
      options.block ? blockClause(options.block) : null,
      options.selfStrength ? strengthClause(options.selfStrength) : null,
      options.cleanse ? cleanseClause() : null,
      options.weak ? applyClause("Weak", options.weak) : null,
      options.vulnerable ? applyClause("Vulnerable", options.vulnerable) : null,
      options.poison ? applyClause("Poison", options.poison) : null,
    ),
  };
}

function phases(...entries: Array<EnemyIntent[] | [number, EnemyIntent[]]>): EnemyPhaseDefinition[] {
  return entries.map((entry, index) => {
    if (Array.isArray(entry) && typeof entry[0] === "number") {
      const [whenHpAtOrBelow, intents] = entry as [number, EnemyIntent[]];
      return { whenHpAtOrBelow, intents };
    }

    return index === 0 ? { intents: entry as EnemyIntent[] } : { whenHpAtOrBelow: 1, intents: entry as EnemyIntent[] };
  });
}

export const enemies: Record<string, EnemyDefinition> = {
  sentry: {
    id: "sentry",
    name: "Sentry",
    maxHp: 26,
    goldReward: 16,
    phases: phases([
      attack(5),
      block(6),
      attack(3, { hits: 2 }),
      attack(7),
    ]),
  },
  raider: {
    id: "raider",
    name: "Raider",
    maxHp: 30,
    goldReward: 18,
    phases: phases([
      buff({ selfStrength: 2 }),
      attack(7),
      attack(8, { vulnerable: 1 }),
      attackBlock(6, 4),
    ]),
  },
  skirmisher: {
    id: "skirmisher",
    name: "Skirmisher",
    maxHp: 28,
    goldReward: 17,
    phases: phases([
      attack(4, { hits: 2 }),
      attackBlock(6, 4),
      attack(9),
      block(7),
    ]),
  },
  emberAdept: {
    id: "emberAdept",
    name: "Ember Adept",
    maxHp: 29,
    goldReward: 19,
    phases: phases([
      attack(6, { weak: 1 }),
      block(5, { selfStrength: 1 }),
      attack(9, { poison: 2 }),
      attack(4, { hits: 2 }),
    ]),
  },
  ashScout: {
    id: "ashScout",
    name: "Ash Scout",
    maxHp: 31,
    goldReward: 18,
    phases: phases([
      attack(5, { hits: 2 }),
      block(5, { selfStrength: 1 }),
      attack(10),
      attack(8, { clearPlayerBlock: true }),
    ]),
  },
  pikeBrute: {
    id: "pikeBrute",
    name: "Pike Brute",
    maxHp: 33,
    goldReward: 20,
    phases: phases([
      block(7),
      attack(11),
      attack(8, { clearPlayerBlock: true }),
      attackBlock(7, 4),
    ]),
  },
  crusher: {
    id: "crusher",
    name: "Crusher",
    maxHp: 44,
    goldReward: 27,
    phases: phases(
      [attackBlock(8, 4), buff({ selfStrength: 2 }), attack(11)],
      [20, [attack(14), attack(8, { hits: 2 }), heal(6, { cleanse: true })]],
    ),
  },
  siegeSmith: {
    id: "siegeSmith",
    name: "Siege Smith",
    maxHp: 48,
    goldReward: 30,
    phases: phases(
      [block(8, { selfStrength: 2 }), attackBlock(10, 6), attack(13)],
      [22, [attack(15, { clearPlayerBlock: true }), block(10, { selfStrength: 2 }), attack(10, { hits: 2 })]],
    ),
  },
  bannerCaptain: {
    id: "bannerCaptain",
    name: "Banner Captain",
    maxHp: 50,
    goldReward: 29,
    phases: phases(
      [buff({ block: 6, selfStrength: 2 }), attack(9, { hits: 2 }), attack(12, { vulnerable: 1 })],
      [24, [attack(14), attack(10, { hits: 2 }), block(8, { selfStrength: 2 })]],
    ),
  },
  forgeKeeper: {
    id: "forgeKeeper",
    name: "Forge Keeper",
    maxHp: 78,
    goldReward: 48,
    phases: phases(
      [block(10, { selfStrength: 2 }), attack(12), attack(8, { hits: 2 }), attackBlock(10, 6)],
      [40, [attack(16, { clearPlayerBlock: true }), attack(12, { hits: 2 }), heal(8, { cleanse: true }), block(12, { selfStrength: 2 })]],
    ),
  },
  ironColossus: {
    id: "ironColossus",
    name: "Iron Colossus",
    maxHp: 86,
    goldReward: 52,
    phases: phases(
      [attack(14), block(10, { selfStrength: 1 }), attack(9, { hits: 2 }), attackBlock(12, 6)],
      [44, [attack(18, { clearPlayerBlock: true }), attack(11, { hits: 2 }), heal(10, { cleanse: true }), buff({ selfStrength: 2 })]],
    ),
  },
  watcher: {
    id: "watcher",
    name: "Watcher",
    maxHp: 38,
    goldReward: 23,
    phases: phases([
      attack(8),
      block(8),
      attack(6, { hits: 2 }),
      attack(10, { vulnerable: 1 }),
    ]),
  },
  boltHound: {
    id: "boltHound",
    name: "Bolt Hound",
    maxHp: 36,
    goldReward: 24,
    phases: phases([
      attack(4, { hits: 2 }),
      attack(11),
      attack(7, { vulnerable: 1 }),
      heal(6),
    ]),
  },
  lensAdept: {
    id: "lensAdept",
    name: "Lens Adept",
    maxHp: 39,
    goldReward: 25,
    phases: phases([
      block(8, { selfStrength: 1 }),
      attack(9),
      attackBlock(8, 4),
      attack(10, { weak: 1 }),
    ]),
  },
  circuitMantis: {
    id: "circuitMantis",
    name: "Circuit Mantis",
    maxHp: 37,
    goldReward: 24,
    phases: phases([
      attack(5, { hits: 2 }),
      attack(10),
      attackBlock(7, 5),
      attack(8, { poison: 2 }),
    ]),
  },
  sparkRogue: {
    id: "sparkRogue",
    name: "Spark Rogue",
    maxHp: 38,
    goldReward: 25,
    phases: phases([
      attack(8),
      attackBlock(6, 4),
      attack(11, { vulnerable: 1 }),
      buff({ selfStrength: 1 }),
    ]),
  },
  mirrorDrone: {
    id: "mirrorDrone",
    name: "Mirror Drone",
    maxHp: 40,
    goldReward: 26,
    phases: phases([
      block(9, { selfStrength: 1 }),
      attack(9),
      attackBlock(8, 4),
      attack(6, { hits: 2 }),
    ]),
  },
  watchCore: {
    id: "watchCore",
    name: "Watch Core",
    maxHp: 56,
    goldReward: 34,
    phases: phases(
      [block(8, { selfStrength: 2 }), attack(12), attack(8, { hits: 2 }), attackBlock(10, 5)],
      [28, [attack(16), attack(10, { hits: 2 }), block(10, { selfStrength: 2 })]],
    ),
  },
  voltSentinel: {
    id: "voltSentinel",
    name: "Volt Sentinel",
    maxHp: 62,
    goldReward: 37,
    phases: phases(
      [attack(12), block(9, { selfStrength: 1 }), attackBlock(11, 5), attack(7, { hits: 2 })],
      [30, [attack(16, { clearPlayerBlock: true }), attack(11, { hits: 2 }), buff({ selfStrength: 2 })]],
    ),
  },
  stormBishop: {
    id: "stormBishop",
    name: "Storm Bishop",
    maxHp: 59,
    goldReward: 36,
    phases: phases(
      [attack(11, { weak: 1 }), block(8, { selfStrength: 1 }), heal(6), attack(10, { poison: 2 })],
      [28, [attack(15), attack(9, { hits: 2 }), block(9, { selfStrength: 2 })]],
    ),
  },
  spireWarden: {
    id: "spireWarden",
    name: "Spire Warden",
    maxHp: 88,
    goldReward: 58,
    phases: phases(
      [block(12, { selfStrength: 1 }), attack(13), attack(8, { hits: 2 }), attackBlock(14, 6)],
      [46, [attack(18, { clearPlayerBlock: true }), attack(12, { hits: 2 }), block(12, { selfStrength: 2 }), heal(8, { cleanse: true })]],
    ),
  },
  tempestPrism: {
    id: "tempestPrism",
    name: "Tempest Prism",
    maxHp: 92,
    goldReward: 62,
    phases: phases(
      [attack(14), block(11, { selfStrength: 1 }), attack(10, { hits: 2 }), attack(12, { vulnerable: 1 })],
      [48, [attack(19), attack(11, { hits: 2, vulnerable: 1 }), heal(8, { cleanse: true }), buff({ selfStrength: 2 })]],
    ),
  },
  ashenKnight: {
    id: "ashenKnight",
    name: "Ashen Knight",
    maxHp: 45,
    goldReward: 28,
    phases: phases([
      attack(11),
      attackBlock(12, 4),
      attack(9, { hits: 2 }),
      buff({ selfStrength: 1 }),
    ]),
  },
  voidPriest: {
    id: "voidPriest",
    name: "Void Priest",
    maxHp: 43,
    goldReward: 29,
    phases: phases([
      block(10, { selfStrength: 1 }),
      attack(12, { vulnerable: 1 }),
      attackBlock(10, 6),
      attack(8, { poison: 3 }),
    ]),
  },
  mawSentinel: {
    id: "mawSentinel",
    name: "Maw Sentinel",
    maxHp: 47,
    goldReward: 31,
    phases: phases([
      attack(12),
      block(9),
      attackBlock(10, 5),
      attack(7, { hits: 2 }),
    ]),
  },
  ruinStalker: {
    id: "ruinStalker",
    name: "Ruin Stalker",
    maxHp: 46,
    goldReward: 30,
    phases: phases([
      attack(12, { vulnerable: 1 }),
      attackBlock(10, 4),
      buff({ selfStrength: 1 }),
      attack(9, { hits: 2 }),
    ]),
  },
  graveBinder: {
    id: "graveBinder",
    name: "Grave Binder",
    maxHp: 46,
    goldReward: 31,
    phases: phases([
      attack(11, { weak: 1 }),
      block(9, { selfStrength: 1 }),
      attackBlock(10, 4),
      attack(8, { poison: 2 }),
    ]),
  },
  duskMarauder: {
    id: "duskMarauder",
    name: "Dusk Marauder",
    maxHp: 48,
    goldReward: 32,
    phases: phases([
      attack(12, { vulnerable: 1 }),
      attackBlock(10, 5),
      heal(6, { selfStrength: 1 }),
      attack(9, { hits: 2 }),
    ]),
  },
  grimEngine: {
    id: "grimEngine",
    name: "Grim Engine",
    maxHp: 68,
    goldReward: 42,
    phases: phases(
      [attackBlock(15, 6), heal(8, { cleanse: true }), attack(18), buff({ selfStrength: 2 })],
      [34, [attack(14, { hits: 2 }), block(12, { selfStrength: 2 }), attack(20, { clearPlayerBlock: true })]],
    ),
  },
  ruinBehemoth: {
    id: "ruinBehemoth",
    name: "Ruin Behemoth",
    maxHp: 74,
    goldReward: 46,
    phases: phases(
      [attackBlock(16, 6), block(13), attack(19), buff({ selfStrength: 2 })],
      [36, [attack(21, { clearPlayerBlock: true }), attack(12, { hits: 2 }), block(12, { selfStrength: 2 })]],
    ),
  },
  hollowRegent: {
    id: "hollowRegent",
    name: "Hollow Regent",
    maxHp: 71,
    goldReward: 44,
    phases: phases(
      [attack(14), block(12, { selfStrength: 1 }), attackBlock(12, 6), heal(8, { cleanse: true })],
      [34, [attack(16, { hits: 2 }), attack(18, { vulnerable: 1 }), buff({ selfStrength: 2 })]],
    ),
  },
  ancientTitan: {
    id: "ancientTitan",
    name: "Ancient Titan",
    maxHp: 106,
    goldReward: 74,
    phases: phases(
      [block(12, { selfStrength: 2 }), attack(16), attack(10, { hits: 2 }), attackBlock(18, 8)],
      [56, [attack(22, { clearPlayerBlock: true }), attack(13, { hits: 2 }), heal(10, { cleanse: true }), buff({ selfStrength: 3 })]],
      [26, [attack(16, { hits: 3 }), attack(24), block(14, { selfStrength: 2 })]],
    ),
  },
  voidSovereign: {
    id: "voidSovereign",
    name: "Void Sovereign",
    maxHp: 112,
    goldReward: 78,
    phases: phases(
      [attack(18), block(14, { selfStrength: 1 }), attackBlock(16, 7), attack(10, { poison: 3 })],
      [58, [attack(20, { clearPlayerBlock: true, vulnerable: 1 }), heal(10, { cleanse: true }), attack(12, { hits: 2 })]],
      [28, [buff({ selfStrength: 3 }), attack(15, { hits: 3 }), attack(24, { poison: 4 })]],
    ),
  },
};
