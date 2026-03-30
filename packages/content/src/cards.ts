import type { CardDefinition } from "@towerlab/core";

import { hunterCardTemplates } from "./cards/hunter.js";
import type { CardRarity, CardTemplate } from "./cards/template.js";
import { warriorCardTemplates } from "./cards/warrior.js";

const CARD_RARITY_BY_ID: Record<string, CardRarity> = {
  uppercut: "rare",
  carnage: "rare",
  battleTrance: "rare",
  bloodletting: "rare",
  secondWind: "rare",
  shockwave: "rare",
  heavyBlow: "rare",
  warpath: "rare",
  overrun: "rare",
  clothesline: "rare",
  dropkick: "rare",
  ghostlyArmor: "rare",
  outmaneuver: "rare",
  legSweep: "rare",
  dash: "rare",
  predator: "rare",
  cripplingCloud: "rare",
  catalyst: "rare",
  piercingWail: "rare",
  bouncingFlask: "rare",
  heelHook: "rare",
  deadlyTactics: "rare",
  impervious: "epic",
  bludgeon: "epic",
  executioner: "epic",
  finalCharge: "epic",
  burningBanner: "epic",
  warSpoils: "epic",
  reaper: "epic",
  glassKnife: "epic",
  adrenaline: "epic",
  finisher: "epic",
};

type CardStats = Omit<CardTemplate, "id" | "name">;

function withKeyword(keywords: CardStats["keywords"], keyword: NonNullable<CardStats["keywords"]>[number]) {
  return keywords?.includes(keyword) ? keywords : [...(keywords ?? []), keyword];
}

function upgradeDamage(amount: number): number {
  if (amount >= 18) return amount + 6;
  if (amount >= 10) return amount + 4;
  return amount + 3;
}

function upgradeBlock(amount: number): number {
  if (amount >= 18) return amount + 8;
  if (amount >= 10) return amount + 5;
  return amount + 3;
}

function formatDescription(stats: CardStats): string {
  const lines: string[] = [];

  if (stats.damage) lines.push(`Deal ${stats.damage} damage.`);
  if (stats.block) lines.push(`Gain ${stats.block} block.`);
  if (stats.draw) lines.push(`Draw ${stats.draw} card${stats.draw === 1 ? "" : "s"}.`);
  if (stats.energy) lines.push(`Gain ${stats.energy} energy.`);
  if (stats.heal) lines.push(`Recover ${stats.heal} HP.`);
  if (stats.weak) lines.push(`Apply ${stats.weak} Weak.`);
  if (stats.vulnerable) lines.push(`Apply ${stats.vulnerable} Vulnerable.`);
  if (stats.poison) lines.push(`Apply ${stats.poison} Poison.`);
  if (stats.poisonMultiplier && stats.poisonMultiplier !== 1) lines.push(`Multiply Poison by ${stats.poisonMultiplier}.`);

  return lines.join(" ");
}

function buildUpgradedStats(id: string, stats: CardStats): CardStats {
  const upgraded: CardStats = { ...stats };

  if (upgraded.damage) upgraded.damage = upgradeDamage(upgraded.damage);
  if (upgraded.block) upgraded.block = upgradeBlock(upgraded.block);
  if (upgraded.draw) upgraded.draw += 1;
  if (upgraded.energy) upgraded.energy += 1;
  if (upgraded.heal) upgraded.heal += 2;
  if (upgraded.weak) upgraded.weak += 1;
  if (upgraded.vulnerable) upgraded.vulnerable += 1;
  if (upgraded.poison) upgraded.poison += 2;

  if (id === "battleTrance" || id === "bloodletting" || id === "adrenaline") {
    upgraded.keywords = withKeyword(upgraded.keywords, "exhaust");
  }

  if (id === "executioner" || id === "glassKnife") {
    upgraded.keywords = withKeyword(upgraded.keywords, "ethereal");
  }

  upgraded.description = formatDescription(upgraded);
  return upgraded;
}

function toUpgradableCard(card: CardTemplate): CardDefinition {
  const { id, name, ...stats } = card;
  const rarity: CardRarity = CARD_RARITY_BY_ID[id] ?? "common";
  const upgraded = buildUpgradedStats(id, stats);

  return {
    id,
    name,
    ...stats,
    rarity,
    base: { ...stats },
    upgraded,
  } as CardDefinition;
}

const baseCards: Record<string, CardTemplate> = {
  ...warriorCardTemplates,
  ...hunterCardTemplates,
};

export const cards = Object.fromEntries(
  Object.entries(baseCards).map(([id, card]) => [id, toUpgradableCard(card)]),
) as Record<string, CardDefinition>;
