import type { CardKeyword, PassiveEffect } from "@towerlab/core";

export type CardRarity = "common" | "rare" | "epic";

export type CardTemplate = {
  id: string;
  name: string;
  cost: number;
  description: string;
  keywords?: CardKeyword[];
  passives?: PassiveEffect[];
  damage?: number;
  block?: number;
  draw?: number;
  energy?: number;
  heal?: number;
  weak?: number;
  vulnerable?: number;
  poison?: number;
  poisonMultiplier?: number;
  exhaust?: boolean;
  retain?: boolean;
};
