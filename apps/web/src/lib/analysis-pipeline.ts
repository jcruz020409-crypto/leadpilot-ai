import { NoopMemoryStore, type MemoryStore } from "./memory-store";
import { createDefaultCompetitorSearchProvider, type CompetitorSearchProvider } from "./competitor-search";
import { MockQwenProvider, type QwenProvider, type StructuredGenerationMetadata } from "./qwen-provider";
import { assembleFinalReport } from "./report";
import type {
  ActionPlan,
  AgentRun,
  AgentDiscussionEntry,
  AnalysisConfidence,
  BudgetEstimate,
  BusinessSummary,
  CompetitorAnalysis,
  CompetitorSearchSource,
  ConflictResolution,
  CostBreakdown,
  DetectedProblem,
  EnterpriseMaturityFactor,
  IndustryBenchmarks,
  LeadPilotAnalysisResult,
  OpportunityHeatmapItem,
  ProposalDraft,
  RiskMatrix,
  SalesOpportunityScore,
  WebsiteSnapshot
} from "./types";
import { LiveWebsiteFetcher, type WebsiteFetcher } from "./website-fetcher";

export interface RunLeadPilotAnalysisInput {
  url: string;
  socialUrls?: string[];
  fetcher?: WebsiteFetcher;
  qwen?: QwenProvider;
  memory?: MemoryStore;
  competitorSearch?: CompetitorSearchProvider;
  onAgentStatus?: (event: AgentProgressEvent) => void | Promise<void>;
}

export interface AgentProgressEvent {
  agent: string;
  status: "running" | "completed" | "failed";
  summary?: string;
  run?: AgentRun;
}

export async function runLeadPilotAnalysis(input: RunLeadPilotAnalysisInput): Promise<LeadPilotAnalysisResult> {
  const fetcher = input.fetcher ?? new LiveWebsiteFetcher();
  const qwen = input.qwen ?? new MockQwenProvider();
  const memory = input.memory ?? new NoopMemoryStore();
  const competitorSearch = input.competitorSearch ?? createDefaultCompetitorSearchProvider();
  const agentRuns: AgentRun[] = [];
  const socialUrls = normalizeSocialUrls(input.socialUrls);

  const plan = await runAgent(agentRuns, "Manager Agent", input.onAgentStatus, async () => ({
    stages: ["research", "opportunity", "competitor", "pricing", "proposal", "memory"],
    agentSummary: "Created multi-agent analysis plan.",
    outputValidated: true
  }));

  const research = await runAgent(agentRuns, "Research Agent", input.onAgentStatus, async () => {
    const snapshot = await fetcher.fetch(input.url);
    const socialSnapshots = await fetchSocialSnapshots(socialUrls, fetcher);
    const researchContext = buildResearchContext(snapshot, socialSnapshots);
    const summary = await buildBusinessSummary(snapshot, researchContext, qwen);
    return {
      snapshot,
      socialSnapshots,
      researchContext,
      businessSummary: summary.data,
      providerMetadata: summary.metadata,
      outputValidated: true,
      agentSummary: `Summarized ${summary.data.companyName} from ${snapshot.finalUrl} and ${socialSnapshots.length} social source(s).`
    };
  });

  const detectedProblems = await runAgent(agentRuns, "Opportunity Agent", input.onAgentStatus, async () => {
    const problems = await buildDetectedProblems(research.researchContext, research.businessSummary, qwen);
    return {
      problems: problems.data,
      providerMetadata: problems.metadata,
      outputValidated: true,
      agentSummary: `Detected ${problems.data.length} sales problems.`
    };
  });

  const competitor = await runAgent(agentRuns, "Competitor Agent", input.onAgentStatus, async () => {
    const searchSources = await competitorSearch.search(research.businessSummary);
    const analysis = await buildCompetitorAnalysis(research.researchContext, research.businessSummary, detectedProblems.problems, qwen, searchSources);
    return {
      competitorAnalysis: {
        ...analysis.data,
        searchProvider: searchSources.length ? ("exa" as const) : ("none" as const),
        searchSources
      },
      providerMetadata: analysis.metadata,
      outputValidated: true,
      agentSummary: `Mapped ${analysis.data.competitors.length} competitor(s), ${analysis.data.competitiveAdvantages.length} advantage(s), and ${analysis.data.marketGaps.length} market gap(s) from ${searchSources.length} search source(s).`
    };
  });

  const pricing = await runAgent(agentRuns, "Pricing Agent", input.onAgentStatus, async () => {
    const score = await buildSalesOpportunityScore(research.businessSummary, detectedProblems.problems, qwen);
    const budget = await buildBudgetEstimate(score.data, detectedProblems.problems, qwen);
    return {
      score: score.data,
      budget: budget.data,
      providerMetadata: combineProviderMetadata([score.metadata, budget.metadata]),
      outputValidated: true,
      agentSummary: `Calculated ${score.data.score}/100 opportunity score.`
    };
  });

  const proposal = await runAgent(agentRuns, "Proposal Agent", input.onAgentStatus, async () => {
    const draft = await buildProposalDraft(research.businessSummary, detectedProblems.problems, pricing.budget, qwen);
    const nextSteps = [
      "Validate the detected problems with a 20-minute discovery call.",
      "Confirm access to current sales, CRM, and reporting workflow details.",
      "Prioritize one automation pilot that can show measurable ROI in 30 days."
    ];
    return {
      draft: draft.data,
      nextSteps,
      providerMetadata: draft.metadata,
      outputValidated: true,
      agentSummary: "Generated proposal, email, work plan, and next steps."
    };
  });

  const conflictResolution = buildConflictResolution(research.businessSummary, detectedProblems.problems, pricing.score);
  const opportunityHeatmap = buildOpportunityHeatmap(detectedProblems.problems, research.researchContext.combinedText);
  const enterpriseMaturityFactor = buildEnterpriseMaturityFactor(
    research.businessSummary,
    detectedProblems.problems,
    pricing.score,
    pricing.budget,
    opportunityHeatmap,
    research.researchContext.combinedText
  );
  const industryBenchmarks = buildIndustryBenchmarks(research.businessSummary, detectedProblems.problems, pricing.score, research.researchContext.combinedText);
  const costBreakdown = buildCostBreakdown(pricing.budget, opportunityHeatmap);
  const actionPlan = buildActionPlan(opportunityHeatmap, detectedProblems.problems, proposal.draft);
  const riskMatrix = buildRiskMatrix(opportunityHeatmap, costBreakdown);
  const analysisConfidence = buildAnalysisConfidence(research.researchContext, socialUrls, agentRuns);
  const agentDiscussion = buildAgentDiscussion(
    research.businessSummary,
    detectedProblems.problems,
    competitor.competitorAnalysis,
    pricing.score,
    pricing.budget,
    proposal.draft,
    conflictResolution
  );

  const finalReport = assembleFinalReport({
    companyName: research.businessSummary.companyName,
    businessSummary: research.businessSummary,
    detectedProblems: detectedProblems.problems,
    salesOpportunityScore: pricing.score,
    budgetEstimate: pricing.budget,
    proposalDraft: proposal.draft,
    recommendedNextSteps: proposal.nextSteps,
    agentDiscussion,
    conflictResolution,
    opportunityHeatmap,
    enterpriseMaturityFactor,
    competitorAnalysis: competitor.competitorAnalysis,
    industryBenchmarks,
    analysisConfidence,
    actionPlan,
    costBreakdown,
    riskMatrix,
    socialUrls
  });

  const result: LeadPilotAnalysisResult = {
    sourceUrl: input.url,
    finalUrl: research.snapshot.finalUrl,
    socialUrls,
    businessSummary: research.businessSummary,
    detectedProblems: detectedProblems.problems,
    salesOpportunityScore: pricing.score,
    budgetEstimate: pricing.budget,
    proposalDraft: proposal.draft,
    recommendedNextSteps: proposal.nextSteps,
    agentDiscussion,
    conflictResolution,
    opportunityHeatmap,
    enterpriseMaturityFactor,
    competitorAnalysis: competitor.competitorAnalysis,
    industryBenchmarks,
    analysisConfidence,
    actionPlan,
    costBreakdown,
    riskMatrix,
    finalReport,
    memoryDigest: {
      saved: false,
      summary: "Memory has not been written yet.",
      recentCount: 0,
      recentRecords: [],
      foundPrevious: false,
      currentScore: pricing.score.score
    },
    agentRuns
  };

  await runAgent(agentRuns, "Memory Agent", input.onAgentStatus, async () => {
    const previousRecords = await memory.listRecent(10);
    const previous = findPreviousAnalysis(previousRecords, result);
    await memory.save(result);
    const recent = await memory.listRecent(5);
    const visibleRecords = recent.length
      ? recent
      : [
          {
            savedAt: new Date().toISOString(),
            sourceUrl: result.sourceUrl,
            finalUrl: result.finalUrl,
            companyName: result.businessSummary.companyName,
            score: result.salesOpportunityScore.score,
            proposalTitle: result.proposalDraft.title,
            proposalSummary: result.proposalDraft.executiveSummary,
            recommendedAngle: result.salesOpportunityScore.recommendedAngle,
            nextSteps: result.recommendedNextSteps
          }
        ];
    result.memoryDigest = {
      saved: true,
      summary: `Saved ${result.businessSummary.companyName}. ${visibleRecords.length} recent analyzed companies available.`,
      recentCount: visibleRecords.length,
      recentRecords: visibleRecords.map((record) => ({
        companyName: record.companyName,
        score: record.score,
        sourceUrl: record.sourceUrl,
        savedAt: record.savedAt,
        proposalTitle: record.proposalTitle,
        proposalSummary: record.proposalSummary
      })),
      foundPrevious: Boolean(previous),
      lastAnalyzedAt: previous?.savedAt,
      previousScore: previous?.score,
      currentScore: result.salesOpportunityScore.score,
      scoreDelta: previous ? result.salesOpportunityScore.score - previous.score : undefined
    };
    return {
      providerMetadata: {
        provider: "memory-store" as const,
        model: "jsonl-memory",
        responseFormat: "none" as const,
        usedFallback: false,
        latencyMs: 0
      },
      outputValidated: true,
      agentSummary: "Saved analyzed company, score, and preferred next steps."
    };
  });

  plan.stages.length;
  return result;
}

async function runAgent<T extends { agentSummary?: string; providerMetadata?: StructuredGenerationMetadata; outputValidated?: boolean }>(
  agentRuns: AgentRun[],
  agent: string,
  onAgentStatus: RunLeadPilotAnalysisInput["onAgentStatus"] | undefined,
  action: () => Promise<T>
): Promise<T> {
  const startedAt = new Date().toISOString();
  await onAgentStatus?.({ agent, status: "running", summary: `${agent} is running.` });
  try {
    const result = await action();
    const run: AgentRun = {
      agent,
      status: "completed",
      startedAt,
      completedAt: new Date().toISOString(),
      summary: result.agentSummary ?? `${agent} completed.`,
      ...agentRunMetadata(result.providerMetadata, result.outputValidated ?? false)
    };
    agentRuns.push(run);
    await onAgentStatus?.({ agent, status: "completed", summary: run.summary, run });
    return result;
  } catch (error) {
    const run: AgentRun = {
      agent,
      status: "failed",
      startedAt,
      completedAt: new Date().toISOString(),
      summary: error instanceof Error ? error.message : `${agent} failed.`,
      provider: "local",
      model: "none",
      responseFormat: "none",
      latencyMs: Date.now() - Date.parse(startedAt),
      usedFallback: false,
      outputValidated: false,
      error: error instanceof Error ? error.message : "Unknown agent error"
    };
    agentRuns.push(run);
    await onAgentStatus?.({ agent, status: "failed", summary: run.summary, run });
    throw error;
  }
}

function agentRunMetadata(metadata: StructuredGenerationMetadata | undefined, outputValidated: boolean) {
  if (!metadata) {
    return {
      provider: "local" as const,
      model: "none",
      responseFormat: "none" as const,
      latencyMs: 0,
      usedFallback: false,
      outputValidated
    };
  }

  return {
    provider: metadata.provider,
    model: metadata.model,
    responseFormat: metadata.responseFormat,
    latencyMs: metadata.latencyMs,
    usedFallback: metadata.usedFallback,
    outputValidated,
    tokenUsage: metadata.tokenUsage,
    error: metadata.error
  };
}

function combineProviderMetadata(items: StructuredGenerationMetadata[]): StructuredGenerationMetadata {
  const first = items[0];
  return {
    provider: items.some((item) => item.provider === "qwen-cloud") ? "qwen-cloud" : first.provider,
    model: [...new Set(items.map((item) => item.model))].join(", "),
    responseFormat: items.some((item) => item.responseFormat === "json_schema") ? "json_schema" : first.responseFormat,
    usedFallback: items.some((item) => item.usedFallback),
    latencyMs: items.reduce((total, item) => total + item.latencyMs, 0),
    status: items.find((item) => item.status)?.status,
    baseUrl: first.baseUrl,
    error: items.map((item) => item.error).filter(Boolean).join("; ") || undefined,
    tokenUsage: {
      promptTokens: sumTokens(items, "promptTokens"),
      completionTokens: sumTokens(items, "completionTokens"),
      totalTokens: sumTokens(items, "totalTokens")
    }
  };
}

function sumTokens(items: StructuredGenerationMetadata[], key: "promptTokens" | "completionTokens" | "totalTokens") {
  const values = items.map((item) => item.tokenUsage?.[key]).filter((value): value is number => typeof value === "number");
  return values.length ? values.reduce((total, value) => total + value, 0) : undefined;
}

interface ResearchContext {
  primarySnapshot: WebsiteSnapshot;
  socialSnapshots: WebsiteSnapshot[];
  combinedText: string;
  promptBlock: string;
}

async function buildBusinessSummary(snapshot: WebsiteSnapshot, researchContext: ResearchContext, qwen: QwenProvider) {
  const fallback: BusinessSummary = {
    companyName: snapshot.title || hostName(snapshot.finalUrl),
    category: inferCategory(researchContext.combinedText),
    targetCustomer: inferTargetCustomer(researchContext.combinedText),
    valueProposition: inferValueProposition(researchContext.combinedText),
    confidence: researchContext.combinedText.length > 400 ? 0.78 : 0.58
  };

  return qwen.generateStructured({
    agent: "Research Agent",
    prompt: `Always write every output field in English, even if the website or social profiles are in another language.\nAnalyze this company website and social media context. Return a JSON business summary.\n${researchContext.promptBlock}`,
    fallback,
    jsonSchema: {
      name: "business_summary",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          companyName: { type: "string" },
          category: { type: "string" },
          targetCustomer: { type: "string" },
          valueProposition: { type: "string" },
          confidence: { type: "number" }
        },
        required: ["companyName", "category", "targetCustomer", "valueProposition", "confidence"]
      }
    }
  });
}

async function buildDetectedProblems(
  researchContext: ResearchContext,
  summary: BusinessSummary,
  qwen: QwenProvider
) {
  const text = researchContext.combinedText.toLowerCase();
  const problems: DetectedProblem[] = [];

  if (text.includes("spreadsheet") || text.includes("manual") || text.includes("crm")) {
    problems.push({
      title: "Manual lead and CRM workflow",
      description: "The business signals manual lead handling or CRM gaps that can slow sales follow-up.",
      evidence: "Website content references manual work, spreadsheets, CRM, leads, or reporting.",
      businessImpact: "Lost response speed, inconsistent follow-up, and weak pipeline visibility.",
      automationPotential: "CRM automation, lead routing, and AI-assisted follow-up workflows.",
      confidence: 0.82
    });
  }

  if (text.includes("delay") || text.includes("support") || text.includes("customer")) {
    problems.push({
      title: "Slow customer response loop",
      description: "Customer-facing processes may benefit from automated intake, triage, and response support.",
      evidence: "Website content references customers, support, response delays, or service operations.",
      businessImpact: "Longer response times can reduce conversion and retention.",
      automationPotential: "AI support assistant, routing rules, and customer request dashboards.",
      confidence: 0.74
    });
  }

  if (text.includes("report") || text.includes("analytics") || text.includes("growth")) {
    problems.push({
      title: "Limited reporting and growth visibility",
      description: "The business may need a clearer view of acquisition, conversion, and operations metrics.",
      evidence: "Website content references reporting, analytics, growth, or performance.",
      businessImpact: "Teams make slower decisions when sales and operations data is fragmented.",
      automationPotential: "Automated reporting, dashboards, and AI-generated business insights.",
      confidence: 0.76
    });
  }

  if (problems.length === 0) {
    problems.push({
      title: "Website conversion opportunity",
      description: `${summary.companyName} can likely improve how visitors move from interest to qualified conversation.`,
      evidence: "The submitted site provides enough business context but limited explicit conversion workflow detail.",
      businessImpact: "Better lead capture and qualification can increase sales opportunities.",
      automationPotential: "AI lead qualifier, contact workflow automation, and proposal generation.",
      confidence: 0.62
    });
  }

  return qwen.generateStructured({
    agent: "Opportunity Agent",
    prompt: `Always write every output field in English, even if the source material is in another language.\nFind sales problems and automation opportunities for ${summary.companyName}. Return JSON array only.\n${researchContext.promptBlock}`,
    fallback: problems.slice(0, 4),
    jsonSchema: {
      name: "detected_problems",
      schema: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            evidence: { type: "string" },
            businessImpact: { type: "string" },
            automationPotential: { type: "string" },
            confidence: { type: "number" }
          },
          required: ["title", "description", "evidence", "businessImpact", "automationPotential", "confidence"]
        }
      }
    }
  });
}

async function buildCompetitorAnalysis(
  researchContext: ResearchContext,
  summary: BusinessSummary,
  problems: DetectedProblem[],
  qwen: QwenProvider,
  searchSources: CompetitorSearchSource[] = []
) {
  const fallback = inferCompetitorAnalysis(researchContext.combinedText, summary, problems);

  return qwen.generateStructured({
    agent: "Competitor Agent",
    prompt: [
      "Always write every output field in English.",
      "Create a directional competitor analysis for a software-agency sales proposal.",
      "If a competitor is inferred from category rather than explicitly found in the source material, say that the set is directional.",
      searchSources.length ? `Real competitor search sources: ${JSON.stringify(searchSources)}` : "No external competitor search sources were available.",
      `Business: ${JSON.stringify(summary)}`,
      `Detected problems: ${JSON.stringify(problems)}`,
      researchContext.promptBlock
    ].join("\n"),
    fallback,
    jsonSchema: {
      name: "competitor_analysis",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          competitors: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                positioning: { type: "string" },
                relevance: { type: "string", enum: ["low", "medium", "high"] },
                estimatedThreat: { type: "string", enum: ["low", "medium", "high"] }
              },
              required: ["name", "positioning", "relevance", "estimatedThreat"]
            }
          },
          competitiveAdvantages: { type: "array", items: { type: "string" } },
          marketGaps: { type: "array", items: { type: "string" } },
          positioningSummary: { type: "string" }
        },
        required: ["competitors", "competitiveAdvantages", "marketGaps", "positioningSummary"]
      }
    }
  });
}

async function buildSalesOpportunityScore(
  summary: BusinessSummary,
  problems: DetectedProblem[],
  qwen: QwenProvider
) {
  const baseScore = Math.min(92, 52 + problems.length * 12 + Math.round(summary.confidence * 12));
  const fallback: SalesOpportunityScore = {
    score: baseScore,
    reasons: [
      "The company has visible business context that can support a targeted proposal.",
      "Detected problems map to practical automation and software-service offers.",
      "A focused pilot can be scoped without requiring a large transformation project."
    ],
    risks: [
      "Budget and internal tooling are inferred from public content, not confirmed.",
      "Public website content may omit operational constraints."
    ],
    recommendedAngle: "Pitch a focused AI automation pilot that improves lead handling, reporting, or customer response.",
    confidence: Math.min(0.88, summary.confidence + 0.08)
  };

  return qwen.generateStructured({
    agent: "Pricing Agent",
    prompt: `Always write every output field in English.\nScore this sales opportunity from 0 to 100 for a software agency.\nBusiness: ${JSON.stringify(summary)}\nProblems: ${JSON.stringify(problems)}`,
    fallback,
    jsonSchema: {
      name: "sales_opportunity_score",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          score: { type: "number" },
          reasons: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
          recommendedAngle: { type: "string" },
          confidence: { type: "number" }
        },
        required: ["score", "reasons", "risks", "recommendedAngle", "confidence"]
      }
    }
  });
}

async function buildBudgetEstimate(
  score: SalesOpportunityScore,
  problems: DetectedProblem[],
  qwen: QwenProvider
) {
  const complexity: BudgetEstimate["complexity"] = problems.length >= 3 ? "high" : problems.length === 2 ? "medium" : "low";
  const min = complexity === "high" ? 9000 : complexity === "medium" ? 5500 : 3000;
  const max = complexity === "high" ? 18000 : complexity === "medium" ? 12000 : 7500;
  const estimatedAnnualRevenueImpact = Math.round(max * (score.score >= 80 ? 3.4 : score.score >= 70 ? 2.7 : 2.1));
  const roiPercent = Math.round(((estimatedAnnualRevenueImpact - max) / max) * 100);
  const fallback: BudgetEstimate = {
    currency: "USD",
    min,
    max,
    estimatedAnnualRevenueImpact,
    roiPercent,
    complexity,
    roiAssumptions: [
      "Automation reduces manual sales or support work.",
      "Improved response speed increases qualified conversations.",
      "Reporting clarity improves campaign and pipeline decisions."
    ],
    packageRecommendation: score.score >= 80 ? "Growth Automation Sprint" : "Discovery + Automation Pilot",
    assumptions: [
      "Estimate is based only on public website content.",
      "Final pricing requires discovery and access to current workflow details.",
      "Scope assumes one initial implementation track."
    ],
    confidence: 0.72
  };

  const generated = await qwen.generateStructured({
    agent: "Pricing Agent",
    prompt: `Always write every output field in English.\nEstimate budget for this agency opportunity.\nScore: ${JSON.stringify(score)}\nProblems: ${JSON.stringify(problems)}`,
    fallback,
    jsonSchema: {
      name: "budget_estimate",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          currency: { type: "string" },
          min: { type: "number" },
          max: { type: "number" },
          estimatedAnnualRevenueImpact: { type: "number" },
          roiPercent: { type: "number" },
          complexity: { type: "string", enum: ["low", "medium", "high"] },
          roiAssumptions: { type: "array", items: { type: "string" } },
          packageRecommendation: { type: "string" },
          assumptions: { type: "array", items: { type: "string" } },
          confidence: { type: "number" }
        },
        required: [
          "currency",
          "min",
          "max",
          "estimatedAnnualRevenueImpact",
          "roiPercent",
          "complexity",
          "roiAssumptions",
          "packageRecommendation",
          "assumptions",
          "confidence"
        ]
      }
    }
  });

  return {
    data: normalizeBudgetEstimate(generated.data, fallback),
    metadata: generated.metadata
  };
}

function normalizeBudgetEstimate(value: BudgetEstimate, fallback: BudgetEstimate): BudgetEstimate {
  const validComplexities: BudgetEstimate["complexity"][] = ["low", "medium", "high"];
  const complexity = validComplexities.includes(value.complexity) ? value.complexity : fallback.complexity;
  const min = Number.isFinite(value.min) && value.min > 0 ? Math.round(value.min) : fallback.min;
  const max = Number.isFinite(value.max) && value.max >= min ? Math.round(value.max) : Math.max(fallback.max, min);
  const estimatedAnnualRevenueImpact =
    Number.isFinite(value.estimatedAnnualRevenueImpact) && value.estimatedAnnualRevenueImpact > max
      ? Math.round(value.estimatedAnnualRevenueImpact)
      : Math.max(fallback.estimatedAnnualRevenueImpact, Math.round(max * 2.2));
  const roiPercent =
    Number.isFinite(value.roiPercent) && value.roiPercent > 0
      ? Math.round(value.roiPercent)
      : Math.round(((estimatedAnnualRevenueImpact - max) / max) * 100);

  return {
    currency: value.currency?.trim() || fallback.currency,
    min,
    max,
    estimatedAnnualRevenueImpact,
    roiPercent,
    complexity,
    roiAssumptions: value.roiAssumptions?.length ? value.roiAssumptions : fallback.roiAssumptions,
    packageRecommendation: value.packageRecommendation?.trim() || fallback.packageRecommendation,
    assumptions: value.assumptions?.length ? value.assumptions : fallback.assumptions,
    confidence: typeof value.confidence === "number" ? Math.max(0, Math.min(1, value.confidence)) : fallback.confidence
  };
}

async function buildProposalDraft(
  summary: BusinessSummary,
  problems: DetectedProblem[],
  budget: BudgetEstimate,
  qwen: QwenProvider
) {
  const topProblems = problems.slice(0, 3);
  const fallback: ProposalDraft = {
    title: `AI Automation Proposal for ${summary.companyName}`,
    executiveSummary: `${summary.companyName} appears to have a strong opportunity to improve sales and operations workflows with a focused AI automation pilot. The recommended engagement targets the most visible bottlenecks first, then turns those improvements into a repeatable operating system.`,
    recommendedScope: topProblems.map((problem) => problem.automationPotential),
    emailDraft: `Subject: Quick automation opportunity for ${summary.companyName}\n\nHi team,\n\nI reviewed ${summary.companyName} and noticed a few areas where AI automation could improve sales response speed, workflow visibility, and operational consistency. I put together a short proposal with a practical pilot scope and estimated budget.\n\nWould you be open to a 20-minute call this week to validate the assumptions?`,
    workPlan: [
      "Discovery: confirm current tools, manual steps, and success metrics.",
      "Workflow design: map the highest-ROI automation path and approval points.",
      "Build pilot: implement the first automation, dashboard, or assistant workflow.",
      "Measure and handoff: review outcomes, document usage, and plan the next sprint."
    ],
    timeline: budget.complexity === "high" ? "4-6 weeks" : "2-4 weeks",
    investment: `${budget.currency} ${formatNumber(budget.min)}-${formatNumber(budget.max)}`,
    nextStep: "Schedule a short discovery call and confirm the highest-priority workflow."
  };

  return qwen.generateStructured({
    agent: "Proposal Agent",
    prompt: `Always write every output field in English.\nGenerate a proposal, outreach email, and plan of work.\nBusiness: ${JSON.stringify(summary)}\nProblems: ${JSON.stringify(problems)}\nBudget: ${JSON.stringify(budget)}`,
    fallback,
    jsonSchema: {
      name: "proposal_draft",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          executiveSummary: { type: "string" },
          recommendedScope: { type: "array", items: { type: "string" } },
          emailDraft: { type: "string" },
          workPlan: { type: "array", items: { type: "string" } },
          timeline: { type: "string" },
          investment: { type: "string" },
          nextStep: { type: "string" }
        },
        required: ["title", "executiveSummary", "recommendedScope", "emailDraft", "workPlan", "timeline", "investment", "nextStep"]
      }
    }
  });
}

async function fetchSocialSnapshots(socialUrls: string[], fetcher: WebsiteFetcher): Promise<WebsiteSnapshot[]> {
  return Promise.all(
    socialUrls.map(async (url) => {
      try {
        return await fetcher.fetch(url);
      } catch (error) {
        return {
          sourceUrl: url,
          finalUrl: url,
          title: `Social source: ${hostName(url)}`,
          text: `The social profile ${url} could not be fetched automatically. Error: ${error instanceof Error ? error.message : "Unknown fetch error"}. Use the public profile URL as a directional research signal only.`,
          status: 0,
          fetchedAt: new Date().toISOString()
        };
      }
    })
  );
}

function buildResearchContext(primarySnapshot: WebsiteSnapshot, socialSnapshots: WebsiteSnapshot[]): ResearchContext {
  const websiteBlock = [
    "Primary website context:",
    `URL: ${primarySnapshot.finalUrl}`,
    `Title: ${primarySnapshot.title}`,
    `Content: ${primarySnapshot.text.slice(0, 8000)}`
  ].join("\n");
  const socialBlock = socialSnapshots.length
    ? [
        "Social media context:",
        ...socialSnapshots.map((snapshot, index) =>
          [
            `Source ${index + 1}: ${snapshot.finalUrl}`,
            `Title: ${snapshot.title}`,
            `Content: ${snapshot.text.slice(0, 3000)}`
          ].join("\n")
        )
      ].join("\n")
    : "Social media context: No optional social profiles were submitted.";

  return {
    primarySnapshot,
    socialSnapshots,
    combinedText: [primarySnapshot.text, ...socialSnapshots.map((snapshot) => snapshot.text)].join("\n"),
    promptBlock: `${websiteBlock}\n\n${socialBlock}`
  };
}

function normalizeSocialUrls(urls: string[] | undefined): string[] {
  return [...new Set((urls ?? []).map((url) => url.trim()).filter(Boolean))].slice(0, 5);
}

function buildAgentDiscussion(
  summary: BusinessSummary,
  problems: DetectedProblem[],
  competitorAnalysis: CompetitorAnalysis,
  score: SalesOpportunityScore,
  budget: BudgetEstimate,
  proposal: ProposalDraft,
  conflictResolution: ConflictResolution
): AgentDiscussionEntry[] {
  const topProblem = problems[0];
  const topCompetitor = competitorAnalysis.competitors[0];
  return [
    {
      agent: "Research Agent",
      message: `${summary.companyName} operates in ${summary.category} for ${summary.targetCustomer}.`
    },
    {
      agent: "Opportunity Agent",
      message: topProblem
        ? `${topProblem.title}: ${topProblem.businessImpact}`
        : "The public footprint suggests a website conversion opportunity."
    },
    {
      agent: "Competitor Agent",
      message: topCompetitor
        ? `${topCompetitor.name} is a ${topCompetitor.estimatedThreat}-threat reference competitor. Market gap: ${competitorAnalysis.marketGaps[0] ?? "No export-focused digital strategy was visible from public signals."}`
        : "No direct competitor set was explicit, so the analysis uses directional category benchmarks."
    },
    {
      agent: "Pricing Agent",
      message: `Estimated project value is ${budget.currency} ${formatNumber(budget.min)}-${formatNumber(budget.max)}, with ${budget.roiPercent}% projected ROI.`
    },
    {
      agent: "Proposal Agent",
      message: `${proposal.title}. Next step: ${proposal.nextStep}`
    },
    {
      agent: "Manager Agent",
      message: conflictResolution.conflictDetected
        ? `Conflict detected between Research (${conflictResolution.researchScore}) and Opportunity (${conflictResolution.opportunityScore}). ${conflictResolution.reason} Proposal approved for human review.`
        : `Proposal approved for outreach with a ${score.score}/100 opportunity score.`
    }
  ];
}

function inferCompetitorAnalysis(sourceText: string, summary: BusinessSummary, problems: DetectedProblem[]): CompetitorAnalysis {
  const text = `${sourceText} ${summary.category} ${summary.valueProposition}`.toLowerCase();
  const hasFoodSignals = ["salt", "sal ", "salina", "food", "beverage", "gourmet", "sodium", "mineral"].some((keyword) => text.includes(keyword));
  const hasRealEstateSignals = ["real estate", "inmobiliaria", "property", "broker"].some((keyword) => text.includes(keyword));
  const hasAgencySignals = ["agency", "marketing", "campaign", "creative"].some((keyword) => text.includes(keyword));
  const hasSoftwareSignals = ["software", "saas", "platform", "crm", "automation"].some((keyword) => text.includes(keyword));

  if (hasFoodSignals) {
    return {
      competitors: [
        {
          name: "Maldon Salt",
          positioning: "Global premium sea-salt brand used as a directional reference for gourmet positioning.",
          relevance: "high",
          estimatedThreat: "medium"
        },
        {
          name: "Celtic Sea Salt",
          positioning: "Well-known mineral sea-salt brand with wellness and natural-product appeal.",
          relevance: "medium",
          estimatedThreat: "medium"
        },
        {
          name: "Baja Gold Salt",
          positioning: "Regional mineral-salt reference with a Mexico-adjacent origin story and ecommerce posture.",
          relevance: "medium",
          estimatedThreat: "medium"
        }
      ],
      competitiveAdvantages: [
        "Mexican origin story can create a stronger terroir narrative than generic commodity salt.",
        "Specialty food positioning gives the sales team a premium differentiation angle.",
        text.includes("30") || text.includes("sodium") ? "Lower-sodium or mineral-content claims can become a strong buyer hook if validated." : "Product education content can turn taste, origin, and process into conversion assets."
      ],
      marketGaps: [
        "No export-focused digital strategy was strongly visible from public signals.",
        "Lead capture, wholesale inquiry routing, and distributor follow-up can be more systematic.",
        "Competitive storytelling can be translated into ecommerce, retail, and B2B sales enablement."
      ],
      positioningSummary: `${summary.companyName} should be positioned as a differentiated specialty food brand, while the automation proposal should focus on export sales, wholesale lead capture, and distributor follow-up.`
    };
  }

  if (hasRealEstateSignals) {
    return {
      competitors: [
        {
          name: "Regional brokerages",
          positioning: "Local real-estate firms compete on inventory access, speed, and trust.",
          relevance: "high",
          estimatedThreat: "high"
        },
        {
          name: "Property marketplaces",
          positioning: "Portals aggregate listings and reduce the perceived need for direct agency contact.",
          relevance: "medium",
          estimatedThreat: "medium"
        },
        {
          name: "Independent agents",
          positioning: "Small teams compete through personal relationships and fast messaging.",
          relevance: "medium",
          estimatedThreat: "medium"
        }
      ],
      competitiveAdvantages: [
        "Local market knowledge can be converted into buyer guides and lead magnets.",
        "Fast WhatsApp response can differentiate against slower broker workflows.",
        "CRM-backed follow-up can reduce abandoned buyer and seller conversations."
      ],
      marketGaps: [
        "Public signals do not show a strong lead scoring or buyer qualification workflow.",
        "Listings can be connected to automated nurture journeys.",
        "Response-speed proof is rarely visible, which creates a measurable automation angle."
      ],
      positioningSummary: `${summary.companyName} can stand out by turning local expertise into automated qualification, faster response, and sharper buyer follow-up.`
    };
  }

  if (hasAgencySignals || hasSoftwareSignals) {
    return {
      competitors: [
        {
          name: "Vertical SaaS platforms",
          positioning: "Productized tools compete by promising lower setup cost and faster self-serve adoption.",
          relevance: "high",
          estimatedThreat: "medium"
        },
        {
          name: "Regional software agencies",
          positioning: "Service firms compete on custom delivery and founder relationships.",
          relevance: "high",
          estimatedThreat: "high"
        },
        {
          name: "In-house spreadsheet workflows",
          positioning: "Internal manual systems compete by being familiar, cheap, and already adopted.",
          relevance: "medium",
          estimatedThreat: "medium"
        }
      ],
      competitiveAdvantages: [
        "A focused AI pilot can beat broad transformation pitches on speed and clarity.",
        "Custom workflow design can connect tools that generic SaaS does not cover.",
        "Revenue impact can be measured through response speed, conversion, and pipeline visibility."
      ],
      marketGaps: [
        "Competitors often sell either tools or consulting, not an end-to-end agent workflow.",
        "Human approval checkpoints can reduce buyer fear around autonomous outreach.",
        "Memory-based follow-up history is an underused differentiator for agencies."
      ],
      positioningSummary: `${summary.companyName} should be approached with a practical automation pilot that frames AI as a measurable operating layer, not a generic chatbot.`
    };
  }

  return {
    competitors: [
      {
        name: "Regional service providers",
        positioning: "Comparable local providers likely compete on relationship quality, responsiveness, and price.",
        relevance: "high",
        estimatedThreat: "medium"
      },
      {
        name: "Self-serve software tools",
        positioning: "Generic tools can compete when buyers prefer low-cost setup over custom workflows.",
        relevance: "medium",
        estimatedThreat: "medium"
      },
      {
        name: "Manual internal process",
        positioning: "The status quo competes by requiring no vendor approval or implementation budget.",
        relevance: "high",
        estimatedThreat: "high"
      }
    ],
    competitiveAdvantages: [
      "Public business context is strong enough to frame a tailored sales automation pilot.",
      "The proposal can focus on business outcomes instead of generic AI features.",
      problems[0]?.automationPotential ?? "Workflow automation can turn public sales friction into measurable next steps."
    ],
    marketGaps: [
      "No clear public evidence of systematic lead qualification was found.",
      "Reporting and response-speed proof can become stronger buyer signals.",
      "Automation should be positioned as a low-risk pilot before broader transformation."
    ],
    positioningSummary: `${summary.companyName} has a directional opportunity to differentiate through faster sales response, clearer reporting, and more systematic customer follow-up.`
  };
}

function buildConflictResolution(
  summary: BusinessSummary,
  problems: DetectedProblem[],
  finalScore: SalesOpportunityScore
): ConflictResolution {
  const researchScore = clampScore(Math.round(summary.confidence * 100));
  const opportunityScore = clampScore(55 + problems.length * 13 + Math.round(Math.max(...problems.map((problem) => problem.confidence), 0.6) * 10));
  const conflictDetected = Math.abs(opportunityScore - researchScore) >= 12;

  return {
    researchScore,
    opportunityScore,
    finalScore: finalScore.score,
    conflictDetected,
    reason: conflictDetected
      ? `Manager Agent resolved the conflict at ${finalScore.score}/100 because strong product differentiation and visible workflow pain offset current digital limitations.`
      : `Manager Agent accepted the aligned agent scores and approved ${finalScore.score}/100 as the final score.`
  };
}

function buildOpportunityHeatmap(problems: DetectedProblem[], sourceText: string): OpportunityHeatmapItem[] {
  const text = `${sourceText}\n${problems.map((problem) => `${problem.title} ${problem.description} ${problem.automationPotential}`).join("\n")}`.toLowerCase();
  return [
    heatmapItem("Lead Capture", text, ["lead", "capture", "conversion", "form"], 84),
    heatmapItem("WhatsApp", text, ["whatsapp", "message", "response", "customer"], 78),
    heatmapItem("CRM", text, ["crm", "pipeline", "spreadsheet", "follow-up"], 82),
    heatmapItem("Export Sales", text, ["export", "sales", "growth", "market"], 72),
    heatmapItem("SEO", text, ["seo", "search", "website", "traffic"], 60)
  ];
}

function heatmapItem(area: string, text: string, keywords: string[], baseScore: number): OpportunityHeatmapItem {
  const hits = keywords.filter((keyword) => text.includes(keyword)).length;
  const score = clampScore(baseScore + hits * 5);
  return {
    area,
    score,
    rationale: hits ? `${hits} signal(s) found for ${area.toLowerCase()} automation.` : `No strong public signal found yet; discovery should validate ${area.toLowerCase()}.`
  };
}

function buildEnterpriseMaturityFactor(
  summary: BusinessSummary,
  problems: DetectedProblem[],
  score: SalesOpportunityScore,
  budget: BudgetEstimate,
  heatmap: OpportunityHeatmapItem[],
  sourceText: string
): EnterpriseMaturityFactor {
  const text = sourceText.toLowerCase();
  const signalHits = (keywords: string[]) => keywords.filter((keyword) => text.includes(keyword)).length;
  const highestHeatmap = Math.max(...heatmap.map((item) => item.score), 0);
  const avgProblemConfidence = problems.length
    ? problems.reduce((total, problem) => total + problem.confidence, 0) / problems.length
    : 0.55;

  const dimensions = [
    {
      name: "Process Clarity",
      score: clampScore(42 + signalHits(["process", "workflow", "operations", "service", "support"]) * 8 + problems.length * 5),
      rationale: "Scores whether the company exposes repeatable workflows that can be improved or automated."
    },
    {
      name: "Data & Reporting",
      score: clampScore(36 + signalHits(["report", "analytics", "dashboard", "metrics", "growth"]) * 10 + Math.round(avgProblemConfidence * 12)),
      rationale: "Scores the public evidence of reporting needs, measurement discipline, and decision visibility."
    },
    {
      name: "Integration Readiness",
      score: clampScore(34 + signalHits(["crm", "api", "integration", "automation", "spreadsheet", "whatsapp"]) * 9 + Math.round(highestHeatmap * 0.18)),
      rationale: "Scores the likelihood that software, CRM, messaging, or operational systems can be connected."
    },
    {
      name: "Growth Readiness",
      score: clampScore(38 + signalHits(["sales", "lead", "customer", "market", "export", "revenue"]) * 8 + Math.round(score.score * 0.2)),
      rationale: "Scores how strongly the company signals commercial expansion, lead generation, or revenue operations upside."
    },
    {
      name: "Buying Readiness",
      score: clampScore(32 + Math.round(summary.confidence * 20) + Math.round(budget.confidence * 16) + (budget.max > 0 ? 10 : -8)),
      rationale: "Scores whether enough business context exists to support a confident paid discovery or pilot offer."
    }
  ];

  const maturityScore = clampScore(Math.round(dimensions.reduce((total, dimension) => total + dimension.score, 0) / dimensions.length));
  const positiveSignals = [
    ...(signalHits(["crm", "lead", "sales"]) ? ["Commercial workflow signals are visible in the public footprint."] : []),
    ...(signalHits(["report", "analytics", "dashboard"]) ? ["Reporting or analytics language suggests measurable ROI potential."] : []),
    ...(signalHits(["customer", "support", "service"]) ? ["Customer-facing process signals can support automation discovery."] : []),
    ...(highestHeatmap >= 85 ? ["At least one opportunity heatmap area is highly actionable."] : [])
  ];
  const gaps = [
    ...(signalHits(["crm", "api", "integration"]) === 0 ? ["No clear public signal of existing CRM/API integration maturity."] : []),
    ...(budget.estimatedAnnualRevenueImpact <= budget.max ? ["Revenue impact is not yet strong enough for an enterprise-style transformation pitch."] : []),
    ...(summary.confidence < 0.7 ? ["Research confidence is moderate; discovery should validate operating model and buyer urgency."] : []),
    ...(problems.length < 2 ? ["Few explicit operational problems were visible from public content."] : [])
  ];

  const level = maturityLevel(maturityScore);
  return {
    score: maturityScore,
    level,
    summary: `${summary.companyName} is ${maturityLabel(level)} for an enterprise automation motion, based on process visibility, data readiness, integration signals, growth intent, and buying confidence.`,
    dimensions,
    positiveSignals: positiveSignals.length ? positiveSignals : ["Public content provides enough context for an initial consultative discovery motion."],
    gaps: gaps.length ? gaps : ["Discovery should still validate budget owner, current systems, implementation constraints, and measurable baseline."],
    recommendedMotion: maturityMotion(level, score.score)
  };
}

function maturityLevel(score: number): EnterpriseMaturityFactor["level"] {
  if (score >= 82) return "enterprise-ready";
  if (score >= 68) return "scaling";
  if (score >= 52) return "developing";
  return "emerging";
}

function maturityLabel(level: EnterpriseMaturityFactor["level"]): string {
  if (level === "enterprise-ready") return "enterprise-ready";
  if (level === "scaling") return "scaling";
  if (level === "developing") return "developing";
  return "emerging";
}

function maturityMotion(level: EnterpriseMaturityFactor["level"], opportunityScore: number): string {
  if (level === "enterprise-ready") {
    return "Lead with an executive transformation pilot: ROI model, integration roadmap, governance, and measurable operating KPIs.";
  }
  if (level === "scaling") {
    return "Lead with a paid automation pilot that proves ROI while mapping the broader enterprise workflow roadmap.";
  }
  if (level === "developing") {
    return opportunityScore >= 70
      ? "Lead with discovery plus one narrow pilot; avoid selling a large transformation before systems and ownership are validated."
      : "Lead with a lightweight workflow audit and maturity roadmap before proposing implementation.";
  }
  return "Lead with education, discovery, and low-risk process cleanup before pitching automation implementation.";
}

function buildIndustryBenchmarks(
  summary: BusinessSummary,
  problems: DetectedProblem[],
  score: SalesOpportunityScore,
  sourceText: string
): IndustryBenchmarks {
  const text = `${sourceText} ${problems.map((problem) => `${problem.title} ${problem.description}`).join(" ")}`.toLowerCase();
  const hasResponseGap = ["delay", "response", "support", "customer", "whatsapp"].some((keyword) => text.includes(keyword));
  const hasReportingGap = ["report", "analytics", "dashboard", "visibility"].some((keyword) => text.includes(keyword));
  const hasCrmGap = ["crm", "lead", "spreadsheet", "manual"].some((keyword) => text.includes(keyword));
  const hasExportSignal = ["export", "international", "distributor", "wholesale", "retail"].some((keyword) => text.includes(keyword));

  return {
    industry: summary.category,
    summary: `Directional benchmark for ${summary.category}. Values are inferred from public signals and should be validated during discovery before being used as contractual KPIs.`,
    metrics: [
      {
        name: "Lead Response Time",
        industryAverage: "24h target",
        currentEstimate: hasResponseGap ? "48h risk" : "24-36h risk",
        gap: hasResponseGap ? "+100%" : "+50%",
        interpretation: hasResponseGap
          ? "Public signals suggest response-speed friction; WhatsApp and CRM routing are likely high-leverage."
          : "No explicit response delay was found, but automated routing can still protect conversion."
      },
      {
        name: "CRM Discipline",
        industryAverage: "Centralized pipeline",
        currentEstimate: hasCrmGap ? "Manual or fragmented" : "Unconfirmed",
        gap: hasCrmGap ? "High" : "Medium",
        interpretation: hasCrmGap
          ? "Manual lead handling increases the case for CRM setup, scoring, and follow-up automation."
          : "Discovery should confirm whether lead ownership, status, and follow-up are tracked consistently."
      },
      {
        name: "Revenue Visibility",
        industryAverage: "Weekly dashboard",
        currentEstimate: hasReportingGap ? "Limited reporting" : "Unconfirmed reporting",
        gap: hasReportingGap ? "High" : "Medium",
        interpretation: hasReportingGap
          ? "Reporting language or gaps support a dashboard and executive insight layer."
          : "A lightweight reporting baseline should be added to prove ROI from the pilot."
      },
      {
        name: hasExportSignal ? "Export Sales Enablement" : "Conversion Instrumentation",
        industryAverage: hasExportSignal ? "Distributor-ready workflow" : "Tracked website-to-lead funnel",
        currentEstimate: hasExportSignal ? "Export motion visible, workflow unclear" : score.score >= 80 ? "Good signal, workflow unclear" : "Early-stage signal",
        gap: hasExportSignal ? "Medium-High" : score.score >= 80 ? "Medium" : "High",
        interpretation: hasExportSignal
          ? "Export or wholesale signals should be connected to distributor qualification and follow-up."
          : "Website interest should be translated into tracked qualification and next-step automation."
      }
    ]
  };
}

function buildAnalysisConfidence(researchContext: ResearchContext, socialUrls: string[], agentRuns: AgentRun[]): AnalysisConfidence {
  const text = researchContext.combinedText.toLowerCase();
  const structuredDataFound = ["schema.org", "json-ld", "ld+json", "structured data"].some((keyword) => text.includes(keyword));
  const websitePagesAnalyzed = 1 + researchContext.socialSnapshots.length;
  const contentCharacters = researchContext.combinedText.length;
  const qwenValidatedAgents = agentRuns.filter(
    (run) => run.outputValidated && (run.provider === "qwen-cloud" || run.provider === "mock")
  ).length;
  const score = clampScore(
    48 +
      Math.min(18, Math.floor(contentCharacters / 450)) +
      Math.min(12, socialUrls.length * 4) +
      Math.min(16, qwenValidatedAgents * 4) +
      (structuredDataFound ? 6 : 0)
  );
  const level: AnalysisConfidence["level"] = score >= 82 ? "high" : score >= 62 ? "medium" : "low";

  return {
    score,
    level,
    reasons: [
      `${websitePagesAnalyzed} public source(s) analyzed.`,
      `${qwenValidatedAgents} structured agent output(s) validated before final synthesis.`,
      socialUrls.length ? `${socialUrls.length} submitted social profile(s) added context.` : "No optional social profiles were submitted.",
      structuredDataFound ? "Structured data signal was detected in the research context." : "Structured data was not visible in the extracted context."
    ],
    evidence: {
      websitePagesAnalyzed,
      contentCharacters,
      structuredDataFound,
      socialProfilesFound: socialUrls.length,
      qwenValidatedAgents,
      sourceCount: websitePagesAnalyzed
    }
  };
}

function buildActionPlan(
  heatmap: OpportunityHeatmapItem[],
  problems: DetectedProblem[],
  proposal: ProposalDraft
): ActionPlan {
  const ranked = [...heatmap].sort((left, right) => right.score - left.score);
  const primary = ranked[0]?.area ?? "Lead Capture";
  const secondary = ranked[1]?.area ?? "CRM";
  const topProblem = problems[0]?.title ?? "Sales workflow opportunity";

  return {
    horizon: "30 days",
    weeks: [
      {
        week: 1,
        title: "Workflow Baseline",
        actions: [
          `Validate ${topProblem.toLowerCase()} with stakeholders.`,
          "Map the current lead intake, qualification, approval, and follow-up flow.",
          "Define the pilot KPI baseline and human approval checkpoint."
        ],
        successMetric: "Baseline funnel map and KPI owner approved."
      },
      {
        week: 2,
        title: `${primary} Automation`,
        actions: [
          `Build the first ${primary.toLowerCase()} workflow.`,
          "Connect intake forms, WhatsApp, CRM, or email handoff based on available systems.",
          "Create lead status rules and escalation logic."
        ],
        successMetric: "First automated workflow handles qualified test leads end to end."
      },
      {
        week: 3,
        title: `${secondary} Operating Layer`,
        actions: [
          `Add ${secondary.toLowerCase()} scoring or routing rules.`,
          "Generate the first manager dashboard and weekly insight snapshot.",
          "Tune prompts, qualification criteria, and proposal templates."
        ],
        successMetric: "Team can review score, owner, next step, and response status in one place."
      },
      {
        week: 4,
        title: "Executive Handoff",
        actions: [
          "Run a pilot retrospective against response speed, conversion quality, and manual time saved.",
          "Package the final proposal, outreach email, and operating playbook.",
          proposal.nextStep
        ],
        successMetric: "ROI readout and next-sprint roadmap approved by the decision maker."
      }
    ]
  };
}

function buildCostBreakdown(budget: BudgetEstimate, heatmap: OpportunityHeatmapItem[]): CostBreakdown {
  const total = budget.max;
  const hasHigh = (area: string) => heatmap.some((item) => item.area === area && item.score >= 80);
  const baseItems = [
    {
      item: "CRM Setup",
      weight: hasHigh("CRM") ? 0.2 : 0.16,
      rationale: "Pipeline fields, ownership rules, status tracking, and handoff structure."
    },
    {
      item: "WhatsApp / Lead Intake Automation",
      weight: hasHigh("WhatsApp") || hasHigh("Lead Capture") ? 0.24 : 0.2,
      rationale: "Automated intake, routing, qualification, and response-speed improvements."
    },
    {
      item: "Lead Scoring",
      weight: 0.16,
      rationale: "Scoring rules, qualification criteria, and sales-priority signals."
    },
    {
      item: "Campaign & Proposal Automation",
      weight: 0.22,
      rationale: "Proposal generation, outreach draft, and next-step workflows."
    },
    {
      item: "Training & Reporting",
      weight: 0.18,
      rationale: "Dashboard, operating playbook, adoption training, and ROI readout."
    }
  ];
  const weightTotal = baseItems.reduce((sum, item) => sum + item.weight, 0);
  const items = baseItems.map((item) => ({
    item: item.item,
    cost: roundToHundreds((total * item.weight) / weightTotal),
    rationale: item.rationale
  }));
  const delta = total - items.reduce((sum, item) => sum + item.cost, 0);
  items[items.length - 1].cost += delta;

  return {
    currency: budget.currency,
    total,
    items
  };
}

function buildRiskMatrix(heatmap: OpportunityHeatmapItem[], costBreakdown: CostBreakdown): RiskMatrix {
  const costByName = new Map(costBreakdown.items.map((item) => [item.item.toLowerCase(), item.cost]));
  const initiatives = heatmap.map((item) => {
    const effort = effortForInitiative(item.area, costByName);
    return {
      initiative: initiativeName(item.area),
      impact: impactForScore(item.score),
      effort,
      rationale: `${item.rationale} Budget pressure is ${effort} relative to the current package.`
    };
  });

  return {
    items: initiatives,
    summary: "Prioritize high-impact, low- or medium-effort initiatives first; use high-effort items as roadmap candidates after the pilot proves ROI."
  };
}

function initiativeName(area: string): string {
  if (area === "Lead Capture") return "Website Lead Capture";
  if (area === "WhatsApp") return "WhatsApp Automation";
  if (area === "CRM") return "CRM Migration";
  if (area === "Export Sales") return "Export Sales Enablement";
  if (area === "SEO") return "SEO Metadata";
  return area;
}

function impactForScore(score: number): RiskMatrix["items"][number]["impact"] {
  if (score >= 85) return "high";
  if (score >= 70) return "medium";
  return "low";
}

function effortForInitiative(area: string, costByName: Map<string, number>): RiskMatrix["items"][number]["effort"] {
  const crmCost = costByName.get("crm setup") ?? 0;
  if (area === "CRM") return crmCost > 4000 ? "high" : "medium";
  if (area === "Export Sales") return "high";
  if (area === "SEO") return "low";
  if (area === "Lead Capture" || area === "WhatsApp") return "low";
  return "medium";
}

function roundToHundreds(value: number): number {
  return Math.max(100, Math.round(value / 100) * 100);
}

function findPreviousAnalysis(records: Awaited<ReturnType<MemoryStore["listRecent"]>>, result: LeadPilotAnalysisResult) {
  return records.find((record) => sameUrl(record.sourceUrl, result.sourceUrl) || record.companyName.toLowerCase() === result.businessSummary.companyName.toLowerCase());
}

function sameUrl(left: string, right: string): boolean {
  try {
    return new URL(left).hostname.replace(/^www\./, "") === new URL(right).hostname.replace(/^www\./, "");
  } catch {
    return left === right;
  }
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("crm") || lower.includes("lead")) return "B2B sales and CRM";
  if (lower.includes("real estate")) return "Real estate services";
  if (lower.includes("agency") || lower.includes("marketing")) return "Marketing or services agency";
  if (lower.includes("software") || lower.includes("saas")) return "Software and technology";
  return "B2B services";
}

function inferTargetCustomer(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("enterprise")) return "Enterprise teams";
  if (lower.includes("small business") || lower.includes("smb")) return "Small and mid-sized businesses";
  if (lower.includes("founder")) return "Founders and operators";
  return "Growing companies";
}

function inferValueProposition(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 80) {
    return "The website presents a business with enough context for an initial sales analysis.";
  }
  return truncateAtWord(compact, 220);
}

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Analyzed Company";
  }
}

function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const trimmed = text.slice(0, maxLength).trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  const safe = lastSpace > 80 ? trimmed.slice(0, lastSpace) : trimmed;
  return `${safe.replace(/[.,:;]\s*$/, "")}.`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
