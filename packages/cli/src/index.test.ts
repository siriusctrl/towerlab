import { describe, expect, test } from "vitest";

import { renderSnapshot, runHeadless } from "./index.js";

describe("headless CLI", () => {
  test("create returns deterministic initial state and legal actions", () => {
    const output = JSON.parse(runHeadless(["--json", "create", "--seed", "9"]));

    expect(output.command).toBe("create");
    expect(output.seed).toBe(9);
    expect(output.state.seed).toBe(9);
    expect(output.state.phase).toBe("combat");
    expect(Array.isArray(output.legalActions)).toBe(true);
  });

  test("create supports chinese localization", () => {
    const output = JSON.parse(runHeadless(["--json", "create", "--seed", "7", "--lang", "zh"]));

    expect(output.locale).toBe("zh");
    expect(output.map).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "gate" }),
        expect.objectContaining({ id: "summit" }),
      ]),
    );
    expect(output.observation.hand[0].name).toBe("打击");
    expect(output.observation.log[0]).toContain("进入");

    const snapshot = renderSnapshot(7, "zh");
    expect(snapshot).toContain("种子: 7");
    expect(snapshot).toContain("阶段: 战斗");
    expect(snapshot).toContain("最近事件:");
  });

  test("non-tty snapshot shows full map with current node and next choices", () => {
    const snapshot = renderSnapshot(7, "zh");
    const lines = snapshot.split("\n");

    expect(snapshot).toContain("地图:");
    expect(lines).toContain("1. ▶ gate (战斗)");
    expect(lines).toContain("2. → forge (精英)   → hall (战斗)");
    expect(lines).toContain("3. · restCamp (营火)   · market (商店)");
    expect(lines).toContain("4. · summit (首领)");
  });

  test("step applies a single action after replaying prior actions", () => {
    const observe = JSON.parse(
      runHeadless(["--json", "observe", "--seed", "9", "--actions", JSON.stringify([{ type: "endTurn" }])]),
    );
    const output = JSON.parse(
      runHeadless([
        "--json",
        "step",
        "--seed",
        "9",
        "--actions",
        JSON.stringify([{ type: "endTurn" }]),
        "--action",
        JSON.stringify({ type: "playCard", handIndex: 0 }),
      ]),
    );

    expect(output.command).toBe("step");
    expect(output.seed).toBe(9);
    expect(output.previousActions).toEqual([{ type: "endTurn" }]);
    expect(output.action.type).toBe("playCard");
    expect(output.actions).toEqual([{ type: "endTurn" }, { type: "playCard", handIndex: 0 }]);
    expect(output.state.phase).toBe("combat");
    expect(output.observation).not.toEqual(observe.observation);
  });

  test("observe and replay produce consistent end state and trace", () => {
    const actions = [
      { type: "endTurn" },
      { type: "playCard", handIndex: 0 },
    ];
    const observe = JSON.parse(
      runHeadless(["--json", "observe", "--seed", "9", "--actions", JSON.stringify(actions)]),
    );
    const replay = JSON.parse(
      runHeadless([
        "--json",
        "replay",
        "--seed",
        "9",
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
      runHeadless(["--json", "batch", "--policy", "random", "--seeds", "7,8,9"]),
    );
    const second = JSON.parse(
      runHeadless(["--json", "batch", "--policy", "random", "--seeds", "7,8,9"]),
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
      runHeadless(["--json", "batch", "--policy", "greedy", "--seed-start", "3", "--count", "2"]),
    );

    expect(output.seeds).toEqual([3, 4]);
    expect(output.runs).toHaveLength(2);
  });

  test("batch-only flags are rejected outside batch mode", () => {
    expect(() => runHeadless(["--json", "create", "--policy", "random", "--seeds", "1,2"])).toThrow(
      "--policy, --seeds, --seed-start, and --count are only valid in batch mode",
    );
  });

  test("malformed JSON arguments fail loudly", () => {
    expect(() => runHeadless(["--json", "observe", "--seed", "9", "--actions", "{not-json}"])).toThrow(
      "Invalid JSON action list: {not-json}",
    );
    expect(() => runHeadless(["--json", "step", "--seed", "9", "--action", "{\"type\":123}"])).toThrow(
      "Invalid action shape: {\"type\":123}",
    );
  });

  test("unsupported batch arguments are rejected loudly", () => {
    expect(() => runHeadless(["--json", "batch", "--policy", "bogus", "--seeds", "1,2"])).toThrow(
      "--policy must be one of random, greedy, heuristic",
    );
    expect(() => runHeadless(["--json", "batch", "--policy", "random"])).toThrow(
      "batch mode requires --seeds or --seed-start with --count",
    );
  });

  test("unsupported locale is rejected", () => {
    expect(() => runHeadless(["--json", "create", "--lang", "jp"])).toThrow("--lang must be one of en, zh");
  });

  test("headless parse errors are localized in chinese mode", () => {
    expect(() => runHeadless(["--json", "observe", "--lang", "zh", "--actions", "{not-json}"])).toThrow(
      "动作列表 JSON 非法：{not-json}",
    );
    expect(() => runHeadless(["--json", "step", "--lang", "zh", "--action", "not-json"])).toThrow(
      "动作 JSON 非法：not-json",
    );
    expect(() => runHeadless(["--json", "create", "--lang", "zh", "bogus"])).toThrow("未知的位置参数：bogus");
  });

  test("illegal step and replay actions surface the core errors", () => {
    expect(() =>
      runHeadless([
        "--json",
        "step",
        "--seed",
        "9",
        "--action",
        JSON.stringify({ type: "playCard", handIndex: 99 }),
      ]),
    ).toThrow("hand index 99 is not available");

    expect(() =>
      runHeadless([
        "--json",
        "replay",
        "--seed",
        "9",
        "--actions",
        JSON.stringify([{ type: "choosePath", nodeId: "market" }]),
      ]),
    ).toThrow("path choices are only available on the map");
  });
});
