import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const resolveFromHere = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@towerlab/content": resolveFromHere("../content/src/index.ts"),
      "@towerlab/core": resolveFromHere("../core/src/index.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
