import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/provider-status", () => {
  it("reports Qwen readiness without exposing secrets", async () => {
    const previousKey = process.env.DASHSCOPE_API_KEY;
    const previousForceMock = process.env.LEADPILOT_FORCE_MOCK;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousExaKey = process.env.EXA_API_KEY;
    process.env.DASHSCOPE_API_KEY = "test-secret-key";
    process.env.LEADPILOT_FORCE_MOCK = "false";
    process.env.DATABASE_URL = "";
    process.env.EXA_API_KEY = "";

    const response = await GET();
    const data = await response.json();

    expect(data).toMatchObject({
      provider: "qwen-cloud",
      keyConfigured: true,
      forceMock: false,
      liveReady: true,
      memoryStorage: "jsonl",
      cloudMemoryReady: false,
      competitorSearchProvider: "none",
      competitorSearchReady: false
    });
    expect(JSON.stringify(data)).not.toContain("test-secret-key");

    if (previousKey === undefined) {
      delete process.env.DASHSCOPE_API_KEY;
    } else {
      process.env.DASHSCOPE_API_KEY = previousKey;
    }
    if (previousForceMock === undefined) {
      delete process.env.LEADPILOT_FORCE_MOCK;
    } else {
      process.env.LEADPILOT_FORCE_MOCK = previousForceMock;
    }
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    if (previousExaKey === undefined) {
      delete process.env.EXA_API_KEY;
    } else {
      process.env.EXA_API_KEY = previousExaKey;
    }
  });
});
