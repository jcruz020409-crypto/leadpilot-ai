export type SafeUrlFailureReason =
  | "invalid_url"
  | "unsupported_scheme"
  | "blocked_host"
  | "blocked_private_network"
  | "dns_lookup_failed";

export type SafeUrlResult =
  | {
      allowed: true;
      normalizedUrl: string;
      hostname: string;
    }
  | {
      allowed: false;
      reason: SafeUrlFailureReason;
      message: string;
    };

export interface WebsiteSnapshot {
  sourceUrl: string;
  finalUrl: string;
  title: string;
  description?: string;
  text: string;
  status: number;
  fetchedAt: string;
}

export interface AgentRun {
  agent: string;
  status: "completed" | "failed";
  startedAt: string;
  completedAt: string;
  summary: string;
  provider: "local" | "mock" | "qwen-cloud" | "memory-store";
  model: string;
  responseFormat: "none" | "json_object" | "json_schema";
  latencyMs: number;
  usedFallback: boolean;
  outputValidated: boolean;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: string;
}

export interface BusinessSummary {
  companyName: string;
  category: string;
  targetCustomer: string;
  valueProposition: string;
  confidence: number;
}

export interface DetectedProblem {
  title: string;
  description: string;
  evidence: string;
  businessImpact: string;
  automationPotential: string;
  confidence: number;
}

export interface SalesOpportunityScore {
  score: number;
  reasons: string[];
  risks: string[];
  recommendedAngle: string;
  confidence: number;
}

export interface BudgetEstimate {
  currency: string;
  min: number;
  max: number;
  estimatedAnnualRevenueImpact: number;
  roiPercent: number;
  complexity: "low" | "medium" | "high";
  roiAssumptions: string[];
  packageRecommendation: string;
  assumptions: string[];
  confidence: number;
}

export interface ProposalDraft {
  title: string;
  executiveSummary: string;
  recommendedScope: string[];
  emailDraft: string;
  workPlan: string[];
  timeline: string;
  investment: string;
  nextStep: string;
}

export interface ReportSection {
  heading: string;
  content: string;
}

export interface FinalReport {
  title: string;
  sections: ReportSection[];
  markdown: string;
  generatedAt: string;
}

export interface MemoryDigest {
  saved: boolean;
  summary: string;
  recentCount: number;
  recentRecords: MemoryRecordSummary[];
  foundPrevious: boolean;
  lastAnalyzedAt?: string;
  previousScore?: number;
  currentScore: number;
  scoreDelta?: number;
}

export interface MemoryRecordSummary {
  companyName: string;
  score: number;
  sourceUrl: string;
  savedAt: string;
  proposalTitle: string;
  proposalSummary: string;
}

export interface AgentDiscussionEntry {
  agent: string;
  message: string;
}

export interface ConflictResolution {
  researchScore: number;
  opportunityScore: number;
  finalScore: number;
  conflictDetected: boolean;
  reason: string;
}

export interface OpportunityHeatmapItem {
  area: string;
  score: number;
  rationale: string;
}

export interface EnterpriseMaturityDimension {
  name: string;
  score: number;
  rationale: string;
}

export interface EnterpriseMaturityFactor {
  score: number;
  level: "emerging" | "developing" | "scaling" | "enterprise-ready";
  summary: string;
  dimensions: EnterpriseMaturityDimension[];
  positiveSignals: string[];
  gaps: string[];
  recommendedMotion: string;
}

export type ImpactLevel = "low" | "medium" | "high";
export type EffortLevel = "low" | "medium" | "high";

export interface CompetitorProfile {
  name: string;
  positioning: string;
  relevance: ImpactLevel;
  estimatedThreat: ImpactLevel;
}

export interface CompetitorSearchSource {
  title: string;
  url: string;
  snippet: string;
}

export interface CompetitorAnalysis {
  competitors: CompetitorProfile[];
  competitiveAdvantages: string[];
  marketGaps: string[];
  positioningSummary: string;
  searchProvider?: "exa" | "none";
  searchSources?: CompetitorSearchSource[];
}

export interface IndustryBenchmarkMetric {
  name: string;
  industryAverage: string;
  currentEstimate: string;
  gap: string;
  interpretation: string;
}

export interface IndustryBenchmarks {
  industry: string;
  metrics: IndustryBenchmarkMetric[];
  summary: string;
}

export interface AnalysisConfidenceEvidence {
  websitePagesAnalyzed: number;
  contentCharacters: number;
  structuredDataFound: boolean;
  socialProfilesFound: number;
  qwenValidatedAgents: number;
  sourceCount: number;
}

export interface AnalysisConfidence {
  score: number;
  level: "low" | "medium" | "high";
  reasons: string[];
  evidence: AnalysisConfidenceEvidence;
}

export interface ActionPlanWeek {
  week: number;
  title: string;
  actions: string[];
  successMetric: string;
}

export interface ActionPlan {
  horizon: "30 days";
  weeks: ActionPlanWeek[];
}

export interface CostBreakdownItem {
  item: string;
  cost: number;
  rationale: string;
}

export interface CostBreakdown {
  currency: string;
  total: number;
  items: CostBreakdownItem[];
}

export interface RiskMatrixItem {
  initiative: string;
  impact: ImpactLevel;
  effort: EffortLevel;
  rationale: string;
}

export interface RiskMatrix {
  items: RiskMatrixItem[];
  summary: string;
}

export interface LeadPilotAnalysisResult {
  sourceUrl: string;
  finalUrl: string;
  socialUrls: string[];
  businessSummary: BusinessSummary;
  detectedProblems: DetectedProblem[];
  salesOpportunityScore: SalesOpportunityScore;
  budgetEstimate: BudgetEstimate;
  proposalDraft: ProposalDraft;
  recommendedNextSteps: string[];
  agentDiscussion: AgentDiscussionEntry[];
  conflictResolution: ConflictResolution;
  opportunityHeatmap: OpportunityHeatmapItem[];
  enterpriseMaturityFactor: EnterpriseMaturityFactor;
  competitorAnalysis: CompetitorAnalysis;
  industryBenchmarks: IndustryBenchmarks;
  analysisConfidence: AnalysisConfidence;
  actionPlan: ActionPlan;
  costBreakdown: CostBreakdown;
  riskMatrix: RiskMatrix;
  finalReport: FinalReport;
  memoryDigest: MemoryDigest;
  agentRuns: AgentRun[];
}
