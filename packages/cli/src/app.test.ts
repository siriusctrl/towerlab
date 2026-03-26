import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, test } from "vitest";

import { App } from "./app/App.js";

afterEach(() => {
  cleanup();
});

describe("App layout", () => {
  test("renders the map in the main pane on 80x24 map terminals", async () => {
    const frame = await renderFrame({ columns: 80, rows: 24, locale: "zh" });

    expect(frame).toContain("路径： 1. 房间 1-1 (战斗)");
    expect(frame).toContain("2. 房间 1-2 (精英)");
    expect(frame).toContain("3. 房间 1-3 (战斗)");
    expect(frame).not.toContain("│ Map");
    expect(frame).not.toContain("Recent Activity");
  });

  test("keeps the map in the main pane even on wide map terminals", async () => {
    const frame = await renderFrame({ columns: 100, rows: 24 });

    expect(frame).toContain("Crossroads (start)");
    expect(frame).toContain("Paths: 1. Room 1-1 (battle)");
    expect(frame).toContain("2. Room 1-2 (elite)");
    expect(frame).toContain("3. Room 1-3 (battle)");
    expect(frame).not.toContain("│ Map");
    expect(frame).not.toContain("Recent Activity");
  });

  test("does not enable the sidebar on 100x20 combat terminals", async () => {
    const frame = await renderFrame({ columns: 100, rows: 20, inputs: ["1"] });

    expect(frame).toContain("Combat");
    expect(frame).toMatch(/Sentry|Crusher|Forge Keeper/);
    expect(frame).not.toContain("Recent Activity");
    expect(frame).not.toContain("│ Map");
  });

  test("shows minimap and recent activity content in combat sidebars", async () => {
    const frame = await renderFrame({ columns: 100, rows: 24, inputs: ["1"] });

    expect(frame).toContain("S start");
    expect(frame).toContain("- At the entrance. Choose the first path.");
    expect(frame).toContain("- Moved to");
  });

  test("keeps the compact legend readable in zh combat sidebars", async () => {
    const frame = await renderFrame({ columns: 100, rows: 24, locale: "zh", inputs: ["1"] });

    expect(frame).toContain("S 起点  F 战斗  E 精英  R 营地  $ 商店  B 首领");
  });

  test("keeps compact map and post-move minimap stable across multiple seeds", async () => {
    const seeds = [17, 29, 43, 58, 71];

    for (const seed of seeds) {
      const startFrame = await renderFrame({ seed, columns: 100, rows: 24, locale: "zh" });
      const movedFrame = await renderFrame({ seed, columns: 100, rows: 24, locale: "zh", inputs: ["1"] });

      expect(startFrame).toContain("路径： 1.");
      expect(startFrame).toContain("2.");
      expect(startFrame).toContain("3.");
      expect(startFrame).not.toContain("：:");
      expect(startFrame).not.toContain("::");
      expect(movedFrame).toContain("S 起点  F 战斗  E 精英  R 营地  $ 商店  B 首领");
      expect(movedFrame).toContain("前往");
    }
  });
});

async function renderFrame({
  seed = 7,
  columns,
  rows,
  locale = "en",
  inputs = [],
}: {
  seed?: number;
  columns: number;
  rows: number;
  locale?: "en" | "zh";
  inputs?: string[];
}): Promise<string> {
  const instance = render(React.createElement(App, { seed, locale }));

  Object.defineProperty(instance.stdout, "columns", { value: columns, configurable: true });
  Object.defineProperty(instance.stdout, "rows", { value: rows, configurable: true });
  instance.stdout.emit("resize");
  await waitForInk();

  for (const input of inputs) {
    instance.stdin.write(input);
    await waitForInk();
  }

  return instance.lastFrame() ?? "";
}

async function waitForInk(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}
