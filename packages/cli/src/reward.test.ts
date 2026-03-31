import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, test } from "vitest";
import type { RewardObservation } from "@towerlab/core";

import { PhaseBody, Controls } from "./app/components.js";
import { sampleContent } from "@towerlab/content";

afterEach(() => {
  cleanup();
});

function createRewardObservation(mode: "menu" | "cards"): RewardObservation {
  return {
    seed: 7,
    characterId: "warrior",
    act: 1,
    totalActs: 3,
    phase: "reward",
    hp: 42,
    maxHp: 60,
    gold: 18,
    floor: 2,
    currentNode: { id: "act1-elite-r2", kind: "elite", nextIds: ["act1-rest-r3"] },
    relics: [],
    log: [],
    mode,
    rewardItems: [
      { kind: "gold", rewardIndex: 0, amount: 18 },
      {
        kind: "relic",
        rewardIndex: 1,
        relic: {
          id: "burning-blood",
          name: "燃血",
          description: "每场战斗后恢复 4 点生命。",
          kind: "postCombatHeal",
          value: 4,
        },
      },
      {
        kind: "cards",
        rewardIndex: 2,
        cardChoices: [
          { id: "anger", name: "愤怒", rarity: "common", upgraded: false, cost: 0, damage: 4 },
          { id: "shrug", name: "不当回事", rarity: "common", upgraded: false, cost: 1, block: 8, draw: 1 },
          { id: "trance", name: "战斗狂潮", rarity: "rare", upgraded: false, cost: 0, draw: 2, keywords: ["exhaust"] },
        ],
      },
    ],
    cardChoices:
      mode === "cards"
        ? [
            { id: "anger", name: "愤怒", rarity: "common", upgraded: false, cost: 0, damage: 4 },
            { id: "shrug", name: "不当回事", rarity: "common", upgraded: false, cost: 1, block: 8, draw: 1 },
            { id: "trance", name: "战斗狂潮", rarity: "rare", upgraded: false, cost: 0, draw: 2, keywords: ["exhaust"] },
          ]
        : [],
    nextNodes: [{ id: "act1-rest-r3", kind: "rest", nextIds: [] }],
  };
}

describe("reward rendering", () => {
  test("shows direct rewards in the top-level reward menu", () => {
    const observation = createRewardObservation("menu");
    const body = render(
      React.createElement(PhaseBody, {
        content: sampleContent,
        observation,
        locale: "zh",
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
        observation,
        locale: "zh",
        shopMenu: "top",
        shopBuyPageCount: 1,
        shopRemovePageCount: 1,
        restMode: "options",
        restUpgradePageCount: 1,
        combatHandPageCount: 1,
      }),
    );

    expect(body.lastFrame()).toContain("领取奖励，或跳过剩余奖励。");
    expect(body.lastFrame()).toContain("1. 金币 - 18 金币");
    expect(body.lastFrame()).toContain("2. 遗物 - 燃血");
    expect(body.lastFrame()).toContain("3. 卡牌奖励");
    expect(body.lastFrame()).toContain("从 3 张卡牌中选择 1 张。");
    expect(controls.lastFrame()).toContain("1-9 领取奖励");
  });

  test("shows a second-level card choice menu", () => {
    const observation = createRewardObservation("cards");
    const body = render(
      React.createElement(PhaseBody, {
        content: sampleContent,
        observation,
        locale: "zh",
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

    expect(body.lastFrame()).toContain("选择一张奖励卡。");
    expect(body.lastFrame()).toContain("1. 愤怒 [0]");
    expect(body.lastFrame()).toContain("2. 不当回事 [1]");
    expect(body.lastFrame()).toContain("b. 返回");
    expect(body.lastFrame()).toContain("s. 跳过剩余奖励");
  });
});
