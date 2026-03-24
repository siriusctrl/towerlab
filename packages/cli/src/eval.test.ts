import { describe, expect, test } from "vitest";

import {
  type Policy,
  runBatchWithPolicy,
  runSeedWithPolicy,
} from "./eval.js";

describe("eval helper", () => {
  const deterministicPolicy: Policy = ({ legalActions }) => legalActions[0] ?? null;

  test("runSeedWithPolicy is deterministic for the same seed and policy", () => {
    const first = runSeedWithPolicy({
      policyName: "first-legal",
      policy: deterministicPolicy,
      seed: 19,
      maxSteps: 180,
    });
    const second = runSeedWithPolicy({
      policyName: "first-legal",
      policy: deterministicPolicy,
      seed: 19,
      maxSteps: 180,
    });

    expect(first).toEqual(second);
  });

  test("batch metrics include wins, losses, averages, path counts, and per-run summaries", () => {
    const batch = runBatchWithPolicy({
      policyName: "first-legal",
      policy: deterministicPolicy,
      seeds: [1, 4, 7],
      maxSteps: 180,
    });

    expect(batch.policyName).toBe("first-legal");
    expect(batch.seeds).toEqual([1, 4, 7]);
    expect(batch.runs).toHaveLength(3);
    expect(batch.metrics).toEqual({
      losses: expect.any(Number),
      wins: expect.any(Number),
      averageGold: expect.any(Number),
      averageEndingHp: expect.any(Number),
      pathChoiceCounts: expect.any(Object),
    });
    expect(batch.metrics.wins + batch.metrics.losses).toBe(3);
    expect(batch.metrics.averageGold).toBeGreaterThanOrEqual(0);
    expect(batch.metrics.averageEndingHp).toBeGreaterThan(0);

    for (const run of batch.runs) {
      expect(run).toMatchObject({
        seed: expect.any(Number),
        terminalPhase: expect.any(String),
        outcome: expect.stringMatching(/win|loss|error|incomplete/),
        actions: expect.any(Array),
      });
      expect(typeof run.finalGold).toBe("number");
      expect(typeof run.finalHp).toBe("number");
      expect(run.policyName).toBe("first-legal");
    }

    const totalPathChoices = batch.runs.reduce((count, run) => {
      return count + Object.values(run.pathChoiceCounts).reduce((runCount, value) => runCount + value, 0);
    }, 0);
    const aggregatePathChoices = Object.values(batch.metrics.pathChoiceCounts).reduce(
      (count, value) => count + value,
      0,
    );

    expect(aggregatePathChoices).toBe(totalPathChoices);
  });

  test("runSeedWithPolicy reports a null action as an error", () => {
    const result = runSeedWithPolicy({
      policyName: "null-policy",
      policy: () => null,
      seed: 7,
      maxSteps: 10,
    });

    expect(result.outcome).toBe("error");
    expect(result.error).toBe("policy returned no action");
    expect(result.actions).toEqual([]);
    expect(result.steps).toBe(0);
  });

  test("runSeedWithPolicy reports an illegal action as an error", () => {
    const result = runSeedWithPolicy({
      policyName: "illegal-policy",
      policy: () => ({ type: "choosePath", nodeId: "market" }),
      seed: 7,
      maxSteps: 10,
    });

    expect(result.outcome).toBe("error");
    expect(result.error).toBe("policy returned an illegal action");
    expect(result.actions).toEqual([]);
    expect(result.steps).toBe(0);
  });

  test("runSeedWithPolicy reports max-step exhaustion as an error", () => {
    const result = runSeedWithPolicy({
      policyName: "stall-policy",
      policy: deterministicPolicy,
      seed: 7,
      maxSteps: 1,
    });

    expect(result.outcome).toBe("error");
    expect(result.error).toBe("max steps reached (1)");
    expect(result.actions).toEqual([{ type: "choosePath", nodeId: "gate" }]);
    expect(result.steps).toBe(1);
  });
});
