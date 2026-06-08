import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadLeadPilotEnv } from "./env-loader";

const touchedEnvKeys = ["DASHSCOPE_API_KEY", "LEADPILOT_FORCE_MOCK", "LEADPILOT_MOCK_WEBSITE"];
const previousEnv = new Map(touchedEnvKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of touchedEnvKeys) {
    const previous = previousEnv.get(key);
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
});

describe("loadLeadPilotEnv", () => {
  it("loads root .env.local when the Next app runs from a nested directory", async () => {
    const root = path.join(os.tmpdir(), `leadpilot-env-${Date.now()}`);
    const nested = path.join(root, "apps", "web");
    await mkdir(nested, { recursive: true });
    await writeFile(
      path.join(root, ".env.local"),
      ["DASHSCOPE_API_KEY=test-root-key", "LEADPILOT_FORCE_MOCK=false", "LEADPILOT_MOCK_WEBSITE=false"].join("\n"),
      "utf8"
    );

    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.LEADPILOT_FORCE_MOCK;
    delete process.env.LEADPILOT_MOCK_WEBSITE;

    const result = loadLeadPilotEnv(nested);

    expect(result.loaded).toBe(true);
    expect(result.path).toBe(path.join(root, ".env.local"));
    expect(process.env.DASHSCOPE_API_KEY).toBe("test-root-key");
    expect(process.env.LEADPILOT_FORCE_MOCK).toBe("false");

    await rm(root, { recursive: true, force: true });
  });

  it("does not overwrite environment variables already set by the runtime", async () => {
    const root = path.join(os.tmpdir(), `leadpilot-env-${Date.now()}-preserve`);
    await mkdir(root, { recursive: true });
    await writeFile(path.join(root, ".env.local"), "DASHSCOPE_API_KEY=file-key", "utf8");
    process.env.DASHSCOPE_API_KEY = "runtime-key";

    loadLeadPilotEnv(root);

    expect(process.env.DASHSCOPE_API_KEY).toBe("runtime-key");
    await rm(root, { recursive: true, force: true });
  });
});
