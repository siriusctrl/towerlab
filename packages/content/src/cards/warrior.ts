import type { CardDefinition } from "@towerlab/core";

export const warriorCardIds = [
  "strike",
  "defend",
  "bash",
  "pommelStrike",
  "anger",
  "shrugItOff",
  "trueGrit",
  "twinStrike",
  "ironWave",
  "thunderclap",
  "surge",
  "tempoDrill",
  "bloodPact",
  "rallyLine",
  "disarm",
  "uppercut",
  "carnage",
  "battleTrance",
  "bloodletting",
  "secondWind",
  "shockwave",
  "heavyBlow",
  "warpath",
  "overrun",
  "clothesline",
  "dropkick",
  "ghostlyArmor",
  "impervious",
  "bludgeon",
  "executioner",
  "finalCharge",
  "burningBanner",
  "warSpoils",
  "reaper",
  "forgeDoctrine",
  "cinderRitual",
  "bastion",
] as const;

export const warriorCards: Record<string, CardDefinition> = {
  strike: {
      id: "strike",
      name: "Strike",
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
  defend: {
      id: "defend",
      name: "Defend",
      rarity: "common",
      cost: 1,
      description: "Gain 5 block.",
      block: 5,
      base: {
        cost: 1,
        description: "Gain 5 block.",
        block: 5
      },
      upgraded: {
        cost: 1,
        description: "Gain 8 block.",
        block: 8
      }
    },
  bash: {
      id: "bash",
      name: "Bash",
      rarity: "common",
      cost: 2,
      description: "Deal 8 damage. Apply 2 Vulnerable.",
      damage: 8,
      vulnerable: 2,
      base: {
        cost: 2,
        description: "Deal 8 damage. Apply 2 Vulnerable.",
        damage: 8,
        vulnerable: 2
      },
      upgraded: {
        cost: 2,
        description: "Deal 11 damage. Apply 3 Vulnerable.",
        damage: 11,
        vulnerable: 3
      }
    },
  pommelStrike: {
      id: "pommelStrike",
      name: "Pommel Strike",
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
  anger: {
      id: "anger",
      name: "Anger",
      rarity: "common",
      cost: 0,
      description: "Deal 4 damage.",
      damage: 4,
      base: {
        cost: 0,
        description: "Deal 4 damage.",
        damage: 4
      },
      upgraded: {
        cost: 0,
        description: "Deal 7 damage.",
        damage: 7
      }
    },
  shrugItOff: {
      id: "shrugItOff",
      name: "Shrug It Off",
      rarity: "common",
      cost: 1,
      description: "Gain 8 block. Draw 1 card.",
      block: 8,
      draw: 1,
      base: {
        cost: 1,
        description: "Gain 8 block. Draw 1 card.",
        block: 8,
        draw: 1
      },
      upgraded: {
        cost: 1,
        description: "Gain 11 block. Draw 2 cards.",
        block: 11,
        draw: 2
      }
    },
  trueGrit: {
      id: "trueGrit",
      name: "True Grit",
      rarity: "common",
      cost: 1,
      description: "Gain 7 block.",
      block: 7,
      base: {
        cost: 1,
        description: "Gain 7 block.",
        block: 7
      },
      upgraded: {
        cost: 1,
        description: "Gain 10 block.",
        block: 10
      }
    },
  twinStrike: {
      id: "twinStrike",
      name: "Twin Strike",
      rarity: "common",
      cost: 1,
      description: "Deal 8 damage.",
      damage: 8,
      base: {
        cost: 1,
        description: "Deal 8 damage.",
        damage: 8
      },
      upgraded: {
        cost: 1,
        description: "Deal 11 damage.",
        damage: 11
      }
    },
  ironWave: {
      id: "ironWave",
      name: "Iron Wave",
      rarity: "common",
      cost: 1,
      description: "Deal 5 damage. Gain 5 block.",
      damage: 5,
      block: 5,
      base: {
        cost: 1,
        description: "Deal 5 damage. Gain 5 block.",
        damage: 5,
        block: 5
      },
      upgraded: {
        cost: 1,
        description: "Deal 8 damage. Gain 8 block.",
        damage: 8,
        block: 8
      }
    },
  thunderclap: {
      id: "thunderclap",
      name: "Thunderclap",
      rarity: "common",
      cost: 1,
      description: "Deal 4 damage. Apply 1 Vulnerable.",
      damage: 4,
      vulnerable: 1,
      base: {
        cost: 1,
        description: "Deal 4 damage. Apply 1 Vulnerable.",
        damage: 4,
        vulnerable: 1
      },
      upgraded: {
        cost: 1,
        description: "Deal 7 damage. Apply 2 Vulnerable.",
        damage: 7,
        vulnerable: 2
      }
    },
  surge: {
      id: "surge",
      name: "Surge",
      rarity: "common",
      cost: 1,
      description: "Deal 4 damage. Gain 4 block.",
      damage: 4,
      block: 4,
      base: {
        cost: 1,
        description: "Deal 4 damage. Gain 4 block.",
        damage: 4,
        block: 4
      },
      upgraded: {
        cost: 1,
        description: "Deal 7 damage. Gain 7 block.",
        damage: 7,
        block: 7
      }
    },
  tempoDrill: {
      id: "tempoDrill",
      name: "Tempo Drill",
      rarity: "common",
      cost: 1,
      description: "Gain 1 energy. Draw 1 card.",
      draw: 1,
      energy: 1,
      base: {
        cost: 1,
        description: "Gain 1 energy. Draw 1 card.",
        draw: 1,
        energy: 1
      },
      upgraded: {
        cost: 1,
        description: "Draw 2 cards. Gain 2 energy.",
        draw: 2,
        energy: 2
      }
    },
  bloodPact: {
      id: "bloodPact",
      name: "Blood Pact",
      rarity: "common",
      cost: 1,
      description: "Deal 7 damage. Recover 2 HP.",
      damage: 7,
      heal: 2,
      base: {
        cost: 1,
        description: "Deal 7 damage. Recover 2 HP.",
        damage: 7,
        heal: 2
      },
      upgraded: {
        cost: 1,
        description: "Deal 10 damage. Recover 4 HP.",
        damage: 10,
        heal: 4
      }
    },
  rallyLine: {
      id: "rallyLine",
      name: "Rally Line",
      rarity: "common",
      cost: 1,
      description: "Gain 6 block. Draw 1 card.",
      block: 6,
      draw: 1,
      base: {
        cost: 1,
        description: "Gain 6 block. Draw 1 card.",
        block: 6,
        draw: 1
      },
      upgraded: {
        cost: 1,
        description: "Gain 9 block. Draw 2 cards.",
        block: 9,
        draw: 2
      }
    },
  disarm: {
      id: "disarm",
      name: "Disarm",
      rarity: "common",
      cost: 1,
      description: "Apply 2 Weak.",
      weak: 2,
      base: {
        cost: 1,
        description: "Apply 2 Weak.",
        weak: 2
      },
      upgraded: {
        cost: 1,
        description: "Apply 3 Weak.",
        weak: 3
      }
    },
  uppercut: {
      id: "uppercut",
      name: "Uppercut",
      rarity: "rare",
      cost: 2,
      description: "Deal 11 damage. Apply 1 Weak. Apply 1 Vulnerable.",
      damage: 11,
      weak: 1,
      vulnerable: 1,
      base: {
        cost: 2,
        description: "Deal 11 damage. Apply 1 Weak. Apply 1 Vulnerable.",
        damage: 11,
        weak: 1,
        vulnerable: 1
      },
      upgraded: {
        cost: 2,
        description: "Deal 15 damage. Apply 2 Weak. Apply 2 Vulnerable.",
        damage: 15,
        weak: 2,
        vulnerable: 2
      }
    },
  carnage: {
      id: "carnage",
      name: "Carnage",
      rarity: "rare",
      cost: 2,
      description: "Deal 18 damage.",
      keywords: ["retain"],
      damage: 18,
      retain: true,
      base: {
        cost: 2,
        description: "Deal 18 damage.",
        keywords: ["retain"],
        damage: 18,
        retain: true
      },
      upgraded: {
        cost: 2,
        description: "Deal 24 damage.",
        keywords: ["retain"],
        damage: 24,
        retain: true
      }
    },
  battleTrance: {
      id: "battleTrance",
      name: "Battle Trance",
      rarity: "rare",
      cost: 0,
      description: "Draw 2 cards.",
      keywords: ["exhaust"],
      draw: 2,
      exhaust: true,
      base: {
        cost: 0,
        description: "Draw 2 cards.",
        keywords: ["exhaust"],
        draw: 2,
        exhaust: true
      },
      upgraded: {
        cost: 0,
        description: "Draw 3 cards.",
        keywords: ["exhaust"],
        draw: 3,
        exhaust: true
      }
    },
  bloodletting: {
      id: "bloodletting",
      name: "Bloodletting",
      rarity: "rare",
      cost: 0,
      description: "Gain 2 energy.",
      keywords: ["exhaust"],
      energy: 2,
      exhaust: true,
      base: {
        cost: 0,
        description: "Gain 2 energy.",
        keywords: ["exhaust"],
        energy: 2,
        exhaust: true
      },
      upgraded: {
        cost: 0,
        description: "Gain 3 energy.",
        keywords: ["exhaust"],
        energy: 3,
        exhaust: true
      }
    },
  secondWind: {
      id: "secondWind",
      name: "Second Wind",
      rarity: "rare",
      cost: 2,
      description: "Gain 7 block. Recover 4 HP.",
      keywords: ["exhaust"],
      block: 7,
      heal: 4,
      exhaust: true,
      base: {
        cost: 2,
        description: "Gain 7 block. Recover 4 HP.",
        keywords: ["exhaust"],
        block: 7,
        heal: 4,
        exhaust: true
      },
      upgraded: {
        cost: 2,
        description: "Gain 10 block. Recover 6 HP.",
        keywords: ["exhaust"],
        block: 10,
        heal: 6,
        exhaust: true
      }
    },
  shockwave: {
      id: "shockwave",
      name: "Shockwave",
      rarity: "rare",
      cost: 2,
      description: "Apply 2 Weak. Apply 2 Vulnerable.",
      keywords: ["exhaust"],
      weak: 2,
      vulnerable: 2,
      exhaust: true,
      base: {
        cost: 2,
        description: "Apply 2 Weak. Apply 2 Vulnerable.",
        keywords: ["exhaust"],
        weak: 2,
        vulnerable: 2,
        exhaust: true
      },
      upgraded: {
        cost: 2,
        description: "Apply 3 Weak. Apply 3 Vulnerable.",
        keywords: ["exhaust"],
        weak: 3,
        vulnerable: 3,
        exhaust: true
      }
    },
  heavyBlow: {
      id: "heavyBlow",
      name: "Heavy Blow",
      rarity: "rare",
      cost: 2,
      description: "Deal 11 damage.",
      damage: 11,
      base: {
        cost: 2,
        description: "Deal 11 damage.",
        damage: 11
      },
      upgraded: {
        cost: 2,
        description: "Deal 15 damage.",
        damage: 15
      }
    },
  warpath: {
      id: "warpath",
      name: "Warpath",
      rarity: "rare",
      cost: 2,
      description: "Deal 10 damage. Gain 5 block.",
      damage: 10,
      block: 5,
      base: {
        cost: 2,
        description: "Deal 10 damage. Gain 5 block.",
        damage: 10,
        block: 5
      },
      upgraded: {
        cost: 2,
        description: "Deal 14 damage. Gain 8 block.",
        damage: 14,
        block: 8
      }
    },
  overrun: {
      id: "overrun",
      name: "Overrun",
      rarity: "rare",
      cost: 2,
      description: "Deal 13 damage. Recover 3 HP.",
      damage: 13,
      heal: 3,
      base: {
        cost: 2,
        description: "Deal 13 damage. Recover 3 HP.",
        damage: 13,
        heal: 3
      },
      upgraded: {
        cost: 2,
        description: "Deal 17 damage. Recover 5 HP.",
        damage: 17,
        heal: 5
      }
    },
  clothesline: {
      id: "clothesline",
      name: "Clothesline",
      rarity: "rare",
      cost: 2,
      description: "Deal 12 damage. Apply 2 Weak.",
      damage: 12,
      weak: 2,
      base: {
        cost: 2,
        description: "Deal 12 damage. Apply 2 Weak.",
        damage: 12,
        weak: 2
      },
      upgraded: {
        cost: 2,
        description: "Deal 16 damage. Apply 3 Weak.",
        damage: 16,
        weak: 3
      }
    },
  dropkick: {
      id: "dropkick",
      name: "Dropkick",
      rarity: "rare",
      cost: 1,
      description: "Deal 8 damage. Draw 1 card.",
      damage: 8,
      draw: 1,
      base: {
        cost: 1,
        description: "Deal 8 damage. Draw 1 card.",
        damage: 8,
        draw: 1
      },
      upgraded: {
        cost: 1,
        description: "Deal 11 damage. Draw 2 cards.",
        damage: 11,
        draw: 2
      }
    },
  ghostlyArmor: {
      id: "ghostlyArmor",
      name: "Ghostly Armor",
      rarity: "rare",
      cost: 1,
      description: "Gain 10 block.",
      keywords: ["ethereal"],
      block: 10,
      base: {
        cost: 1,
        description: "Gain 10 block.",
        keywords: ["ethereal"],
        block: 10
      },
      upgraded: {
        cost: 1,
        description: "Gain 15 block.",
        keywords: ["ethereal"],
        block: 15
      }
    },
  impervious: {
      id: "impervious",
      name: "Impervious",
      rarity: "epic",
      cost: 2,
      description: "Gain 20 block.",
      keywords: ["exhaust"],
      block: 20,
      exhaust: true,
      base: {
        cost: 2,
        description: "Gain 20 block.",
        keywords: ["exhaust"],
        block: 20,
        exhaust: true
      },
      upgraded: {
        cost: 2,
        description: "Gain 28 block.",
        keywords: ["exhaust"],
        block: 28,
        exhaust: true
      }
    },
  bludgeon: {
      id: "bludgeon",
      name: "Bludgeon",
      rarity: "epic",
      cost: 3,
      description: "Deal 24 damage.",
      damage: 24,
      base: {
        cost: 3,
        description: "Deal 24 damage.",
        damage: 24
      },
      upgraded: {
        cost: 3,
        description: "Deal 30 damage.",
        damage: 30
      }
    },
  executioner: {
      id: "executioner",
      name: "Executioner",
      rarity: "epic",
      cost: 2,
      description: "Deal 14 damage.",
      damage: 14,
      base: {
        cost: 2,
        description: "Deal 14 damage.",
        damage: 14
      },
      upgraded: {
        cost: 2,
        description: "Deal 18 damage.",
        keywords: ["ethereal"],
        damage: 18
      }
    },
  finalCharge: {
      id: "finalCharge",
      name: "Final Charge",
      rarity: "epic",
      cost: 3,
      description: "Deal 17 damage.",
      damage: 17,
      base: {
        cost: 3,
        description: "Deal 17 damage.",
        damage: 17
      },
      upgraded: {
        cost: 3,
        description: "Deal 21 damage.",
        damage: 21
      }
    },
  burningBanner: {
      id: "burningBanner",
      name: "Burning Banner",
      rarity: "epic",
      cost: 2,
      description: "Deal 8 damage. Draw 2 cards.",
      damage: 8,
      draw: 2,
      base: {
        cost: 2,
        description: "Deal 8 damage. Draw 2 cards.",
        damage: 8,
        draw: 2
      },
      upgraded: {
        cost: 2,
        description: "Deal 11 damage. Draw 3 cards.",
        damage: 11,
        draw: 3
      }
    },
  warSpoils: {
      id: "warSpoils",
      name: "War Spoils",
      rarity: "epic",
      cost: 2,
      description: "Deal 11 damage. Draw 2 cards.",
      damage: 11,
      draw: 2,
      base: {
        cost: 2,
        description: "Deal 11 damage. Draw 2 cards.",
        damage: 11,
        draw: 2
      },
      upgraded: {
        cost: 2,
        description: "Deal 15 damage. Draw 3 cards.",
        damage: 15,
        draw: 3
      }
    },
  reaper: {
      id: "reaper",
      name: "Reaper",
      rarity: "epic",
      cost: 3,
      description: "Deal 10 damage. Recover 6 HP.",
      damage: 10,
      heal: 6,
      base: {
        cost: 3,
        description: "Deal 10 damage. Recover 6 HP.",
        damage: 10,
        heal: 6
      },
      upgraded: {
        cost: 3,
        description: "Deal 14 damage. Recover 8 HP.",
        damage: 14,
        heal: 8
      }
    },
  forgeDoctrine: {
      id: "forgeDoctrine",
      name: "Forge Doctrine",
      rarity: "rare",
      cost: 1,
      description: "Your Strike cards deal 4 more damage this combat.",
      keywords: ["exhaust"],
      passives: [
          {
            kind: "strikeBonusDamage",
          value: 4
          }
        ],
      exhaust: true,
      base: {
        cost: 1,
        description: "Your Strike cards deal 4 more damage this combat.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "strikeBonusDamage",
            value: 4
          }
        ],
        exhaust: true
      },
      upgraded: {
        cost: 1,
        description: "Your Strike cards deal 5 more damage this combat.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "strikeBonusDamage",
            value: 5
          }
        ],
        exhaust: true
      }
    },
  cinderRitual: {
      id: "cinderRitual",
      name: "Cinder Ritual",
      rarity: "rare",
      cost: 1,
      description: "Whenever you exhaust a card this combat, gain 4 block.",
      keywords: ["exhaust"],
      passives: [
          {
            kind: "exhaustBlock",
          value: 4
          }
        ],
      exhaust: true,
      base: {
        cost: 1,
        description: "Whenever you exhaust a card this combat, gain 4 block.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "exhaustBlock",
            value: 4
          }
        ],
        exhaust: true
      },
      upgraded: {
        cost: 1,
        description: "Whenever you exhaust a card this combat, gain 6 block.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "exhaustBlock",
            value: 6
          }
        ],
        exhaust: true
      }
    },
  bastion: {
      id: "bastion",
      name: "Bastion",
      rarity: "epic",
      cost: 2,
      description: "Your block is not removed at end of turn this combat.",
      keywords: ["exhaust"],
      passives: [
          {
            kind: "retainBlock",
          value: 1
          }
        ],
      exhaust: true,
      base: {
        cost: 2,
        description: "Your block is not removed at end of turn this combat.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "retainBlock",
            value: 1
          }
        ],
        exhaust: true
      },
      upgraded: {
        cost: 1,
        description: "Your block is not removed at end of turn this combat.",
        keywords: ["exhaust"],
        passives: [
          {
            kind: "retainBlock",
            value: 1
          }
        ],
        exhaust: true
      }
    },
};
