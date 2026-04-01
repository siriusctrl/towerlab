import type { CardRarity, RestOptionId } from "./types.js";

export const DEFAULT_MAX_HP = 80;
export const STARTING_GOLD = 0;
export const STARTING_ENERGY = 3;
export const HAND_SIZE = 5;
export const REST_HEAL_RATIO = 0.3;
export const LOG_LIMIT = 8;
export const SHOP_CARD_PRICES: Record<CardRarity, number> = {
  common: 12,
  rare: 18,
  epic: 26,
};
export const SHOP_CARD_REMOVE_BASE_PRICE = 16;
export const SHOP_CARD_REMOVE_INCREMENT = 10;
export const SHOP_CARD_REMOVE_LIMIT_PER_SHOP = 3;
export const BATTLE_REWARD_CARD_COUNT_PLANS: CardRarity[][] = [
  ["common", "common", "common"],
  ["common", "common", "rare"],
  ["common", "rare", "rare"],
];
export const ELITE_REWARD_CARD_COUNT_PLANS: CardRarity[][] = [
  ["common", "rare", "rare"],
  ["common", "rare", "epic"],
  ["rare", "rare", "epic"],
];
export const BOSS_REWARD_CARD_COUNT_PLANS: CardRarity[][] = [
  ["epic", "epic", "epic"],
];
export const SHOP_CARD_RARITY_PLAN: CardRarity[] = ["common", "rare", "epic"];
export const REST_OPTION_IDS: RestOptionId[] = ["recover", "upgrade"];
