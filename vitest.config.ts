import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/web/src/**/*.test.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["apps/web/src/lib/**/*.ts"],
      exclude: ["apps/web/src/**/*.test.ts", "apps/web/src/lib/types.ts"],
      reporter: ["text", "json-summary"]
    }
  }
});
