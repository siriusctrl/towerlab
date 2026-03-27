import type { CharacterDefinition } from "@towerlab/core";

export const hunterStarter: Pick<
  CharacterDefinition,
  "maxHp" | "startGold" | "starterDeck" | "startingRelicId" | "blessingCards"
> = {
  maxHp: 72,
  startGold: 12,
  starterDeck: [
    "slice",
    "slice",
    "slice",
    "slice",
    "dodge",
    "dodge",
    "dodge",
    "dodge",
    "neutralize",
    "survivor",
  ],
  startingRelicId: "ringOfTheSnake",
  blessingCards: ["deadlyPoison", "backflip", "outmaneuver"],
};

export const hunterIdentity: Pick<CharacterDefinition, "id" | "name" | "summary"> = {
  id: "hunter",
  name: "Hunter",
  summary: "Poison, debuffs, and sharp hand management.",
};
