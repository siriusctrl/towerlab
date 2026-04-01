import type { CardDefinition } from "@towerlab/core";

export const hunterCardIds = [
  "slice",
  "dodge",
  "neutralize",
  "survivor",
  "poisonedStab",
  "deadlyPoison",
  "backstab",
  "daggerThrow",
  "acrobatics",
  "escapePlan",
  "flyingKnee",
  "quickSlash",
  "backflip",
  "deflect",
  "suckerPunch",
  "terror",
  "outmaneuver",
  "legSweep",
  "dash",
  "predator",
  "cripplingCloud",
  "catalyst",
  "piercingWail",
  "bouncingFlask",
  "heelHook",
  "deadlyTactics",
  "glassKnife",
  "adrenaline",
  "finisher",
  "markedShot",
  "nightbrew",
  "markedQuarry",
  "cruelTutelage",
] as const;

export const hunterCards: Record<string, CardDefinition> = {
  slice: {
      id: "slice",
      name: "Slice",
      rarity: "common",
      cost: 1,
      description: "Deal 6 damage.",
      damage: 6,
      base: {
        cost: 1,
        description: "Deal 6 damage.",
        damage: 6
      },
      upgraded: {
        cost: 1,
        description: "Deal 9 damage.",
        damage: 9
      }
    },
  dodge: {
      id: "dodge",
      name: "Dodge",
      rarity: "common",
      cost: 1,
      description: "Gain 6 block.",
      block: 6,
      base: {
        cost: 1,
        description: "Gain 6 block.",
        block: 6
      },
      upgraded: {
        cost: 1,
        description: "Gain 9 block.",
        block: 9
      }
    },
  neutralize: {
      id: "neutralize",
      name: "Neutralize",
      rarity: "common",
      cost: 0,
      description: "Deal 3 damage. Apply 1 Weak.",
      damage: 3,
      weak: 1,
      base: {
        cost: 0,
        description: "Deal 3 damage. Apply 1 Weak.",
        damage: 3,
        weak: 1
      },
      upgraded: {
        cost: 0,
        description: "Deal 6 damage. Apply 2 Weak.",
        damage: 6,
        weak: 2
      }
    },
  survivor: {
      id: "survivor",
      name: "Survivor",
      rarity: "common",
      cost: 1,
      description: "Gain 7 block. Draw 1 card.",
      block: 7,
      draw: 1,
      base: {
        cost: 1,
        description: "Gain 7 block. Draw 1 card.",
        block: 7,
        draw: 1
      },
      upgraded: {
        cost: 1,
        description: "Gain 10 block. Draw 2 cards.",
        block: 10,
        draw: 2
      }
    },
  poisonedStab: {
      id: "poisonedStab",
      name: "Poisoned Stab",
      rarity: "common",
      cost: 1,
      description: "Deal 5 damage. Apply 3 Poison.",
      damage: 5,
      poison: 3,
      base: {
        cost: 1,
        description: "Deal 5 damage. Apply 3 Poison.",
        damage: 5,
        poison: 3
      },
      upgraded: {
        cost: 1,
        description: "Deal 8 damage. Apply 5 Poison.",
        damage: 8,
        poison: 5
      }
    },
  deadlyPoison: {
      id: "deadlyPoison",
      name: "Deadly Poison",
      rarity: "common",
      cost: 1,
      description: "Apply 5 Poison.",
      poison: 5,
      base: {
        cost: 1,
        description: "Apply 5 Poison.",
        poison: 5
      },
      upgraded: {
        cost: 1,
        description: "Apply 7 Poison.",
        poison: 7
      }
    },
  backstab: {
      id: "backstab",
      name: "Backstab",
      rarity: "common",
      cost: 0,
      description: "Deal 9 damage.",
      keywords: ["ethereal"],
      damage: 9,
      base: {
        cost: 0,
        description: "Deal 9 damage.",
        keywords: ["ethereal"],
        damage: 9
      },
      upgraded: {
        cost: 0,
        description: "Deal 12 damage.",
        keywords: ["ethereal"],
        damage: 12
      }
    },
  daggerThrow: {
      id: "daggerThrow",
      name: "Dagger Throw",
      rarity: "common",
      cost: 1,
      description: "Deal 7 damage. Draw 1 card.",
      damage: 7,
      draw: 1,
      base: {
        cost: 1,
        description: "Deal 7 damage. Draw 1 card.",
        damage: 7,
        draw: 1
      },
      upgraded: {
        cost: 1,
        description: "Deal 10 damage. Draw 2 cards.",
        damage: 10,
        draw: 2
      }
    },
  acrobatics: {
      id: "acrobatics",
      name: "Acrobatics",
      rarity: "common",
      cost: 1,
      description: "Draw 3 cards.",
      draw: 3,
      base: {
        cost: 1,
        description: "Draw 3 cards.",
        draw: 3
      },
      upgraded: {
        cost: 1,
        description: "Draw 4 cards.",
        draw: 4
      }
    },
  escapePlan: {
      id: "escapePlan",
      name: "Escape Plan",
      rarity: "common",
      cost: 0,
      description: "Gain 4 block. Draw 1 card.",
      block: 4,
      draw: 1,
      base: {
        cost: 0,
        description: "Gain 4 block. Draw 1 card.",
        block: 4,
        draw: 1
      },
      upgraded: {
        cost: 0,
        description: "Gain 7 block. Draw 2 cards.",
        block: 7,
        draw: 2
      }
    },
  flyingKnee: {
      id: "flyingKnee",
      name: "Flying Knee",
      rarity: "common",
      cost: 1,
      description: "Deal 8 damage. Gain 1 energy.",
      damage: 8,
      energy: 1,
      base: {
        cost: 1,
        description: "Deal 8 damage. Gain 1 energy.",
        damage: 8,
        energy: 1
      },
      upgraded: {
        cost: 1,
        description: "Deal 11 damage. Gain 2 energy.",
        damage: 11,
        energy: 2
      }
    },
  quickSlash: {
      id: "quickSlash",
      name: "Quick Slash",
      rarity: "common",
      cost: 1,
      description: "Deal 7 damage. Draw 1 card.",
      damage: 7,
      draw: 1,
      base: {
        cost: 1,
        description: "Deal 7 damage. Draw 1 card.",
        damage: 7,
        draw: 1
      },
      upgraded: {
        cost: 1,
        description: "Deal 10 damage. Draw 2 cards.",
        damage: 10,
        draw: 2
      }
    },
  backflip: {
      id: "backflip",
      name: "Backflip",
      rarity: "common",
      cost: 1,
      description: "Gain 6 block. Draw 2 cards.",
      block: 6,
      draw: 2,
      base: {
        cost: 1,
        description: "Gain 6 block. Draw 2 cards.",
        block: 6,
        draw: 2
      },
      upgraded: {
        cost: 1,
        description: "Gain 9 block. Draw 3 cards.",
        block: 9,
        draw: 3
      }
    },
  deflect: {
      id: "deflect",
      name: "Deflect",
      rarity: "common",
      cost: 0,
      description: "Gain 4 block.",
      block: 4,
      base: {
        cost: 0,
        description: "Gain 4 block.",
        block: 4
      },
      upgraded: {
        cost: 0,
        description: "Gain 7 block.",
        block: 7
      }
    },
  suckerPunch: {
      id: "suckerPunch",
      name: "Sucker Punch",
      rarity: "common",
      cost: 1,
      description: "Deal 6 damage. Apply 1 Weak.",
      damage: 6,
      weak: 1,
      base: {
        cost: 1,
        description: "Deal 6 damage. Apply 1 Weak.",
        damage: 6,
        weak: 1
      },
      upgraded: {
        cost: 1,
        description: "Deal 9 damage. Apply 2 Weak.",
        damage: 9,
        weak: 2
      }
    },
  terror: {
      id: "terror",
      name: "Terror",
      rarity: "common",
      cost: 1,
      description: "Apply 2 Vulnerable.",
      vulnerable: 2,
      base: {
        cost: 1,
        description: "Apply 2 Vulnerable.",
        vulnerable: 2
      },
      upgraded: {
        cost: 1,
        description: "Apply 3 Vulnerable.",
        vulnerable: 3
      }
    },
  outmaneuver: {
      id: "outmaneuver",
      name: "Outmaneuver",
      rarity: "rare",
      cost: 1,
      description: "Gain 2 energy.",
      keywords: ["retain"],
      energy: 2,
      retain: true,
      base: {
        cost: 1,
        description: "Gain 2 energy.",
        keywords: ["retain"],
        energy: 2,
        retain: true
      },
      upgraded: {
        cost: 1,
        description: "Gain 3 energy.",
        keywords: ["retain"],
        energy: 3,
        retain: true
      }
    },
  legSweep: {
      id: "legSweep",
      name: "Leg Sweep",
      rarity: "rare",
      cost: 2,
      description: "Gain 9 block. Apply 2 Weak.",
      block: 9,
      weak: 2,
      base: {
        cost: 2,
        description: "Gain 9 block. Apply 2 Weak.",
        block: 9,
        weak: 2
      },
      upgraded: {
        cost: 2,
        description: "Gain 12 block. Apply 3 Weak.",
        block: 12,
        weak: 3
      }
    },
  dash: {
      id: "dash",
      name: "Dash",
      rarity: "rare",
      cost: 2,
      description: "Deal 10 damage. Gain 10 block.",
      damage: 10,
      block: 10,
      base: {
        cost: 2,
        description: "Deal 10 damage. Gain 10 block.",
        damage: 10,
        block: 10
      },
      upgraded: {
        cost: 2,
        description: "Deal 14 damage. Gain 15 block.",
        damage: 14,
        block: 15
      }
    },
  predator: {
      id: "predator",
      name: "Predator",
      rarity: "rare",
      cost: 2,
      description: "Deal 12 damage. Draw 2 cards.",
      damage: 12,
      draw: 2,
      base: {
        cost: 2,
        description: "Deal 12 damage. Draw 2 cards.",
        damage: 12,
        draw: 2
      },
      upgraded: {
        cost: 2,
        description: "Deal 16 damage. Draw 3 cards.",
        damage: 16,
        draw: 3
      }
    },
  cripplingCloud: {
      id: "cripplingCloud",
      name: "Crippling Cloud",
      rarity: "rare",
      cost: 2,
      description: "Apply 4 Poison. Apply 1 Weak.",
      weak: 1,
      poison: 4,
      base: {
        cost: 2,
        description: "Apply 4 Poison. Apply 1 Weak.",
        weak: 1,
        poison: 4
      },
      upgraded: {
        cost: 2,
        description: "Apply 2 Weak. Apply 6 Poison.",
        weak: 2,
        poison: 6
      }
    },
  catalyst: {
      id: "catalyst",
      name: "Catalyst",
      rarity: "rare",
      cost: 1,
      description: "Multiply Poison by 2.",
      keywords: ["exhaust"],
      poisonMultiplier: 2,
      exhaust: true,
      base: {
        cost: 1,
        description: "Multiply Poison by 2.",
        keywords: ["exhaust"],
        poisonMultiplier: 2,
        exhaust: true
      },
      upgraded: {
        cost: 1,
        description: "Multiply Poison by 3.",
        keywords: ["exhaust"],
        poisonMultiplier: 3,
        exhaust: true
      }
    },
  piercingWail: {
      id: "piercingWail",
      name: "Piercing Wail",
      rarity: "rare",
      cost: 1,
      description: "Apply 2 Weak.",
      keywords: ["exhaust"],
      weak: 2,
      exhaust: true,
      base: {
        cost: 1,
        description: "Apply 2 Weak.",
        keywords: ["exhaust"],
        weak: 2,
        exhaust: true
      },
      upgraded: {
        cost: 1,
        description: "Apply 3 Weak.",
        keywords: ["exhaust"],
        weak: 3,
        exhaust: true
      }
    },
  bouncingFlask: {
      id: "bouncingFlask",
      name: "Bouncing Flask",
      rarity: "rare",
      cost: 2,
      description: "Apply 7 Poison.",
      poison: 7,
      base: {
        cost: 2,
        description: "Apply 7 Poison.",
        poison: 7
      },
      upgraded: {
        cost: 2,
        description: "Apply 9 Poison.",
        poison: 9
      }
    },
  heelHook: {
      id: "heelHook",
      name: "Heel Hook",
      rarity: "rare",
      cost: 1,
      description: "Deal 8 damage. Apply 1 Weak. Draw 1 card.",
      damage: 8,
      draw: 1,
      weak: 1,
      base: {
        cost: 1,
        description: "Deal 8 damage. Apply 1 Weak. Draw 1 card.",
        damage: 8,
        draw: 1,
        weak: 1
      },
      upgraded: {
        cost: 1,
        description: "Deal 11 damage. Draw 2 cards. Apply 2 Weak.",
        damage: 11,
        draw: 2,
        weak: 2
      }
    },
  deadlyTactics: {
      id: "deadlyTactics",
      name: "Deadly Tactics",
      rarity: "rare",
      cost: 1,
      description: "Gain 1 energy. Draw 2 cards.",
      keywords: ["retain"],
      draw: 2,
      energy: 1,
      retain: true,
      base: {
        cost: 1,
        description: "Gain 1 energy. Draw 2 cards.",
        keywords: ["retain"],
        draw: 2,
        energy: 1,
        retain: true
      },
      upgraded: {
        cost: 1,
        description: "Draw 3 cards. Gain 2 energy.",
        keywords: ["retain"],
        draw: 3,
        energy: 2,
        retain: true
      }
    },
  glassKnife: {
      id: "glassKnife",
      name: "Glass Knife",
      rarity: "epic",
      cost: 2,
      description: "Deal 18 damage.",
      keywords: ["ethereal"],
      damage: 18,
      base: {
        cost: 2,
        description: "Deal 18 damage.",
        keywords: ["ethereal"],
        damage: 18
      },
      upgraded: {
        cost: 2,
        description: "Deal 24 damage.",
        keywords: ["ethereal"],
        damage: 24
      }
    },
  adrenaline: {
      id: "adrenaline",
      name: "Adrenaline",
      rarity: "epic",
      cost: 0,
      description: "Draw 2 cards. Gain 1 energy.",
      keywords: ["exhaust"],
      draw: 2,
      energy: 1,
      exhaust: true,
      base: {
        cost: 0,
        description: "Draw 2 cards. Gain 1 energy.",
        keywords: ["exhaust"],
        draw: 2,
        energy: 1,
        exhaust: true
      },
      upgraded: {
        cost: 0,
        description: "Draw 3 cards. Gain 2 energy.",
        keywords: ["exhaust"],
        draw: 3,
        energy: 2,
        exhaust: true
      }
    },
  finisher: {
      id: "finisher",
      name: "Finisher",
      rarity: "epic",
      cost: 2,
      description: "Deal 16 damage.",
      damage: 16,
      base: {
        cost: 2,
        description: "Deal 16 damage.",
        damage: 16
      },
      upgraded: {
        cost: 2,
        description: "Deal 20 damage.",
        damage: 20
      }
    },
  markedShot: {
      id: "markedShot",
      name: "Marked Shot",
      rarity: "common",
      cost: 1,
      description: "Deal 6 damage. Apply 1 Vulnerable.",
      damage: 6,
      vulnerable: 1,
      base: {
        cost: 1,
        description: "Deal 6 damage. Apply 1 Vulnerable.",
        damage: 6,
        vulnerable: 1
      },
      upgraded: {
        cost: 1,
        description: "Deal 9 damage. Apply 2 Vulnerable.",
        damage: 9,
        vulnerable: 2
      }
    },
  nightbrew: {
      id: "nightbrew",
      name: "Nightbrew",
      rarity: "rare",
      cost: 1,
      description: "Your attacks apply 2 Poison this combat.",
      keywords: ["exhaust"],
      passives: [
          {
            kind: "attackPoison",
          value: 2
          }
        ],
      exhaust: true,
      base: {
        cost: 1,
        description: "Your attacks apply 2 Poison this combat.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "attackPoison",
            value: 2
          }
        ],
        exhaust: true
      },
      upgraded: {
        cost: 1,
        description: "Your attacks apply 3 Poison this combat.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "attackPoison",
            value: 3
          }
        ],
        exhaust: true
      }
    },
  markedQuarry: {
      id: "markedQuarry",
      name: "Marked Quarry",
      rarity: "rare",
      cost: 1,
      description: "Your attacks deal 4 more damage to debuffed enemies this combat.",
      keywords: ["exhaust"],
      passives: [
          {
            kind: "debuffBonusDamage",
          value: 4
          }
        ],
      exhaust: true,
      base: {
        cost: 1,
        description: "Your attacks deal 4 more damage to debuffed enemies this combat.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "debuffBonusDamage",
            value: 4
          }
        ],
        exhaust: true
      },
      upgraded: {
        cost: 1,
        description: "Your attacks deal 6 more damage to debuffed enemies this combat.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "debuffBonusDamage",
            value: 6
          }
        ],
        exhaust: true
      }
    },
  cruelTutelage: {
      id: "cruelTutelage",
      name: "Cruel Tutelage",
      rarity: "epic",
      cost: 1,
      description: "Whenever you apply Weak, Vulnerable, or Poison this combat, draw 1 card.",
      keywords: ["exhaust"],
      passives: [
          {
            kind: "debuffDraw",
          value: 1
          }
        ],
      exhaust: true,
      base: {
        cost: 1,
        description: "Whenever you apply Weak, Vulnerable, or Poison this combat, draw 1 card.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "debuffDraw",
            value: 1
          }
        ],
        exhaust: true
      },
      upgraded: {
        cost: 1,
        description: "Whenever you apply Weak, Vulnerable, or Poison this combat, draw 2 cards.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "debuffDraw",
            value: 2
          }
        ],
        exhaust: true
      }
    },
};
