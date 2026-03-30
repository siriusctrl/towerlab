import type { CharacterDefinition } from "@towerlab/core";

export const warriorStarter: Pick<
  CharacterDefinition,
  "maxHp" | "startGold" | "starterDeck" | "startingRelicId"
> = {
  maxHp: 82,
  startGold: 0,
  starterDeck: [
    "strike",
    "strike",
    "strike",
    "strike",
    "defend",
    "defend",
    "defend",
    "defend",
    "bash",
    "pommelStrike",
  ],
  startingRelicId: "burningBlood",
};

export const warriorIdentity: Pick<CharacterDefinition, "id" | "name" | "summary"> = {
  id: "warrior",
  name: "Warrior",
  summary: "Heavy hits, recovery, and exhaust-driven tempo.",
};
