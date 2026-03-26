import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, test } from "vitest";
import { DEFAULT_CHARACTER_ID, type CharacterId } from "@towerlab/content";

import { App } from "./app/App.js";

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

    expect(starterFrame).toContain("图鉴");
    expect(starterFrame).toContain("起始牌组");
    expect(starterFrame).toContain("4x 打击 [1]");
    expect(starterFrame).toContain("造成 6 点伤害。");
    expect(rareFrame).toContain("稀有卡");
    expect(rareFrame).toContain("上勾拳 [2]");
    expect(rareFrame).toContain("战斗狂潮 [0]");
    expect(rareFrame).toContain("消耗");
    const battleTranceLine = rareFrame.split("\n").findIndex((line) => line.includes("战斗狂潮 [0]"));
    expect(battleTranceLine).toBeGreaterThanOrEqual(0);
    expect(rareFrame.split("\n")[battleTranceLine + 1]).toContain("消耗");
    expect(rareFrame.split("\n")[battleTranceLine + 2]).toContain("抽 2 张牌。");
    expect(epicFrame).toContain("史诗卡");
    expect(epicFrame).toContain("无懈可击 [2]");
    expect(epicFrame).toContain("获得 20 点格挡。");
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
    expect(frame).toMatch(/Raider|Sentry|Skirmisher|Ember Adept|Ash Scout|Pike Brute|Crusher|Banner Captain|Siege Smith|Forge Keeper|Iron Colossus/);
    expect(frame).not.toContain("Recent Activity");
    expect(frame).not.toContain("│ Map");
  });

  test("shows minimap and recent activity content in combat sidebars", async () => {
    const frame = await renderFrame({ columns: 100, rows: 24, inputs: ["1", "1"] });

    expect(frame).toContain("┌");
    expect(frame).toContain("B");
    expect(frame).toContain("Energy 3/3");
    expect(frame).toMatch(/- Gained 30 gold\.|- Moved to Room 1-1 \(elite\)\./);
    expect(frame).toMatch(/- .*appears\./);
    expect(frame).not.toContain("act1-battle");
  });

  test("keeps the zh combat sidebar readable and localized", async () => {
    const frame = await renderFrame({ columns: 100, rows: 24, locale: "zh", inputs: ["1", "1"] });

    expect(frame).toContain("┌");
    expect(frame).toContain("B");
    expect(frame).toMatch(/获得 30 金币|前往 房间 1-1（精英）/);
    expect(frame).toMatch(/袭掠者出现|哨卫出现|游击者出现|余烬术士出现|灰烬斥候出现|长枪暴徒出现|军旗队长出现|攻城铁匠出现|粉碎者出现/);
    expect(frame).not.toContain("act1-battle");
  });

  test("shows current status with deck and relic sections during combat", async () => {
    const deckFrame = await renderFrame({ columns: 120, rows: 28, inputs: ["1", "1", "d"] });
    const relicFrame = await renderFrame({ columns: 120, rows: 28, inputs: ["1", "1", "d", "]"] });

    expect(deckFrame).toContain("Status");
    expect(deckFrame).toContain("Deck  Current Relics");
    expect(deckFrame).toContain("Deck size 10");
    expect(deckFrame).toContain("4x Strike [1]");
    expect(deckFrame).toContain("Deal 6 damage.");
    expect(deckFrame).toContain("Bash [2]");
    expect(deckFrame).toContain("Deal 8 damage. Apply 2 Vulnerable.");

    expect(relicFrame).toContain("Status");
    expect(relicFrame).toContain("Relics 1");
    expect(relicFrame).toContain("Burning Blood - Recover 4 HP after each combat.");
  });

  test("renders blessing options without spacer gaps between choices", async () => {
    const frame = await renderFrame({ columns: 80, rows: 24, locale: "zh" });

    expect(frame).toMatch(/效果：获得 30 金币。\n\s*2\. 强健/u);
    expect(frame).toMatch(/效果：获得 6 点最大生命并回复 6 点生命。\n\s*3\. 愤怒/u);
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
      expect(startFrame).toContain("获得：加入牌组");
      expect(startFrame).toContain("效果：造成 4 点伤害。");
      expect(startFrame).not.toContain("：:");
      expect(startFrame).not.toContain("::");
      expect(mapFrame).toContain("路径： 1.");
      expect(mapFrame).toContain("2.");
      expect(mapFrame).toContain("3.");
      expect(movedFrame).toContain("┌");
      expect(movedFrame).toContain("B");
      expect(movedFrame).toMatch(/获得 30 金币|前往 房间 1-1（精英）|前往 房间 1-1（战斗）/);
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
}: {
  seed?: number;
  columns: number;
  rows: number;
  locale?: "en" | "zh";
  characterId?: CharacterId | null;
  inputs?: string[];
}): Promise<string> {
  const props = characterId === null ? { seed, locale } : { seed, locale, characterId };
  const instance = render(React.createElement(App, props));

  Object.defineProperty(instance.stdout, "columns", { value: columns, configurable: true });
  Object.defineProperty(instance.stdout, "rows", { value: rows, configurable: true });
  instance.stdout.emit("resize");
  await waitForInk();

  for (const input of inputs) {
    instance.stdin.write(input);
    await waitForInk();
    await waitForInk();
  }

  return instance.lastFrame() ?? "";
}

async function waitForInk(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}
