import type { RunContent } from "@towerlab/core";

import { cards } from "./cards.js";
import { DEFAULT_CHARACTER_ID, getCharacter, type CharacterId } from "./characters/index.js";
import { enemies } from "./enemies.js";
import { generateMap } from "./map/index.js";
import { relics } from "./relics.js";

export { DEFAULT_CHARACTER_ID, getCharacter, listCharacters, type CharacterId } from "./characters/index.js";

export function createSeededContent(seed: number, characterId: CharacterId | string = DEFAULT_CHARACTER_ID): RunContent {
  const character = getCharacter(characterId);

  return {
    cards,
    enemies,
    relics,
    character,
    map: generateMap(seed, character.relicPools),
  };
}

export const sampleContent: RunContent = createSeededContent(7, DEFAULT_CHARACTER_ID);
