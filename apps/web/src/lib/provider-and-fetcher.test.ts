import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runLeadPilotAnalysis } from "./analysis-pipeline";
import { ExaCompetitorSearchProvider } from "./competitor-search";
import { JsonlMemoryStore, NoopMemoryStore } from "./memory-store";
import { MockQwenProvider, QwenCloudProvider } from "./qwen-provider";
import { assembleFinalReport } from "./report";
import { assertSafeHttpUrl, isPrivateOrLocalAddress } from "./url-safety";
import { extractReadableWebsiteText, LiveWebsiteFetcher, StaticWebsiteFetcher } from "./website-fetcher";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("website extraction and providers", () => {
  it("extracts readable website text without scripts or navigation noise", () => {
    const extracted = extractReadableWebsiteText(`
      <html>
        <head><title>Acme Growth</title><meta name="description" content="CRM automation for sales teams"></head>
        <body>
          <nav>Pricing Docs Login</nav>
          <h1>Automate your sales follow-up</h1>
          <p>Acme helps agencies respond faster to inbound leads.</p>
          <script>window.secret = true</script>
        </body>
      </html>
    `);

    expect(extracted.title).toBe("Acme Growth");
    expect(extracted.description).toBe("CRM automation for sales teams");
    expect(extracted.text).toContain("Automate your sales follow-up");
    expect(extracted.text).not.toContain("window.secret");
  });

  it("static fetcher returns a deterministic snapshot", async () => {
    const snapshot = await new StaticWebsiteFetcher({
      finalUrl: "https://acme.test",
      title: "Acme",
      text: "Sales automation"
    }).fetch("https://acme.test");

    expect(snapshot.sourceUrl).toBe("https://acme.test");
    expect(snapshot.status).toBe(200);
    expect(snapshot.text).toBe("Sales automation");
  });

  it("qwen providers fall back safely when no key is configured", async () => {
    const fallback = { ok: true };
    const previousKey = process.env.DASHSCOPE_API_KEY;
    const previousForceMock = process.env.LEADPILOT_FORCE_MOCK;
    delete process.env.DASHSCOPE_API_KEY;
    process.env.LEADPILOT_FORCE_MOCK = "true";

    const mockResult = await new MockQwenProvider().generateStructured({ agent: "Test", prompt: "x", fallback });
    expect(mockResult.data).toEqual(fallback);
    expect(mockResult.metadata.provider).toBe("mock");
    expect(mockResult.metadata.usedFallback).toBe(true);

    const qwenResult = await new QwenCloudProvider().generateStructured({ agent: "Test", prompt: "x", fallback });
    expect(qwenResult.data).toEqual(fallback);
    expect(qwenResult.metadata.provider).toBe("mock");
    expect(qwenResult.metadata.usedFallback).toBe(true);

    if (previousKey) {
      process.env.DASHSCOPE_API_KEY = previousKey;
    }
    if (previousForceMock === undefined) {
      delete process.env.LEADPILOT_FORCE_MOCK;
    } else {
      process.env.LEADPILOT_FORCE_MOCK = previousForceMock;
    }
  });

  it("qwen cloud provider parses JSON responses from the compatible endpoint", async () => {
    const previousKey = process.env.DASHSCOPE_API_KEY;
    let requestBody = "";
    process.env.DASHSCOPE_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        requestBody = String(init?.body ?? "");
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "{\"score\":88}" } }]
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      })
    );

    const result = await new QwenCloudProvider().generateStructured({
      agent: "Pricing Agent",
      prompt: "Return JSON",
      fallback: { score: 0 },
      jsonSchema: {
        name: "pricing_score",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: { score: { type: "number" } },
          required: ["score"]
        }
      }
    });

    expect(result.data).toEqual({ score: 88 });
    expect(result.metadata.provider).toBe("qwen-cloud");
    expect(result.metadata.responseFormat).toBe("json_schema");
    expect(result.metadata.model).toBe("qwen-plus");
    expect(requestBody).toContain("Always write in English");
    expect(requestBody).toContain("commercial strategist");

    if (previousKey) {
      process.env.DASHSCOPE_API_KEY = previousKey;
    } else {
      delete process.env.DASHSCOPE_API_KEY;
    }
  });

  it("writes compact memory records without secrets", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "leadpilot-memory-"));
    const memoryPath = path.join(tempDir, "memory.jsonl");
    const result = await runLeadPilotAnalysis({
      url: "https://example.com",
      fetcher: new StaticWebsiteFetcher({
        finalUrl: "https://example.com",
        title: "Example",
        text: "Example has manual CRM workflows, reporting gaps, and customer support delays."
      }),
      qwen: new MockQwenProvider(),
      memory: new JsonlMemoryStore(memoryPath)
    });

    const memory = await readFile(memoryPath, "utf8");
    const recent = await new JsonlMemoryStore(memoryPath).listRecent(3);
    expect(memory).toContain(result.businessSummary.companyName);
    expect(memory).toContain("score");
    expect(memory).not.toContain("DASHSCOPE_API_KEY");
    expect(recent[0].companyName).toBe(result.businessSummary.companyName);
    expect(recent[0].score).toBe(result.salesOpportunityScore.score);
    expect(recent[0].result?.finalReport.markdown).toContain("Business Summary");
    await expect(new JsonlMemoryStore(memoryPath).getById(recent[0].id ?? "")).resolves.toMatchObject({
      companyName: result.businessSummary.companyName
    });

    await new NoopMemoryStore().save(result);
    await expect(new NoopMemoryStore().listRecent(3)).resolves.toEqual([]);
    await rm(tempDir, { recursive: true, force: true });
  });

  it("live fetcher reads mocked public HTML and rejects unreadable content", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response("<html><head><title>Public Co</title></head><body><h1>Sales automation</h1></body></html>", {
            status: 200,
            headers: { "content-type": "text/html" }
          })
        )
        .mockResolvedValueOnce(
          new Response("{}", {
            status: 200,
            headers: { "content-type": "application/json" }
          })
        )
    );

    const fetcher = new LiveWebsiteFetcher({ timeoutMs: 1000 });
    const snapshot = await fetcher.fetch("https://93.184.216.34");
    expect(snapshot.title).toBe("Public Co");
    expect(snapshot.text).toContain("Sales automation");

    await expect(fetcher.fetch("https://93.184.216.34")).rejects.toThrow("readable website content");
  });

  it("uses Exa search when competitor search is configured", async () => {
    const previousExaKey = process.env.EXA_API_KEY;
    process.env.EXA_API_KEY = "test-exa-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              title: "Competitor One",
              url: "https://competitor.example",
              text: "Competitor One sells a similar automation platform."
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const sources = await new ExaCompetitorSearchProvider().search({
      companyName: "Example CRM Automation",
      category: "CRM Automation",
      targetCustomer: "B2B teams",
      valueProposition: "Automates sales workflows.",
      confidence: 0.8
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.exa.ai/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-api-key": "test-exa-key" })
      })
    );
    expect(sources[0]).toMatchObject({ title: "Competitor One", url: "https://competitor.example" });

    if (previousExaKey === undefined) {
      delete process.env.EXA_API_KEY;
    } else {
      process.env.EXA_API_KEY = previousExaKey;
    }
  });

  it("assembles a markdown report and detects private addresses", async () => {
    expect(isPrivateOrLocalAddress("10.0.0.1")).toBe(true);
    await expect(assertSafeHttpUrl("https://127.0.0.1")).resolves.toMatchObject({
      allowed: false,
      reason: "blocked_private_network"
    });

    const report = assembleFinalReport({
      companyName: "Acme",
      businessSummary: {
        companyName: "Acme",
        category: "B2B services",
        targetCustomer: "Growing companies",
        valueProposition: "Acme improves sales workflows.",
        confidence: 0.8
      },
      detectedProblems: [
        {
          title: "Manual process",
          description: "Manual work slows sales.",
          evidence: "Website copy",
          businessImpact: "Lower conversion",
          automationPotential: "CRM automation",
          confidence: 0.8
        }
      ],
      salesOpportunityScore: {
        score: 82,
        reasons: ["Clear workflow pain"],
        risks: ["Needs discovery"],
        recommendedAngle: "Pilot automation",
        confidence: 0.8
      },
      budgetEstimate: {
        currency: "USD",
        min: 5000,
        max: 10000,
        estimatedAnnualRevenueImpact: 30000,
        roiPercent: 300,
        complexity: "medium",
        roiAssumptions: ["Faster follow-up"],
        packageRecommendation: "Automation Pilot",
        assumptions: ["Public website only"],
        confidence: 0.7
      },
      proposalDraft: {
        title: "Proposal",
        executiveSummary: "Build a pilot.",
        recommendedScope: ["CRM automation"],
        emailDraft: "Hi",
        workPlan: ["Discover", "Build", "Measure"],
        timeline: "2-4 weeks",
        investment: "USD 5000-10000",
        nextStep: "Call"
      },
      conflictResolution: {
        researchScore: 70,
        opportunityScore: 95,
        finalScore: 82,
        conflictDetected: true,
        reason: "Manager Agent resolved the score conflict."
      },
      opportunityHeatmap: [
        {
          area: "Lead Capture",
          score: 95,
          rationale: "Forms can be improved."
        }
      ],
      enterpriseMaturityFactor: {
        score: 74,
        level: "scaling",
        summary: "Acme is scaling for an enterprise automation motion.",
        dimensions: [
          {
            name: "Process Clarity",
            score: 76,
            rationale: "Workflow pain is visible."
          }
        ],
        positiveSignals: ["Commercial workflow signals are visible."],
        gaps: ["CRM ownership should be validated."],
        recommendedMotion: "Lead with a paid automation pilot."
      },
      competitorAnalysis: {
        competitors: [
          {
            name: "Regional service providers",
            positioning: "Comparable providers compete on speed and relationships.",
            relevance: "high",
            estimatedThreat: "medium"
          }
        ],
        competitiveAdvantages: ["Custom workflow design"],
        marketGaps: ["No visible lead scoring workflow"],
        positioningSummary: "Acme can differentiate through faster response and clearer reporting."
      },
      industryBenchmarks: {
        industry: "B2B services",
        summary: "Directional benchmark for B2B services.",
        metrics: [
          {
            name: "Lead Response Time",
            industryAverage: "24h target",
            currentEstimate: "48h risk",
            gap: "+100%",
            interpretation: "Response speed should be automated."
          }
        ]
      },
      analysisConfidence: {
        score: 86,
        level: "high",
        reasons: ["1 public source analyzed."],
        evidence: {
          websitePagesAnalyzed: 1,
          contentCharacters: 1200,
          structuredDataFound: false,
          socialProfilesFound: 0,
          qwenValidatedAgents: 5,
          sourceCount: 1
        }
      },
      actionPlan: {
        horizon: "30 days",
        weeks: [
          {
            week: 1,
            title: "Workflow Baseline",
            actions: ["Map current process"],
            successMetric: "Baseline approved."
          }
        ]
      },
      costBreakdown: {
        currency: "USD",
        total: 10000,
        items: [
          {
            item: "CRM Setup",
            cost: 2000,
            rationale: "Pipeline setup."
          }
        ]
      },
      riskMatrix: {
        summary: "Prioritize high-impact low-effort work first.",
        items: [
          {
            initiative: "WhatsApp Automation",
            impact: "high",
            effort: "low",
            rationale: "Fast first pilot."
          }
        ]
      },
      recommendedNextSteps: ["Book discovery"],
      agentDiscussion: [
        {
          agent: "Research Agent",
          message: "Acme improves sales workflows."
        },
        {
          agent: "Manager Agent",
          message: "Proposal approved for outreach."
        }
      ]
    });

    expect(report.markdown).toContain("Business Summary");
    expect(report.markdown).toContain("ROI Projection");
    expect(report.markdown).toContain("Estimated Annual Revenue Impact");
    expect(report.markdown).toContain("Agent Conflict Resolution");
    expect(report.markdown).toContain("Opportunity Heatmap");
    expect(report.markdown).toContain("Enterprise Maturity Factor");
    expect(report.markdown).toContain("Competitor Agent");
    expect(report.markdown).toContain("Industry Benchmarks");
    expect(report.markdown).toContain("Analysis Confidence");
    expect(report.markdown).toContain("Cost Breakdown");
    expect(report.markdown).toContain("Visual Risk Matrix");
    expect(report.markdown).toContain("30-Day Action Plan");
    expect(report.markdown).toContain("Human Approval");
    expect(report.markdown).toContain("Agent Discussion");
    expect(report.markdown).toContain("Recommended Next Steps");
  });
});
