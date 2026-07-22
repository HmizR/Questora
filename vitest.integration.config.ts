import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "src/tests/mocks/server-only.ts")
    }
  },
  test: {
    include: ["src/tests/integration/**/*.test.ts"],
    setupFiles: ["src/tests/integration/setup.ts"],
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    fileParallelism: false
  }
});
