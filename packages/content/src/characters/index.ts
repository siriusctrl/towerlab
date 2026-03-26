import type { CharacterDefinition } from "@towerlab/core";

import { bulwark } from "./bulwark.js";
import { vanguard } from "./vanguard.js";

export const DEFAULT_CHARACTER_ID = "vanguard";

export const characterRegistry: Record<string, CharacterDefinition> = {
  [vanguard.id]: vanguard,
  [bulwark.id]: bulwark,
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
