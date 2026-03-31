import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, test } from "vitest";
import { DEFAULT_CHARACTER_ID, sampleContent, type CharacterId } from "@towerlab/content";
import type { RestObservation } from "@towerlab/core";

import { App } from "./app/App.js";
import { Controls, PhaseBody } from "./app/components.js";

afterEach(() => {
  cleanup();
});

describe("App layout", () => {
  test("opens a single-character select-page library with l", async () => {
    const frame = await renderFrame({ columns: 120, rows: 28, locale: "zh", characterId: null });

    expect(frame).toContain("选择一名角色。");
    expect(frame).toContain("战士");
    expect(frame).toContain("猎手");
    expect(frame).not.toContain("起始牌组");
    expect(frame).not.toContain("战旗");
  });

  test("opens and pages through each character library on the character-select screen", async () => {
    const warriorLibraryFrame = await renderFrame({ columns: 120, rows: 28, locale: "zh", characterId: null, inputs: ["l"] });
    const hunterLibraryFrame = await renderFrame({ columns: 120, rows: 28, locale: "zh", characterId: null, inputs: ["l", "2"] });

    expect(warriorLibraryFrame).toContain("图鉴");
    expect(warriorLibraryFrame).toContain("战士 · 起始牌组");
    expect(hunterLibraryFrame).toContain("图鉴");
    expect(hunterLibraryFrame).toContain("猎手 · 起始牌组");
  });

  test("shows the current character library and cycles card sections by rarity", async () => {
    const starterFrame = await renderFrame({ columns: 120, rows: 28, locale: "zh", inputs: ["1", "l"] });
    const rareFrame = await renderFrame({ columns: 120, rows: 28, locale: "zh", inputs: ["1", "l", "]", "]"] });
    const epicFrame = await renderFrame({ columns: 120, rows: 28, locale: "zh", inputs: ["1", "l", "]", "]", "]"] });
    const termsFrame = await renderFrame({ columns: 120, rows: 28, locale: "zh", inputs: ["1", "l", "]", "]", "]", "]", "]"] });

    expect(starterFrame).toContain("图鉴");
    expect(starterFrame).toContain("起始牌组");
    expect(starterFrame).toContain("4x 打击");
    expect(starterFrame).toContain("造成 6 点伤害。");
    expect(rareFrame).toContain("稀有卡");
    expect(rareFrame).toContain("上勾拳");
    expect(rareFrame).toContain("战斗狂潮 [0]");
    expect(rareFrame).toContain("共 12");
    expect(rareFrame).not.toContain("共 30");
    expect(rareFrame).toContain("消耗");
    const battleTranceLine = rareFrame.split("\n").findIndex((line) => line.includes("战斗狂潮 [0]"));
    expect(battleTranceLine).toBeGreaterThanOrEqual(0);
    expect(rareFrame.split("\n")[battleTranceLine + 1]).toContain("消耗");
    expect(rareFrame.split("\n")[battleTranceLine + 2]).toContain("抽 2 张牌。");
    expect(epicFrame).toContain("史诗卡");
    expect(epicFrame).toContain("无懈可击");
    expect(epicFrame).toContain("获得 20 点格挡。");
    expect(termsFrame).toContain("术语");
    expect(termsFrame).toContain("中毒");
    expect(termsFrame).toContain("在持有者行动前");
    expect(termsFrame).toContain("消耗");
  });

  test("renders keyword lines in separate rows for card descriptions", async () => {
    const rareFrame = await renderFrame({ columns: 120, rows: 28, locale: "en", inputs: ["1", "l", "]", "]"] });

    const battleTranceEnglishLine = rareFrame.split("\n").findIndex((line) => line.includes("Battle Trance [0]"));
    expect(battleTranceEnglishLine).toBeGreaterThanOrEqual(0);
    expect(rareFrame.split("\n")[battleTranceEnglishLine + 1]).toContain("Exhaust");
    expect(rareFrame.split("\n")[battleTranceEnglishLine + 2]).toContain("Draw 2 cards.");
  });

  test("renders the map in the main pane on 80x24 map terminals after the opening blessing", async () => {
    const frame = await renderFrame({ columns: 80, rows: 24, locale: "zh", inputs: ["1"] });

    expect(frame).toContain("路径： 1. 房间 1-1");
    expect(frame).toContain("2. 房间 1-2");
    expect(frame).toContain("3. 房间 1-3");
    expect(frame).not.toContain("│ Map");
    expect(frame).not.toContain("Recent Activity");
  });

  test("keeps the map in the main pane even on wide map terminals after the opening blessing", async () => {
    const frame = await renderFrame({ columns: 100, rows: 24, inputs: ["1"] });

    expect(frame).toContain("Crossroads (start)");
    expect(frame).toContain("Paths: 1. Room 1-1");
    expect(frame).toContain("2. Room 1-2");
    expect(frame).toContain("3. Room 1-3");
    expect(frame).not.toContain("│ Map");
    expect(frame).not.toContain("Recent Activity");
  });

  test("does not enable the sidebar on 100x20 combat terminals", async () => {
    const frame = await renderFrame({ columns: 100, rows: 20, inputs: ["1", "1"] });

    expect(frame).toContain("Combat");
    expect(frame).toContain("Combat Effects:");
    expect(frame).toMatch(/Raider|Sentry|Skirmisher|Ember Adept|Ash Scout|Pike Brute|Crusher|Banner Captain|Siege Smith|Forge Keeper|Iron Colossus/);
    expect(frame).not.toContain("Recent Activity");
    expect(frame).not.toContain("│ Map");
  });

  test("shows combat effects, minimap, and recent activity content in combat sidebars", async () => {
    const frame = await renderFrame({ columns: 100, rows: 24, inputs: ["1", "1"] });

    expect(frame).toContain("Combat Effects");
    expect(frame).toContain("Your Strike cards deal 2");
    expect(frame).toContain("┌");
    expect(frame).toContain("B");
    expect(frame).toContain("Energy 3/3");
    expect(frame).not.toContain("[READY]");
    expect(frame).not.toContain("[NO ENERGY]");
    expect(frame).toMatch(/- Gained \d+ gold\.|- Moved to Room 1-1 \((battle|elite)\)\./);
    expect(frame).toMatch(/Banner Captain|Crusher|Siege Smith|Raider|Sentry|Skirmisher|Ember Adept|Ash Scout|Pike Brute/);
    expect(frame).not.toContain("act1-battle");
  });

  test("uses esc for quitting and space for ending turns in combat controls", async () => {
    const frame = await renderFrame({ columns: 100, rows: 24, inputs: ["1", "1"] });

    expect(frame).toContain("space end turn");
    expect(frame).toContain("esc quit");
    expect(frame).not.toContain("q quit");
  });

  test("keeps the zh combat sidebar readable and localized", async () => {
    const frame = await renderFrame({ columns: 100, rows: 24, locale: "zh", inputs: ["1", "1"] });

    expect(frame).toContain("本场效果");
    expect(frame).toContain("打击牌额外造成 2");
    expect(frame).toContain("┌");
    expect(frame).toContain("B");
    expect(frame).not.toContain("[可打]");
    expect(frame).not.toContain("[能量不足]");
    expect(frame).toMatch(/获得 \d+ 金币|前往 房间 1-1（战斗）|前往 房间 1-1（精英）/);
    expect(frame).toMatch(/袭掠者|哨卫|游击者|余烬术士|灰烬斥候|长枪暴徒|军旗队长|攻城铁匠|粉碎者/);
    expect(frame).not.toContain("act1-battle");
  });

  test("marks spent-out combat cards as no-energy after spending the turn budget", async () => {
    const frame = await renderFrame({ columns: 120, rows: 28, inputs: ["1", "1", "1", "1", "1"] });

    expect(frame).toContain("Energy 0/3");
    expect(frame).not.toContain("[NO ENERGY]");
  });

  test("ends the turn with space", async () => {
    const frame = await renderFrame({ columns: 120, rows: 28, inputs: ["1", "1", "1", "1", "1", " "] });

    expect(frame).toContain("Energy 3/3");
    expect(frame).not.toContain("Energy 0/3");
  });

  test("shows an in-run quit confirmation on first escape", async () => {
    const frame = await renderFrame({ columns: 120, rows: 28, locale: "zh", inputs: ["1", "1", "\u001b"] });

    expect(frame).toContain("再次按 esc 退出本局。");
    expect(frame).toContain("战斗");
  });

  test("shows current status with deck and relic sections during combat", async () => {
    const deckFrame = await renderFrame({ columns: 120, rows: 28, inputs: ["1", "1", "d"] });
    const relicFrame = await renderFrame({ columns: 120, rows: 28, inputs: ["1", "1", "d", "]"] });

    expect(deckFrame).toContain("Status");
    expect(deckFrame).toContain("Deck  Current Relics");
    expect(deckFrame).toContain("Deck size 10");
    expect(deckFrame).toContain("4x Strike");
    expect(deckFrame).toContain("Deal 6 damage.");
    expect(deckFrame).toContain("Bash");
    expect(deckFrame).toContain("Deal 8 damage.");
    expect(deckFrame).toContain("Apply 2 Vulnerable.");

    expect(relicFrame).toContain("Status");
    expect(relicFrame).toContain("Relics 2");
    expect(relicFrame).toContain("Burning Blood - Recover 4 HP after each combat.");
    expect(relicFrame).toContain("Forge Sigil - Strike cards deal 2 more damage.");
  });

  test("renders blessing options without spacer gaps between choices", async () => {
    const frame = await renderFrame({ columns: 80, rows: 24, locale: "zh" });

    expect(frame).toMatch(/打击牌额外造成 2 点伤害。\n\s*2\./u);
    expect(frame).toContain("获得遗物：");
    expect(frame).toContain("获得卡牌：");
  });

  test("paginates campfire upgrade choices beyond nine cards", async () => {
    const restObservation: RestObservation = {
      seed: 7,
      characterId: "warrior",
      act: 1,
      totalActs: 3,
      phase: "rest",
      hp: 35,
      maxHp: 60,
      gold: 99,
      floor: 6,
      currentNode: { id: "rest-r6-p1", kind: "rest", nextIds: ["battle-r7-p1"] },
      relics: [],
      log: [],
      mode: "upgrade",
      restOptions: [
        { id: "recover", label: "Recover", description: "Heal 18 HP." },
        { id: "upgrade", label: "Upgrade", description: "Upgrade a card in your deck." },
      ],
      upgradableDeckCards: Array.from({ length: 12 }, (_, index) => ({
        deckIndex: index,
        card: { id: `strike-${index}`, name: `Strike ${index + 1}`, cost: 1, damage: 6 },
        upgradedCard: { id: `strike-${index}`, name: `Strike ${index + 1}+`, cost: 1, damage: 9, upgraded: true },
      })),
      nextNodes: [{ id: "battle-r7-p1", kind: "battle", nextIds: [] }],
    };

    const firstPage = render(
      React.createElement(PhaseBody, {
        content: sampleContent,
        observation: restObservation,
        locale: "en",
        shopMenu: "top",
        shopBuyPage: 0,
        shopRemovePage: 0,
        combatHandPage: 0,
        restMode: "upgrade",
        restUpgradeCards: restObservation.upgradableDeckCards,
        restUpgradePage: 0,
        hpBarWidth: 12,
        compactMapPhase: false,
      }),
    );
    const controls = render(
      React.createElement(Controls, {
        observation: restObservation,
        locale: "en",
        shopMenu: "top",
        shopBuyPageCount: 1,
        shopRemovePageCount: 1,
        restMode: "upgrade",
        restUpgradePageCount: 2,
        combatHandPageCount: 1,
      }),
    );
    const secondPage = render(
      React.createElement(PhaseBody, {
        content: sampleContent,
        observation: restObservation,
        locale: "en",
        shopMenu: "top",
        shopBuyPage: 0,
        shopRemovePage: 0,
        combatHandPage: 0,
        restMode: "upgrade",
        restUpgradeCards: restObservation.upgradableDeckCards,
        restUpgradePage: 1,
        hpBarWidth: 12,
        compactMapPhase: false,
      }),
    );

    expect(firstPage.lastFrame()).toContain("Choose one card to upgrade. (Page 1/2)");
    expect(firstPage.lastFrame()).toContain("1. Strike 1 → Strike 1+");
    expect(firstPage.lastFrame()).toContain("9. Strike 9 → Strike 9+");
    expect(firstPage.lastFrame()).not.toContain("10. Strike 10");
    expect(controls.lastFrame()).toContain("[ ] page");
    expect(secondPage.lastFrame()).toContain("Choose one card to upgrade. (Page 2/2)");
    expect(secondPage.lastFrame()).toContain("1. Strike 10 → Strike 10+");
    expect(secondPage.lastFrame()).toContain("3. Strike 12 → Strike 12+");
    expect(secondPage.lastFrame()).not.toContain("4. Strike 13");
  });

  test("paginates shop removal choices beyond nine cards", async () => {
    const shopObservation = {
      seed: 7,
      characterId: "warrior",
      act: 1,
      totalActs: 3,
      phase: "shop",
      hp: 35,
      maxHp: 60,
      gold: 99,
      floor: 6,
      currentNode: { id: "shop-r6-p1", kind: "shop", nextIds: ["battle-r7-p1"] },
      relics: [],
      log: [],
      forSale: [],
      removableDeckCards: Array.from({ length: 12 }, (_, deckIndex) => ({
        deckIndex,
        card: { id: `deck-${deckIndex}`, name: `Card ${deckIndex + 1}`, cost: 1, description: "Test card." },
      })),
      removeDeckCardCost: 12,
      remainingDeckRemovals: 3,
      nextNodes: [{ id: "battle-r7-p1", kind: "battle", nextIds: [] }],
    } as const;

    const firstPage = render(
      React.createElement(PhaseBody, {
        content: sampleContent,
        observation: shopObservation,
        locale: "en",
        shopMenu: "remove",
        shopBuyPage: 0,
        shopRemovePage: 0,
        combatHandPage: 0,
        restMode: "options",
        restUpgradeCards: [],
        restUpgradePage: 0,
        hpBarWidth: 12,
        compactMapPhase: false,
      }),
    );
    const controls = render(
      React.createElement(Controls, {
        observation: shopObservation,
        locale: "en",
        shopMenu: "remove",
        shopBuyPageCount: 1,
        shopRemovePageCount: 2,
        restMode: "options",
        combatHandPageCount: 1,
      }),
    );
    const secondPage = render(
      React.createElement(PhaseBody, {
        content: sampleContent,
        observation: shopObservation,
        locale: "en",
        shopMenu: "remove",
        shopBuyPage: 0,
        shopRemovePage: 1,
        combatHandPage: 0,
        restMode: "options",
        restUpgradeCards: [],
        restUpgradePage: 0,
        hpBarWidth: 12,
        compactMapPhase: false,
      }),
    );

    expect(firstPage.lastFrame()).toContain("Remove (next cost 12 gold) (Page 1/2)");
    expect(firstPage.lastFrame()).toContain("1. Remove Card 1");
    expect(firstPage.lastFrame()).toContain("9. Remove Card 9");
    expect(firstPage.lastFrame()).not.toContain("10. Remove Card 10");
    expect(controls.lastFrame()).toContain("[ ] page");
    expect(secondPage.lastFrame()).toContain("Remove (next cost 12 gold) (Page 2/2)");
    expect(secondPage.lastFrame()).toContain("1. Remove Card 10");
    expect(secondPage.lastFrame()).toContain("2. Remove Card 11");
  });

  test("paginates combat hands beyond nine cards", async () => {
    const combatObservation = {
      seed: 7,
      characterId: "warrior",
      act: 1,
      totalActs: 3,
      phase: "combat",
      hp: 35,
      maxHp: 60,
      gold: 99,
      floor: 6,
      currentNode: { id: "battle-r6-p1", kind: "battle", nextIds: ["rest-r7-p1"] },
      relics: [],
      log: [],
      energy: 3,
      baseEnergy: 3,
      block: 0,
      status: {},
      hand: Array.from({ length: 12 }, (_, index) => ({
        id: `strike-${index}`,
        name: `Strike ${index + 1}`,
        cost: 1,
        damage: 6,
      })),
      drawPileCount: 10,
      discardPileCount: 0,
      exhaustPileCount: 0,
      activePassives: [],
      enemy: {
        id: "raider",
        name: "Raider",
        hp: 30,
        maxHp: 30,
        block: 0,
        status: {},
        intent: { kind: "attack", description: "Slash for 6", damage: 6 },
      },
    } as const;

    const firstPage = render(
      React.createElement(PhaseBody, {
        content: sampleContent,
        observation: combatObservation,
        locale: "en",
        shopMenu: "top",
        shopBuyPage: 0,
        shopRemovePage: 0,
        combatHandPage: 0,
        restMode: "options",
        restUpgradeCards: [],
        restUpgradePage: 0,
        hpBarWidth: 12,
        compactMapPhase: false,
      }),
    );
    const controls = render(
      React.createElement(Controls, {
        observation: combatObservation,
        locale: "en",
        shopMenu: "top",
        shopBuyPageCount: 1,
        shopRemovePageCount: 1,
        restMode: "options",
        combatHandPageCount: 2,
      }),
    );
    const secondPage = render(
      React.createElement(PhaseBody, {
        content: sampleContent,
        observation: combatObservation,
        locale: "en",
        shopMenu: "top",
        shopBuyPage: 0,
        shopRemovePage: 0,
        combatHandPage: 1,
        restMode: "options",
        restUpgradeCards: [],
        restUpgradePage: 0,
        hpBarWidth: 12,
        compactMapPhase: false,
      }),
    );

    expect(firstPage.lastFrame()).toContain("Combat (Page 1/2)");
    expect(firstPage.lastFrame()).toContain("1. Strike 1 [1]");
    expect(firstPage.lastFrame()).toContain("9. Strike 9 [1]");
    expect(firstPage.lastFrame()).not.toContain("10. Strike 10");
    expect(controls.lastFrame()).toContain("[ ] page");
    expect(secondPage.lastFrame()).toContain("Combat (Page 2/2)");
    expect(secondPage.lastFrame()).toContain("1. Strike 10 [1]");
    expect(secondPage.lastFrame()).toContain("3. Strike 12 [1]");
  });

  test("paginates shop buy choices beyond nine cards", async () => {
    const shopObservation = {
      seed: 7,
      characterId: "warrior",
      act: 1,
      totalActs: 3,
      phase: "shop",
      hp: 35,
      maxHp: 60,
      gold: 99,
      floor: 6,
      currentNode: { id: "shop-r6-p1", kind: "shop", nextIds: ["battle-r7-p1"] },
      relics: [],
      log: [],
      forSale: Array.from({ length: 12 }, (_, saleIndex) => ({
        card: {
          id: `sale-${saleIndex}`,
          name: `Card ${saleIndex + 1}`,
          cost: 1,
          description: "Test card.",
        },
        price: 12,
      })),
      removableDeckCards: [],
      removeDeckCardCost: 12,
      remainingDeckRemovals: 3,
      nextNodes: [{ id: "battle-r7-p1", kind: "battle", nextIds: [] }],
    } as const;

    const firstPage = render(
      React.createElement(PhaseBody, {
        content: sampleContent,
        observation: shopObservation,
        locale: "en",
        shopMenu: "buy",
        shopBuyPage: 0,
        shopRemovePage: 0,
        combatHandPage: 0,
        restMode: "options",
        restUpgradeCards: [],
        restUpgradePage: 0,
        hpBarWidth: 12,
        compactMapPhase: false,
      }),
    );
    const controls = render(
      React.createElement(Controls, {
        observation: shopObservation,
        locale: "en",
        shopMenu: "buy",
        shopBuyPageCount: 2,
        shopRemovePageCount: 1,
        restMode: "options",
        combatHandPageCount: 1,
      }),
    );
    const secondPage = render(
      React.createElement(PhaseBody, {
        content: sampleContent,
        observation: shopObservation,
        locale: "en",
        shopMenu: "buy",
        shopBuyPage: 1,
        shopRemovePage: 0,
        combatHandPage: 0,
        restMode: "options",
        restUpgradeCards: [],
        restUpgradePage: 0,
        hpBarWidth: 12,
        compactMapPhase: false,
      }),
    );

    expect(firstPage.lastFrame()).toContain("Buy (Page 1/2)");
    expect(firstPage.lastFrame()).toContain("1. Card 1 [1]");
    expect(firstPage.lastFrame()).toContain("9. Card 9 [1]");
    expect(controls.lastFrame()).toContain("[ ] page");
    expect(secondPage.lastFrame()).toContain("Buy (Page 2/2)");
    expect(secondPage.lastFrame()).toContain("1. Card 10 [1]");
    expect(secondPage.lastFrame()).toContain("3. Card 12 [1]");
  });

  test("keeps opening blessings, compact map, and post-move minimap stable across multiple seeds", async () => {
    const seeds = [17, 29, 43, 58, 71];

    for (const seed of seeds) {
      const startFrame = await renderFrame({ seed, columns: 100, rows: 24, locale: "zh" });
      const mapFrame = await renderFrame({ seed, columns: 100, rows: 24, locale: "zh", inputs: ["1"] });
      const movedFrame = await renderFrame({ seed, columns: 100, rows: 24, locale: "zh", inputs: ["1", "1"] });

      expect(startFrame).toContain("祝福");
      expect(startFrame).toContain("1. ");
      expect(startFrame).toContain("2. ");
      expect(startFrame).toContain("3. ");
      expect(startFrame).toContain("获得卡牌：");
      expect(startFrame).not.toContain("：:");
      expect(startFrame).not.toContain("::");
      expect(mapFrame).toContain("路径： 1.");
      expect(mapFrame).toContain("2.");
      expect(mapFrame).toContain("3.");
      expect(movedFrame).toMatch(/[SFER$B]/);
      expect(movedFrame).toContain("B");
      expect(movedFrame).toMatch(/获得遗物|前往 房间 1-1（精英）|前往 房间 1-1（战斗）|请选择下一条路径/);
      expect(movedFrame).not.toContain("act1-battle");
    }
  }, 15000);
});

async function renderFrame({
  seed = 7,
  columns,
  rows,
  locale = "en",
  characterId = DEFAULT_CHARACTER_ID as CharacterId | null,
  inputs = [],
  ticksPerInput = 2,
}: {
  seed?: number;
  columns: number;
  rows: number;
  locale?: "en" | "zh";
  characterId?: CharacterId | null;
  inputs?: string[];
  ticksPerInput?: number;
}): Promise<string> {
  const props = characterId === null ? { seed, locale } : { seed, locale, characterId };
  const instance = render(React.createElement(App, props));

  Object.defineProperty(instance.stdout, "columns", { value: columns, configurable: true });
  Object.defineProperty(instance.stdout, "rows", { value: rows, configurable: true });
  instance.stdout.emit("resize");
  await waitForInk();

  for (const input of inputs) {
    instance.stdin.write(input);
    for (let i = 0; i < ticksPerInput; i += 1) {
      await waitForInk();
    }
  }

  return instance.lastFrame() ?? "";
}

async function waitForInk(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}
