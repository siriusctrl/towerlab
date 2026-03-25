import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, test } from "vitest";

import { App } from "./app.js";

afterEach(() => {
  cleanup();
});

describe("App layout", () => {
  test("keeps the map heading visible on 80x24 terminals", async () => {
    const frame = await renderFrame({ columns: 80, rows: 24 });

    expect(frame).toContain("\n Map\n");
    expect(frame).toContain("S start");
    expect(frame).not.toContain("Recent Activity");
  });

  test("does not enable the sidebar on 100x20 combat terminals", async () => {
    const frame = await renderFrame({ columns: 100, rows: 20, inputs: ["1"] });

    expect(frame).toContain("Combat");
    expect(frame).toContain("Sentry");
    expect(frame).not.toContain("Recent Activity");
    expect(frame).not.toContain("│ Map");
  });

  test("shows the full compact legend when the sidebar is enabled", async () => {
    const frame = await renderFrame({ columns: 100, rows: 24 });

    expect(frame).toContain("│ Map");
    expect(frame).toContain("S start");
    expect(frame).toContain("Recent Activity");
  });
});

async function renderFrame({
  columns,
  rows,
  inputs = [],
}: {
  columns: number;
  rows: number;
  inputs?: string[];
}): Promise<string> {
  const instance = render(React.createElement(App, { seed: 7, locale: "en" }));

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
