import { describe, expect, it } from "vitest";
import { createAnalysisJob, getAnalysisJob, markJobCompleted, updateJobAgent } from "./analysis-job-store";
import type { LeadPilotAnalysisResult } from "./types";

describe("analysis job store", () => {
  it("tracks backend agent progress and completion", () => {
    const job = createAnalysisJob({ url: "https://example.com", socialUrls: [] });

    updateJobAgent(job.id, { agent: "Research Agent", status: "running", summary: "Research started." });
    expect(getAnalysisJob(job.id)?.agents.find((agent) => agent.agent === "Research")?.status).toBe("running");

    const result = {
      agentRuns: [
        {
          agent: "Research Agent",
          status: "completed",
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          summary: "Research completed.",
          provider: "local",
          model: "none",
          responseFormat: "none",
          latencyMs: 1,
          usedFallback: false,
          outputValidated: true
        }
      ]
    } as LeadPilotAnalysisResult;
    markJobCompleted(job.id, result);

    expect(getAnalysisJob(job.id)?.status).toBe("completed");
    expect(getAnalysisJob(job.id)?.result).toBe(result);
  });
});
