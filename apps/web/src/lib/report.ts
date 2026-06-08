import type {
  ActionPlan,
  AnalysisConfidence,
  BudgetEstimate,
  BusinessSummary,
  CompetitorAnalysis,
  ConflictResolution,
  CostBreakdown,
  DetectedProblem,
  EnterpriseMaturityFactor,
  FinalReport,
  AgentDiscussionEntry,
  IndustryBenchmarks,
  OpportunityHeatmapItem,
  ProposalDraft,
  RiskMatrix,
  SalesOpportunityScore
} from "./types";

export function assembleFinalReport(input: {
  companyName: string;
  businessSummary: BusinessSummary;
  detectedProblems: DetectedProblem[];
  salesOpportunityScore: SalesOpportunityScore;
  budgetEstimate: BudgetEstimate;
  proposalDraft: ProposalDraft;
  recommendedNextSteps: string[];
  agentDiscussion?: AgentDiscussionEntry[];
  conflictResolution?: ConflictResolution;
  opportunityHeatmap?: OpportunityHeatmapItem[];
  enterpriseMaturityFactor?: EnterpriseMaturityFactor;
  competitorAnalysis?: CompetitorAnalysis;
  industryBenchmarks?: IndustryBenchmarks;
  analysisConfidence?: AnalysisConfidence;
  actionPlan?: ActionPlan;
  costBreakdown?: CostBreakdown;
  riskMatrix?: RiskMatrix;
  socialUrls?: string[];
}): FinalReport {
  const costBreakdown = input.costBreakdown;
  const sections = [
    {
      heading: "Business Summary",
      content: `${input.businessSummary.companyName} operates in ${input.businessSummary.category}. ${input.businessSummary.valueProposition} Target customer: ${input.businessSummary.targetCustomer}.`
    },
    {
      heading: "Detected Problems",
      content: input.detectedProblems
        .map((problem) => `- ${problem.title}: ${problem.description} Impact: ${problem.businessImpact}`)
        .join("\n")
    },
    {
      heading: "Sales Opportunity Score",
      content: `${input.salesOpportunityScore.score}/100. ${input.salesOpportunityScore.recommendedAngle}`
    },
    ...(input.enterpriseMaturityFactor
      ? [
          {
            heading: "Enterprise Maturity Factor",
            content: [
              `Score: ${input.enterpriseMaturityFactor.score}/100`,
              `Level: ${input.enterpriseMaturityFactor.level}`,
              `Summary: ${input.enterpriseMaturityFactor.summary}`,
              `Recommended Motion: ${input.enterpriseMaturityFactor.recommendedMotion}`,
              "Dimensions:",
              ...input.enterpriseMaturityFactor.dimensions.map((dimension) => `- ${dimension.name}: ${dimension.score}/100 - ${dimension.rationale}`),
              "Gaps:",
              ...input.enterpriseMaturityFactor.gaps.map((gap) => `- ${gap}`)
            ].join("\n")
          }
        ]
      : []),
    ...(input.competitorAnalysis
      ? [
          {
            heading: "Competitor Agent",
            content: [
              input.competitorAnalysis.positioningSummary,
              "Competitors Found:",
              ...input.competitorAnalysis.competitors.map(
                (competitor) =>
                  `- ${competitor.name}: ${competitor.positioning} Relevance: ${competitor.relevance}. Threat: ${competitor.estimatedThreat}.`
              ),
              "Competitive Advantages:",
              ...input.competitorAnalysis.competitiveAdvantages.map((advantage) => `- ${advantage}`),
              "Market Gaps:",
              ...input.competitorAnalysis.marketGaps.map((gap) => `- ${gap}`)
            ].join("\n")
          }
        ]
      : []),
    ...(input.industryBenchmarks
      ? [
          {
            heading: "Industry Benchmarks",
            content: [
              `${input.industryBenchmarks.industry}: ${input.industryBenchmarks.summary}`,
              ...input.industryBenchmarks.metrics.map(
                (metric) =>
                  `- ${metric.name}: Industry ${metric.industryAverage}. Current ${metric.currentEstimate}. Gap ${metric.gap}. ${metric.interpretation}`
              )
            ].join("\n")
          }
        ]
      : []),
    ...(input.analysisConfidence
      ? [
          {
            heading: "Analysis Confidence",
            content: [
              `Score: ${input.analysisConfidence.score}/100 (${input.analysisConfidence.level})`,
              ...input.analysisConfidence.reasons.map((reason) => `- ${reason}`),
              `Evidence: ${input.analysisConfidence.evidence.websitePagesAnalyzed} source(s), ${input.analysisConfidence.evidence.contentCharacters} extracted character(s), ${input.analysisConfidence.evidence.qwenValidatedAgents} validated agent output(s).`
            ].join("\n")
          }
        ]
      : []),
    ...(input.conflictResolution
      ? [
          {
            heading: "Agent Conflict Resolution",
            content: [
              `Research Agent Score: ${input.conflictResolution.researchScore}`,
              `Opportunity Agent Score: ${input.conflictResolution.opportunityScore}`,
              `Manager Final Score: ${input.conflictResolution.finalScore}`,
              `Conflict Detected: ${input.conflictResolution.conflictDetected ? "yes" : "no"}`,
              `Reason: ${input.conflictResolution.reason}`
            ].join("\n")
          }
        ]
      : []),
    ...(input.opportunityHeatmap?.length
      ? [
          {
            heading: "Opportunity Heatmap",
            content: input.opportunityHeatmap.map((item) => `${item.area}: ${item.score}/100 - ${item.rationale}`).join("\n")
          }
        ]
      : []),
    {
      heading: "Estimated Budget",
      content: `${input.budgetEstimate.currency} ${formatNumber(input.budgetEstimate.min)}-${formatNumber(input.budgetEstimate.max)} (${input.budgetEstimate.complexity} complexity). ${input.budgetEstimate.packageRecommendation}`
    },
    ...(costBreakdown
      ? [
          {
            heading: "Cost Breakdown",
            content: [
              `Total: ${costBreakdown.currency} ${formatNumber(costBreakdown.total)}`,
              ...costBreakdown.items.map((item) => `- ${item.item}: ${costBreakdown.currency} ${formatNumber(item.cost)} - ${item.rationale}`)
            ].join("\n")
          }
        ]
      : []),
    {
      heading: "ROI Projection",
      content: [
        `Estimated Project Cost: ${input.budgetEstimate.currency} ${formatNumber(input.budgetEstimate.max)}`,
        `Estimated Annual Revenue Impact: ${input.budgetEstimate.currency} ${formatNumber(input.budgetEstimate.estimatedAnnualRevenueImpact)}`,
        `ROI: ${input.budgetEstimate.roiPercent}%`
      ].join("\n")
    },
    {
      heading: "ROI Assumptions",
      content: input.budgetEstimate.roiAssumptions.map((assumption) => `- ${assumption}`).join("\n")
    },
    ...(input.riskMatrix
      ? [
          {
            heading: "Visual Risk Matrix",
            content: [
              input.riskMatrix.summary,
              ...input.riskMatrix.items.map((item) => `- ${item.initiative}: ${item.impact} impact / ${item.effort} effort. ${item.rationale}`)
            ].join("\n")
          }
        ]
      : []),
    ...(input.actionPlan
      ? [
          {
            heading: "30-Day Action Plan",
            content: input.actionPlan.weeks
              .map(
                (week) =>
                  `Week ${week.week} - ${week.title}\n${week.actions.map((action) => `- ${action}`).join("\n")}\nSuccess Metric: ${week.successMetric}`
              )
              .join("\n\n")
          }
        ]
      : []),
    {
      heading: "Proposal Draft",
      content: `${input.proposalDraft.executiveSummary}\n\nScope:\n${input.proposalDraft.recommendedScope.map((item) => `- ${item}`).join("\n")}`
    },
    {
      heading: "Human Approval",
      content: "Checkpoint required: approve the proposal or request a revision before sending the final proposal to the prospect."
    },
    {
      heading: "Outreach Email",
      content: input.proposalDraft.emailDraft
    },
    ...(input.agentDiscussion?.length
      ? [
          {
            heading: "Agent Discussion",
            content: input.agentDiscussion.map((entry) => `${entry.agent}:\n${entry.message}`).join("\n\n")
          }
        ]
      : []),
    ...(input.socialUrls?.length
      ? [
          {
            heading: "Additional Research Sources",
            content: input.socialUrls.map((url) => `- ${url}`).join("\n")
          }
        ]
      : []),
    {
      heading: "Recommended Next Steps",
      content: input.recommendedNextSteps.map((step) => `- ${step}`).join("\n")
    }
  ];

  const title = `LeadPilot AI Report - ${input.companyName}`;
  const markdown = [`# ${title}`, ...sections.map((section) => `## ${section.heading}\n\n${section.content}`)].join(
    "\n\n"
  );

  return {
    title,
    sections,
    markdown,
    generatedAt: new Date().toISOString()
  };
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
