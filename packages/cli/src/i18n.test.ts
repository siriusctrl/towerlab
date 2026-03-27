import { sampleContent } from "@towerlab/content";
import type { LogEvent } from "@towerlab/core";
import { describe, expect, test } from "vitest";

import { formatBlessingAcquisition, formatBlessingDescription, formatBlessingName, formatCardEffectLines, formatLogEntries, localizeCardDefinition, localizeCardKeyword } from "./i18n.js";

describe("i18n log localization", () => {
  test("formats every current core log event template in zh", () => {
    const events: LogEvent[] = [
      { type: "enteredNode", nodeId: "battle-r1-p1", kind: "battle" },
      { type: "movedToNode", nodeId: "rest-r2-p4", kind: "rest" },
      { type: "atEntrance" },
      { type: "enemyAppeared", enemyId: "crusher", intent: { kind: "attackBlock", description: "Crush for 8 and gain 4 block", damage: 8, block: 4 } },
      { type: "playedCard", cardId: "strike", effects: [{ type: "damage", amount: 6 }] },
      { type: "playedCard", cardId: "surge", effects: [{ type: "damage", amount: 4 }, { type: "block", amount: 4 }] },
      { type: "playedCard", cardId: "defend", effects: [] },
      { type: "enemyDefeated", enemyId: "sentry", gold: 12 },
      { type: "rewardOffered" },
      { type: "rewardCardAdded", cardId: "surge" },
      { type: "rewardSkipped" },
      { type: "chooseNextPath" },
      { type: "chooseCampfire" },
      { type: "recoveredHp", amount: 6 },
      { type: "fortified", maxHp: 7 },
      { type: "shopEntered" },
      { type: "shopCardBought", cardId: "surge", gold: 25 },
      { type: "deckCardRemoved", cardId: "strike", gold: 50 },
      { type: "shopLeft" },
      { type: "relicAlreadyOwned", relicId: "combatFocus" },
      { type: "relicAcquired", relicId: "combatFocus" },
      { type: "enemyUsedIntent", enemyId: "sentry", intent: { kind: "attack", description: "Jab for 5", damage: 5 } },
      { type: "playerDefeated" },
      { type: "turnStarted", turn: 2, intent: { kind: "block", description: "Brace for 6 block", block: 6 } },
      { type: "bossCleared" },
      { type: "pathVictory" },
      { type: "climbEnded" },
    ];

    expect(formatLogEntries(sampleContent, events, "zh")).toEqual([
      "进入 房间 1-1（战斗）。",
      "前往 房间 2-4（营火）。",
      "来到入口。请选择第一条路径。",
      "粉碎者出现。意图：粉碎造成 8 点并获得 4 点格挡。",
      "打出打击：造成 6 点伤害。",
      "打出突进：造成 4 点伤害，获得 4 点格挡。",
      "打出防御。",
      "击败哨卫，获得 12 金币。",
      "获得奖励。请选择一张卡牌奖励，或跳过。",
      "将突进加入牌组。",
      "跳过奖励。",
      "请选择下一条路径。",
      "请选择如何使用营火。",
      "恢复 6 点生命。",
      "巩固成功，最大生命 +7。",
      "你发现了一间商店。看看有哪些货物。",
      "购买突进，花费 25 金币。",
      "从牌组移除打击，花费 50 金币。",
      "离开商店。",
      "遗物战斗专注已经获得过。",
      "获得遗物战斗专注。",
      "哨卫使用了刺击 5 点。",
      "你被击败了。",
      "第 2 回合。意图：准备获得 6 点格挡。",
      "首领倒下了。高塔已被攻克。",
      "道路的尽头是胜利。",
      "你的攀登到此结束。",
    ]);
  });

  test("shows card blessing names directly and includes card effects", () => {
    const blessing = sampleContent.acts[0]!.blessings[2]!;

    expect(formatBlessingName(sampleContent, blessing, "en")).toBe("Anger");
    expect(formatBlessingAcquisition(blessing, "en")).toBe("Add to deck");
    expect(formatBlessingDescription(sampleContent, blessing, "en")).toBe("Deal 4 damage.");
    expect(formatBlessingName(sampleContent, blessing, "zh")).toBe("愤怒");
    expect(formatBlessingAcquisition(blessing, "zh")).toBe("加入牌组");
    expect(formatBlessingDescription(sampleContent, blessing, "zh")).toBe("造成 4 点伤害。");
  });

  test("formats draw/energy/heal/exhaust card effects in both locales", () => {
    const events: LogEvent[] = [
      { type: "playedCard", cardId: "draw-tester", effects: [{ type: "draw", amount: 2 }] },
      { type: "playedCard", cardId: "energy-tester", effects: [{ type: "energy", amount: 1 }] },
      { type: "playedCard", cardId: "heal-tester", effects: [{ type: "heal", amount: 5 }] },
      { type: "playedCard", cardId: "exhaust-tester", effects: [{ type: "exhaust" }] },
    ];

    expect(formatLogEntries(sampleContent, events, "en")).toEqual([
      "Played draw-tester: draw 2.",
      "Played energy-tester: gain 1 energy.",
      "Played heal-tester: recover 5 HP.",
      "Played exhaust-tester: exhaust.",
    ]);

    expect(formatLogEntries(sampleContent, events, "zh")).toEqual([
      "打出draw-tester：抽 2 张牌。",
      "打出energy-tester：获得 1 点能量。",
      "打出heal-tester：恢复 5 点生命。",
      "打出exhaust-tester：消耗。",
    ]);
  });

  test("localizes retain keyword labels in both locales", () => {
    expect(localizeCardKeyword("retain", "en")).toBe("Retain");
    expect(localizeCardKeyword("retain", "zh")).toBe("保留");
  });

  test("keeps upgraded card names with plus suffix in localized output", () => {
    const upgraded = localizeCardDefinition(
      {
        id: "strike",
        upgraded: true,
        damage: 9,
      },
      "zh",
      sampleContent,
    );

    expect(upgraded.name).toBe("打击+");
    expect(upgraded.upgraded).toBe(true);
  });

  test("formats card effects from numeric card fields into locale-specific lines", () => {
    const card = localizeCardDefinition(
      {
        id: "war-cry",
        name: "War Cry",
        cost: 1,
        damage: 0,
        draw: 1,
        energy: 1,
      },
      "en",
      sampleContent,
    );

    expect(formatCardEffectLines(card, "en")).toEqual([
      "Draw 1 card.",
      "Gain 1 energy.",
    ]);
  });
});
