import type { CardRarity, RestOption } from "./types.js";

export const DEFAULT_MAX_HP = 80;
export const STARTING_GOLD = 0;
export const STARTING_ENERGY = 3;
export const HAND_SIZE = 5;
export const REST_HEAL = 18;
export const REST_FORTIFY = 5;
export const LOG_LIMIT = 8;
export const SHOP_CARD_PRICE = 12;
export const SHOP_CARD_REMOVE_PRICE = 12;
export const REWARD_CARD_COUNT_PLANS: CardRarity[][] = [
  ["common", "common", "rare"],
  ["common", "rare", "rare"],
  ["common", "common", "epic"],
];
export const SHOP_CARD_RARITY_PLAN: CardRarity[] = ["common", "rare", "epic"];

export const REST_OPTIONS: RestOption[] = [
  {
    id: "recover",
    label: "Recover",
    description: `Heal ${REST_HEAL} HP.`,
  },
  {
    id: "fortify",
    label: "Fortify",
    description: `Gain ${REST_FORTIFY} max HP and heal ${REST_FORTIFY} HP.`,
  },
];
