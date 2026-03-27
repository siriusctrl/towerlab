import type { CharacterDefinition } from "@towerlab/core";

import { hunter } from "./hunter/index.js";
import { warrior } from "./warrior/index.js";

export const DEFAULT_CHARACTER_ID = "warrior";

export const characterRegistry: Record<string, CharacterDefinition> = {
  [warrior.id]: warrior,
  [hunter.id]: hunter,
};

export type CharacterId = keyof typeof characterRegistry;

export function getCharacter(characterId: string): CharacterDefinition {
  const character = characterRegistry[characterId];

  if (!character) {
    throw new Error(`unknown character: ${characterId}`);
  }

  return character;
}

export function listCharacters(): CharacterDefinition[] {
  return Object.values(characterRegistry);
}
