import { describe, expect, it } from "vitest";
import { runLeadPilotAnalysis } from "./analysis-pipeline";
import { buildLeadPilotPdf } from "./pdf-report";
import type { StructuredGenerationRequest, StructuredGenerationResult } from "./qwen-provider";
import { MockQwenProvider, type QwenProvider } from "./qwen-provider";
import { StaticWebsiteFetcher, type WebsiteFetcher } from "./website-fetcher";
import type { WebsiteSnapshot } from "./types";

describe("runLeadPilotAnalysis", () => {
  it("runs the defined multi-agent flow and returns a final report", async () => {
    const result = await runLeadPilotAnalysis({
      url: "https://example.com",
      fetcher: new StaticWebsiteFetcher({
        finalUrl: "https://example.com",
        title: "Example CRM Automation",
        text: [
          "Example helps B2B teams manage leads manually with spreadsheets.",
          "The site mentions response delays, no CRM automation, and limited reporting.",
          "They sell services to growing companies in Mexico and Latin America."
        ].join(" ")
      }),
      qwen: new MockQwenProvider()
    });

    expect(result.businessSummary.companyName).toBe("Example CRM Automation");
    expect(result.detectedProblems.length).toBeGreaterThanOrEqual(2);
    expect(result.salesOpportunityScore.score).toBeGreaterThanOrEqual(70);
    expect(result.budgetEstimate.min).toBeGreaterThan(0);
    expect(result.budgetEstimate.estimatedAnnualRevenueImpact).toBeGreaterThan(result.budgetEstimate.max);
    expect(result.budgetEstimate.roiPercent).toBeGreaterThan(0);
    expect(result.proposalDraft.workPlan.length).toBeGreaterThanOrEqual(3);
    expect(result.recommendedNextSteps.length).toBeGreaterThanOrEqual(2);
    expect(result.finalReport.markdown).toContain("Business Summary");
    expect(result.finalReport.markdown).toContain("Detected Problems");
    expect(result.finalReport.markdown).toContain("Outreach Email");
    expect(result.finalReport.markdown).toContain("ROI Assumptions");
    expect(result.memoryDigest.saved).toBe(true);
    expect(result.memoryDigest.summary).toContain("Example CRM Automation");
    expect(result.memoryDigest.recentRecords.length).toBeGreaterThanOrEqual(1);
    expect(result.memoryDigest.currentScore).toBe(result.salesOpportunityScore.score);
    expect(result.memoryDigest.recentRecords[0].proposalTitle).toBe(result.proposalDraft.title);
    expect(result.conflictResolution.conflictDetected).toBe(true);
    expect(result.conflictResolution.finalScore).toBe(result.salesOpportunityScore.score);
    expect(result.conflictResolution.reason).toContain("Manager Agent");
    expect(result.opportunityHeatmap.map((item) => item.area)).toEqual(
      expect.arrayContaining(["Lead Capture", "CRM", "WhatsApp", "SEO"])
    );
    expect(result.opportunityHeatmap.every((item) => item.score >= 0 && item.score <= 100)).toBe(true);
    expect(result.enterpriseMaturityFactor.score).toBeGreaterThanOrEqual(0);
    expect(result.enterpriseMaturityFactor.score).toBeLessThanOrEqual(100);
    expect(result.enterpriseMaturityFactor.dimensions.map((dimension) => dimension.name)).toEqual(
      expect.arrayContaining(["Process Clarity", "Data & Reporting", "Integration Readiness", "Growth Readiness", "Buying Readiness"])
    );
    expect(result.enterpriseMaturityFactor.recommendedMotion).toContain("pilot");
    expect(result.finalReport.markdown).toContain("Enterprise Maturity Factor");
    expect(result.competitorAnalysis.competitors.length).toBeGreaterThanOrEqual(3);
    expect(result.competitorAnalysis.marketGaps.length).toBeGreaterThanOrEqual(2);
    expect(result.finalReport.markdown).toContain("Competitor Agent");
    expect(result.industryBenchmarks.metrics.length).toBeGreaterThanOrEqual(4);
    expect(result.finalReport.markdown).toContain("Industry Benchmarks");
    expect(result.analysisConfidence.score).toBeGreaterThanOrEqual(0);
    expect(result.analysisConfidence.score).toBeLessThanOrEqual(100);
    expect(result.analysisConfidence.evidence.qwenValidatedAgents).toBeGreaterThanOrEqual(4);
    expect(result.finalReport.markdown).toContain("Analysis Confidence");
    expect(result.actionPlan.weeks).toHaveLength(4);
    expect(result.actionPlan.weeks[0].successMetric).toContain("approved");
    expect(result.finalReport.markdown).toContain("30-Day Action Plan");
    expect(result.costBreakdown.total).toBe(result.budgetEstimate.max);
    expect(result.costBreakdown.items.reduce((sum, item) => sum + item.cost, 0)).toBe(result.costBreakdown.total);
    expect(result.finalReport.markdown).toContain("Cost Breakdown");
    expect(result.riskMatrix.items.length).toBe(result.opportunityHeatmap.length);
    expect(result.finalReport.markdown).toContain("Visual Risk Matrix");
    expect(result.agentDiscussion.map((entry) => entry.agent)).toEqual([
      "Research Agent",
      "Opportunity Agent",
      "Competitor Agent",
      "Pricing Agent",
      "Proposal Agent",
      "Manager Agent"
    ]);
    expect(result.agentDiscussion.find((entry) => entry.agent === "Manager Agent")?.message).toContain("approved");
    expect(result.agentRuns.map((run) => run.agent)).toEqual([
      "Manager Agent",
      "Research Agent",
      "Opportunity Agent",
      "Competitor Agent",
      "Pricing Agent",
      "Proposal Agent",
      "Memory Agent"
    ]);
    expect(result.agentRuns.every((run) => typeof run.latencyMs === "number")).toBe(true);
    expect(result.agentRuns.filter((run) => run.provider === "mock").length).toBeGreaterThanOrEqual(4);
    expect(result.agentRuns.filter((run) => run.outputValidated).length).toBeGreaterThanOrEqual(4);
    const pdf = buildLeadPilotPdf(result, "pending");
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(3);
  });

  it("adds social media URLs as English research context", async () => {
    const qwen = new RecordingQwenProvider();
    const fetcher = new RecordingWebsiteFetcher();
    const result = await runLeadPilotAnalysis({
      url: "https://example.com",
      socialUrls: ["https://www.linkedin.com/company/example", "https://x.com/example"],
      fetcher,
      qwen
    });

    expect(fetcher.urls).toEqual(["https://example.com", "https://www.linkedin.com/company/example", "https://x.com/example"]);
    expect(result.socialUrls).toEqual(["https://www.linkedin.com/company/example", "https://x.com/example"]);
    expect(result.finalReport.markdown).toContain("Additional Research Sources");
    expect(qwen.prompts[0]).toContain("Always write every output field in English");
    expect(qwen.prompts[0]).toContain("Social media context");
    expect(qwen.prompts[0]).toContain("LinkedIn profile says the team sells AI workflow consulting");
    expect(qwen.prompts[1]).toContain("X profile mentions customer support automation");
  });

  it("compares the current score against previous memory for the same company", async () => {
    const memory = new SeededMemoryStore();
    const result = await runLeadPilotAnalysis({
      url: "https://example.com",
      fetcher: new StaticWebsiteFetcher({
        finalUrl: "https://example.com",
        title: "Example CRM Automation",
        text: "Example has manual CRM workflows, reporting gaps, and customer support delays."
      }),
      qwen: new MockQwenProvider(),
      memory
    });

    expect(result.memoryDigest.foundPrevious).toBe(true);
    expect(result.memoryDigest.previousScore).toBe(71);
    expect(result.memoryDigest.currentScore).toBe(result.salesOpportunityScore.score);
    expect(result.memoryDigest.scoreDelta).toBe(result.salesOpportunityScore.score - 71);
    expect(result.memoryDigest.lastAnalyzedAt).toBe("2026-05-01T00:00:00.000Z");
  });
});

class RecordingWebsiteFetcher implements WebsiteFetcher {
  urls: string[] = [];

  async fetch(url: string): Promise<WebsiteSnapshot> {
    this.urls.push(url);
    if (url.includes("linkedin.com")) {
      return snapshot(url, "Example LinkedIn", "LinkedIn profile says the team sells AI workflow consulting.");
    }
    if (url.includes("x.com")) {
      return snapshot(url, "Example X", "X profile mentions customer support automation and fast lead response.");
    }
    return snapshot(url, "Example AI Services", "Example helps B2B teams manage leads manually with spreadsheets.");
  }
}

class RecordingQwenProvider extends MockQwenProvider implements QwenProvider {
  prompts: string[] = [];

  async generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<StructuredGenerationResult<T>> {
    this.prompts.push(request.prompt);
    return super.generateStructured(request);
  }
}

class SeededMemoryStore {
  async save() {
    return;
  }

  async listRecent() {
    return [
      {
        savedAt: "2026-05-01T00:00:00.000Z",
        sourceUrl: "https://example.com",
        finalUrl: "https://example.com",
        companyName: "Example CRM Automation",
        score: 71,
        proposalTitle: "Previous proposal",
        proposalSummary: "Previous summary",
        recommendedAngle: "Previous angle",
        nextSteps: ["Previous step"]
      }
    ];
  }
}

function snapshot(url: string, title: string, text: string): WebsiteSnapshot {
  return {
    sourceUrl: url,
    finalUrl: url,
    title,
    text,
    status: 200,
    fetchedAt: new Date().toISOString()
  };
}
