import type { CardDefinition } from "@towerlab/core";

import { hunterCards } from "./cards/hunter.js";
import { warriorCards } from "./cards/warrior.js";

export const cards: Record<string, CardDefinition> = {
  ...warriorCards,
  ...hunterCards,
};
