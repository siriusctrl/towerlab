import { sampleContent } from "@towerlab/content";
import type { LogEvent, RestObservation } from "@towerlab/core";
import { describe, expect, test } from "vitest";

import { formatBlessingAcquisition, formatBlessingDescription, formatBlessingName, formatCardEffectLines, formatLogEntries, localizeCardDefinition, localizeCardKeyword, localizeObservation } from "./i18n.js";

describe("i18n log localization", () => {
  test("formats every current core log event template in zh", () => {
    const firstBlessing = sampleContent.acts[0]!.blessings[0]!;
    const rewardCardId = sampleContent.character.rewardCardPools.common[0]!;
    const blessingCardId = sampleContent.character.blessingCardPools.act1[0]!;

    const events: LogEvent[] = [
      { type: "actStarted", act: 2 },
      { type: "enteredNode", nodeId: "battle-r1-p1", kind: "battle" },
      { type: "movedToNode", nodeId: "rest-r2-p4", kind: "rest" },
      { type: "atEntrance" },
      { type: "blessingChosen", blessingId: firstBlessing.id },
      { type: "goldGained", amount: 30 },
      { type: "enemyAppeared", enemyId: "crusher", intent: { kind: "attackBlock", description: "Crush for 8 and gain 4 block", damage: 8, block: 4 } },
      { type: "playedCard", cardId: "strike", upgraded: false, effects: [{ type: "damage", amount: 6 }] },
      { type: "playedCard", cardId: "surge", upgraded: false, effects: [{ type: "damage", amount: 4 }, { type: "block", amount: 4 }] },
      { type: "playedCard", cardId: "defend", upgraded: true, effects: [] },
      { type: "enemyDefeated", enemyId: "sentry", gold: 12 },
      { type: "rewardOffered" },
      { type: "rewardCardAdded", cardId: rewardCardId },
      { type: "blessingCardAdded", cardId: blessingCardId },
      { type: "cardUpgraded", cardId: "strike" },
      { type: "rewardSkipped" },
      { type: "chooseNextPath" },
      { type: "chooseCampfire" },
      { type: "recoveredHp", amount: 6 },
      { type: "shopEntered" },
      { type: "shopCardBought", cardId: "surge", gold: 25 },
      { type: "deckCardRemoved", cardId: "strike", upgraded: true, gold: 50 },
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
      "进入第 2 层。新的祝福在等待。",
      "进入 房间 1-1（战斗）。",
      "前往 房间 2-4（营火）。",
      "来到入口。请选择第一条路径。",
      `接受祝福：${formatBlessingName(sampleContent, firstBlessing, "zh")}。`,
      "获得 30 金币。",
      "粉碎者出现。意图：粉碎造成 8 点并获得 4 点格挡。",
      "打出打击：造成 6 点伤害。",
      "打出突进：造成 4 点伤害，获得 4 点格挡。",
      "打出防御+。",
      "击败哨卫。奖励中包含 12 金币。",
      "获得奖励。请选择要领取的奖励，或跳过剩余奖励。",
      `将${localizeCardDefinition({ id: rewardCardId }, "zh", sampleContent).name}加入牌组。`,
      `祝福将${localizeCardDefinition({ id: blessingCardId }, "zh", sampleContent).name}加入牌组。`,
      "将打击强化为打击+。",
      "跳过奖励。",
      "请选择下一条路径。",
      "请选择如何使用营火。",
      "恢复 6 点生命。",
      "你发现了一间商店。看看有哪些货物。",
      "购买突进，花费 25 金币。",
      "从牌组移除打击+，花费 50 金币。",
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
    const localizedEn = localizeCardDefinition({ id: blessing.cardId!, upgraded: blessing.upgraded }, "en", sampleContent);
    const localizedZh = localizeCardDefinition({ id: blessing.cardId!, upgraded: blessing.upgraded }, "zh", sampleContent);

    expect(formatBlessingName(sampleContent, blessing, "en")).toBe(localizedEn.name);
    expect(formatBlessingAcquisition(blessing, "en")).toBe("Add to deck");
    expect(formatBlessingDescription(sampleContent, blessing, "en")).toBe(localizedEn.description);
    expect(formatBlessingName(sampleContent, blessing, "zh")).toBe(localizedZh.name);
    expect(formatBlessingAcquisition(blessing, "zh")).toBe("加入牌组");
    expect(formatBlessingDescription(sampleContent, blessing, "zh")).toBe(localizedZh.description);
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

  test("localizes retain and ethereal keyword labels in both locales", () => {
    expect(localizeCardKeyword("retain", "en")).toBe("Retain");
    expect(localizeCardKeyword("retain", "zh")).toBe("保留");
    expect(localizeCardKeyword("ethereal", "en")).toBe("Ethereal");
    expect(localizeCardKeyword("ethereal", "zh")).toBe("虚无");
  });

  test("preserves ethereal as a rendered keyword on localized cards", () => {
    const localized = localizeCardDefinition(
      {
        id: "ghostly-armor",
        name: "Ghostly Armor",
        cost: 1,
        keywords: ["ethereal"],
        block: 10,
      },
      "en",
      sampleContent,
    );

    expect(localized.keywords).toContain("ethereal");
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
      "Draw 1 card. Gain 1 energy.",
    ]);
  });

  test("does not duplicate the full card description when structured effect lines already cover it", () => {
    const card = localizeCardDefinition(
      {
        id: "rally-line",
        name: "Rally Line",
        cost: 1,
        description: "Gain 6 block. Draw 1 card.",
        block: 6,
        draw: 1,
      },
      "en",
      sampleContent,
    );

    expect(formatCardEffectLines(card, "en")).toEqual([
      "Gain 6 block. Draw 1 card.",
    ]);
  });

  test("does not append fallback lines that are already represented by structured data", () => {
    const card = localizeCardDefinition(
      {
        id: "rally-line",
        name: "Rally Line",
        cost: 1,
        description: "Gain 6 block. Draw 1 card. Exhaust.",
        block: 6,
        draw: 1,
        exhaust: true,
        keywords: ["exhaust"],
      },
      "en",
      sampleContent,
    );

    expect(formatCardEffectLines(card, "en")).toEqual([
      "Gain 6 block. Draw 1 card.",
    ]);
  });

  test("does not append untranslated passive fallback text when a passive line is already structured in zh", () => {
    const card = localizeCardDefinition(
      {
        id: "cruel-tutelage",
        name: "Cruel Tutelage",
        cost: 1,
        description: "Whenever you apply Weak, Vulnerable, or Poison this combat, draw 1 card.",
        passives: [{ kind: "debuffDraw", value: 1 }],
      },
      "zh",
      sampleContent,
    );

    expect(formatCardEffectLines(card, "zh")).toEqual([
      "本场战斗中，每当你施加虚弱、易伤或中毒，抽 1 张牌。",
    ]);
  });

  test("falls back to parsed description clauses when structured effects are absent", () => {
    const card = localizeCardDefinition(
      {
        id: "legacy-legacy",
        name: "Legacy Clause",
        cost: 1,
        description: "Recover 6 HP. Deal 1 damage. Apply 1 Weak.",
      },
      "en",
      sampleContent,
    );

    expect(formatCardEffectLines(card, "en")).toEqual([
      "Recover 6 HP.",
      "Deal 1 damage.",
      "Apply 1 Weak.",
    ]);

    const zhCard = localizeCardDefinition(
      {
        id: "legacy-legacy",
        name: "Legacy Clause",
        cost: 1,
        description: "Recover 6 HP. Deal 1 damage. Apply 1 Weak.",
      },
      "zh",
      sampleContent,
    );

    expect(formatCardEffectLines(zhCard, "zh")).toEqual([
      "恢复 6 点生命。",
      "造成 1 点伤害。",
      "施加 1 层虚弱。",
    ]);
  });

  test("localizes newly added card descriptions in zh instead of leaking english", () => {
    const localized = localizeCardDefinition(
      {
        id: "dropkick",
        name: "Dropkick",
        cost: 1,
        description: "Deal 8 damage. Draw 1 card.",
        damage: 8,
        draw: 1,
      },
      "zh",
      sampleContent,
    );

    expect(localized.description).toBe("造成 8 点伤害。抽 1 张牌。");
  });

  test("localizes dynamic rest option descriptions and upgrade labels in zh", () => {
    const observation: RestObservation = {
      seed: 7,
      characterId: "warrior",
      act: 1,
      totalActs: 3,
      phase: "rest",
      hp: 28,
      maxHp: 60,
      gold: 99,
      floor: 4,
      currentNode: { id: "rest-r4-p1", kind: "rest", nextIds: [] },
      relics: [],
      log: [],
      mode: "menu",
      nextNodes: [],
      restOptions: [
        { id: "recover", label: "Recover", description: "Heal 18 HP." },
        { id: "upgrade", label: "Upgrade", description: "Upgrade a card in your deck." },
      ],
      upgradableDeckCards: [],
    };

    const localized = localizeObservation(observation, "zh", sampleContent) as RestObservation;

    expect(localized.restOptions).toEqual([
      { id: "recover", label: "恢复", description: "恢复 18 点生命。" },
      { id: "upgrade", label: "强化", description: "强化你牌组中的一张牌。" },
    ]);
  });
});
