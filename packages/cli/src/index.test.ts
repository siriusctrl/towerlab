import { describe, expect, test } from "vitest";

import { sampleContent } from "@towerlab/content";

import { renderSnapshot, runHeadless } from "./index.js";

describe("headless CLI", () => {
  test("create returns deterministic initial state and legal actions", () => {
    const output = JSON.parse(runHeadless(["--json", "create", "--seed", "9", "--character", "warrior"]));

    expect(output.command).toBe("create");
    expect(output.seed).toBe(9);
    expect(output.state.seed).toBe(9);
    expect(output.state.characterId).toBe("warrior");
    expect(output.state.phase).toBe("blessing");
    expect(Array.isArray(output.legalActions)).toBe(true);
    expect(output.legalActions[0]).toEqual(expect.objectContaining({ type: "chooseBlessing", blessingId: expect.any(String) }));
  });

  test("create supports chinese localization", () => {
    const output = JSON.parse(runHeadless(["--json", "create", "--seed", "7", "--character", "warrior", "--lang", "zh"]));

    expect(output.locale).toBe("zh");
    expect(output.acts[0].map[0]).toEqual(expect.objectContaining({ id: "act1-start-r0", kind: "start" }));
    expect(output.acts[0].map.at(-1)).toEqual(expect.objectContaining({ kind: "boss" }));
    expect(output.observation.nextNodes).toHaveLength(3);
    expect(output.observation.log[0]).toEqual({ type: "actStarted", act: 1 });
    expect(output.observation.log[1]).toEqual({ type: "atEntrance" });

    const snapshot = renderSnapshot(7, "zh", "warrior");
    expect(snapshot).toContain("种子: 7");
    expect(snapshot).toContain("角色: 战士");
    expect(snapshot).toContain("阶段: 祝福");
    expect(snapshot).toContain("层: 1/3");
    expect(snapshot).toContain("节点: 岔路口 (起点)");
    expect(snapshot).toContain("祝福:");
    expect(snapshot).toContain("1. 厚赏");
    expect(snapshot).toContain("2. 强健");
    expect(snapshot).toContain("3. 获得卡牌：愤怒");
    expect(snapshot).toContain("造成 4 点伤害。");
    expect(snapshot).toContain("- 来到入口。请选择第一条路径。");
    expect(snapshot).toContain("最近事件:");
  });

  test("non-tty snapshot shows floor map with each node once and opening blessings", () => {
    const snapshot = renderSnapshot(7, "zh", "warrior");

    expect(snapshot).toContain("地图:");
    // Legend uses node badges.
    expect(snapshot).toContain("S 起点");
    expect(snapshot).toContain("F 战斗");
    expect(snapshot).toContain("B 首领");
    // Current node badge
    expect(snapshot).toContain("S");
    expect(snapshot).toContain("祝福:");
    expect(snapshot).not.toContain("路径：");
  });

  test("step applies a single action after replaying prior actions", () => {
    const create = JSON.parse(runHeadless(["--json", "create", "--seed", "9", "--character", "warrior"]));
    const firstBlessingId = create.legalActions[0].blessingId;
    const firstChoiceId = create.observation.nextNodes[0].id;
    const observe = JSON.parse(
      runHeadless([
        "--json",
        "observe",
        "--seed",
        "9",
        "--character",
        "warrior",
        "--actions",
        JSON.stringify([{ type: "chooseBlessing", blessingId: firstBlessingId }, { type: "choosePath", nodeId: firstChoiceId }]),
      ]),
    );
    const output = JSON.parse(
      runHeadless([
        "--json",
        "step",
        "--seed",
        "9",
        "--character",
        "warrior",
        "--actions",
        JSON.stringify([{ type: "chooseBlessing", blessingId: firstBlessingId }, { type: "choosePath", nodeId: firstChoiceId }]),
        "--action",
        JSON.stringify({ type: "endTurn" }),
      ]),
    );

    expect(output.command).toBe("step");
    expect(output.seed).toBe(9);
    expect(output.previousActions).toEqual([{ type: "chooseBlessing", blessingId: firstBlessingId }, { type: "choosePath", nodeId: firstChoiceId }]);
    expect(output.action.type).toBe("endTurn");
    expect(output.actions).toEqual([
      { type: "chooseBlessing", blessingId: firstBlessingId },
      { type: "choosePath", nodeId: firstChoiceId },
      { type: "endTurn" },
    ]);
    expect(output.state.phase).toBe("combat");
    expect(output.observation).not.toEqual(observe.observation);
  });

  test("observe and replay produce consistent end state and trace", () => {
    const create = JSON.parse(runHeadless(["--json", "create", "--seed", "9", "--character", "warrior"]));
    const firstBlessingId = create.legalActions[0].blessingId;
    const firstChoiceId = create.observation.nextNodes[0].id;
    const actions = [
      { type: "chooseBlessing", blessingId: firstBlessingId },
      { type: "choosePath", nodeId: firstChoiceId },
      { type: "endTurn" },
    ];
    const observe = JSON.parse(
      runHeadless(["--json", "observe", "--seed", "9", "--character", "warrior", "--actions", JSON.stringify(actions)]),
    );
    const replay = JSON.parse(
      runHeadless([
        "--json",
        "replay",
        "--seed",
        "9",
        "--character",
        "warrior",
        "--actions",
        JSON.stringify(actions),
      ]),
    );

    expect(observe.command).toBe("observe");
    expect(replay.command).toBe("replay");
    expect(replay.state).toEqual(observe.state);
    expect(replay.trace).toHaveLength(actions.length + 1);
    expect(replay.trace[0].step).toBe(0);
    expect(replay.trace[0].action).toBeNull();
    expect(replay.trace.at(-1)?.observation).toEqual(observe.observation);
  });

  test("batch returns deterministic metrics and per-run summaries", () => {
    const first = JSON.parse(
      runHeadless(["--json", "batch", "--policy", "random", "--character", "warrior", "--seeds", "7,8,9"]),
    );
    const second = JSON.parse(
      runHeadless(["--json", "batch", "--policy", "random", "--character", "warrior", "--seeds", "7,8,9"]),
    );

    expect(first).toEqual(second);
    expect(first.command).toBe("batch");
    expect(first.policyName).toBe("random");
    expect(first.seeds).toEqual([7, 8, 9]);
    expect(first.runs).toHaveLength(3);
    expect(first.metrics).toEqual({
      wins: expect.any(Number),
      losses: expect.any(Number),
      averageGold: expect.any(Number),
      averageEndingHp: expect.any(Number),
      pathChoiceCounts: expect.any(Object),
    });
    expect(first.runs[0]).toMatchObject({
      seed: expect.any(Number),
      outcome: expect.any(String),
      actions: expect.any(Array),
    });
  });

  test("batch also supports seed ranges", () => {
    const output = JSON.parse(
      runHeadless(["--json", "batch", "--policy", "greedy", "--character", "warrior", "--seed-start", "3", "--count", "2"]),
    );

    expect(output.seeds).toEqual([3, 4]);
    expect(output.runs).toHaveLength(2);
  });

  test("generated relic rewards stay unique across early elite and boss previews", () => {
    const output = JSON.parse(runHeadless(["--json", "create", "--seed", "7", "--character", "warrior"]));
    const actOneEliteRelics = output.acts[0].map
      .filter((node: { kind: string; relicReward?: string }) => node.kind === "elite")
      .map((node: { relicReward: string }) => node.relicReward);
    const bossRelics = output.acts
      .map((act: { map: Array<{ kind: string; relicReward?: string }> }) => act.map.find((node) => node.kind === "boss")?.relicReward)
      .filter(Boolean);

    expect(new Set(actOneEliteRelics).size).toBe(actOneEliteRelics.length);
    expect(actOneEliteRelics.length).toBeLessThanOrEqual(sampleContent.character.relicPools.elite.length);
    expect(new Set(bossRelics).size).toBe(bossRelics.length);
  });

  test("generated acts keep a deeper room stack per act", () => {
    const output = JSON.parse(runHeadless(["--json", "create", "--seed", "7", "--character", "warrior"]));
    const actSizes = output.acts.map((act: { map: Array<unknown> }) => act.map.length);

    expect(actSizes.every((size: number) => size >= 34)).toBe(true);
  });

  test("batch-only flags are rejected outside batch mode", () => {
    expect(() => runHeadless(["--json", "create", "--character", "warrior", "--policy", "random", "--seeds", "1,2"])).toThrow(
      "--policy, --seeds, --seed-start, and --count are only valid in batch mode",
    );
  });

  test("malformed JSON arguments fail loudly", () => {
    expect(() => runHeadless(["--json", "observe", "--seed", "9", "--character", "warrior", "--actions", "{not-json}"])).toThrow(
      "Invalid JSON action list: {not-json}",
    );
    expect(() => runHeadless(["--json", "step", "--seed", "9", "--character", "warrior", "--action", "{\"type\":123}"])).toThrow(
      "Invalid action shape: {\"type\":123}",
    );
  });

  test("unsupported batch arguments are rejected loudly", () => {
    expect(() => runHeadless(["--json", "batch", "--policy", "bogus", "--character", "warrior", "--seeds", "1,2"])).toThrow(
      "--policy must be one of random, greedy, heuristic",
    );
    expect(() => runHeadless(["--json", "batch", "--policy", "random", "--character", "warrior"])).toThrow(
      "batch mode requires --seeds or --seed-start with --count",
    );
  });

  test("unsupported locale is rejected", () => {
    expect(() => runHeadless(["--json", "create", "--lang", "jp"])).toThrow("--lang must be one of en, zh");
  });

  test("headless parse errors are localized in chinese mode", () => {
    expect(() => runHeadless(["--json", "observe", "--lang", "zh", "--character", "warrior", "--actions", "{not-json}"])).toThrow(
      "动作列表 JSON 非法：{not-json}",
    );
    expect(() => runHeadless(["--json", "step", "--lang", "zh", "--character", "warrior", "--action", "not-json"])).toThrow(
      "动作 JSON 非法：not-json",
    );
    expect(() => runHeadless(["--json", "create", "--lang", "zh", "--character", "warrior", "bogus"])).toThrow("未知的位置参数：bogus");
    expect(() => runHeadless(["--json", "create", "--lang", "zh", "--character", "warrior", "--bogus"])).toThrow("未知参数：--bogus");
    expect(() => runHeadless(["--json", "create", "--lang", "zh"])).toThrow("headless 模式需要提供 --character");
  });

  test("illegal step and replay actions surface the core errors", () => {
    const create = JSON.parse(runHeadless(["--json", "create", "--seed", "9", "--character", "warrior"]));
    const firstBlessingId = create.legalActions[0].blessingId;

    expect(() =>
      runHeadless([
        "--json",
        "step",
        "--seed",
        "9",
        "--character",
        "warrior",
        "--actions",
        JSON.stringify([{ type: "chooseBlessing", blessingId: firstBlessingId }]),
        "--action",
        JSON.stringify({ type: "choosePath", nodeId: "bogus" }),
      ]),
    ).toThrow("node bogus is not reachable from act1-start-r0");

    expect(() =>
      runHeadless([
        "--json",
        "replay",
        "--seed",
        "9",
        "--character",
        "warrior",
        "--actions",
        JSON.stringify([{ type: "playCard", handIndex: 0 }]),
      ]),
    ).toThrow("cards can only be played during combat");
  });
});
