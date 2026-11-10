import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["firebase-rules/**/*.test.ts"],
    environment: "node",
    testTimeout: 15000,
    fileParallelism: false,
  },
});
