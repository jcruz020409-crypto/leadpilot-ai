"use client";

import {
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { LEADPILOT_MARK_PATH } from "../lib/brand";
import { downloadLeadPilotPdf } from "../lib/pdf-report";
import type { LeadPilotAnalysisResult } from "../lib/types";

type ReportAnswer = {
  answer: string;
  citations: string[];
  followUpQuestions: string[];
};

type AskReportResponse =
  | {
      ok: true;
      answer: ReportAnswer;
    }
  | {
      ok: false;
      error: string;
    };

type AnalysisJobAgent = {
  agent: string;
  status: "pending" | "running" | "completed" | "failed";
  summary: string;
};

type AnalysisJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  agents: AnalysisJobAgent[];
  result?: LeadPilotAnalysisResult;
  error?: string;
};

type AnalysisJobResponse =
  | {
      ok: true;
      job: AnalysisJob;
    }
  | {
      ok: false;
      error: string;
    };

const AGENTS = ["Manager", "Research", "Opportunity", "Competitor", "Pricing", "Proposal", "Memory"];
const AGENT_META = {
  Manager: { icon: Star, tone: "sky" },
  Research: { icon: Search, tone: "amber" },
  Opportunity: { icon: TrendingUp, tone: "violet" },
  Competitor: { icon: BarChart3, tone: "rose" },
  Pricing: { icon: CircleDollarSign, tone: "gold" },
  Proposal: { icon: FileText, tone: "teal" },
  Memory: { icon: Lightbulb, tone: "indigo" }
} as const;
const SOCIAL_URL_PRESETS = [
  { label: "LinkedIn", url: "https://www.linkedin.com/company/example" },
  { label: "X / Twitter", url: "https://x.com/example" },
  { label: "Facebook", url: "https://www.facebook.com/example" },
  { label: "Instagram", url: "https://www.instagram.com/example" },
  { label: "YouTube", url: "https://www.youtube.com/@example" }
] as const;
const SOCIAL_PLACEHOLDER = [
  "https://www.linkedin.com/company/example",
  "https://x.com/example",
  "https://www.instagram.com/example"
].join("\n");
const AGENT_LIVE_MESSAGES = [
  {
    agent: "Manager Agent",
    message: "Routing the analysis plan across research, opportunity, competitor, pricing, proposal, and memory agents."
  },
  {
    agent: "Research Agent",
    message: "Extracting website context, social profile signals, target customer, category, and value proposition."
  },
  {
    agent: "Opportunity Agent",
    message: "Looking for conversion gaps, manual workflows, response-speed friction, and automation potential."
  },
  {
    agent: "Competitor Agent",
    message: "Mapping directional competitors, positioning pressure, differentiators, and market gaps."
  },
  {
    agent: "Pricing Agent",
    message: "Estimating budget, ROI, cost breakdown, industry benchmark gaps, and risk-adjusted commercial score."
  },
  {
    agent: "Proposal Agent",
    message: "Drafting the proposal, outreach email, 30-day action plan, and recommended next step."
  },
  {
    agent: "Memory Agent",
    message: "Saving the analysis and checking previous company history for score movement."
  }
];
type ApprovalStatus = "pending" | "approved" | "revision_requested";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [socialUrlsText, setSocialUrlsText] = useState("");
  const [result, setResult] = useState<LeadPilotAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeAgentIndex, setActiveAgentIndex] = useState(0);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("pending");
  const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null);

  const agentStatus = useMemo(() => {
    if (currentJob && !result) {
      return AGENTS.map((agent) => {
        const jobAgent = currentJob.agents.find((item) => item.agent === agent);
        return {
          agent,
          status: jobAgent ? agentStatusLabel(jobAgent.status) : "Pending"
        };
      });
    }

    if (result) {
      return AGENTS.map((agent) => ({
        agent,
        status: result.agentRuns.some((run) => run.agent.startsWith(agent)) ? "Complete" : "Pending"
      }));
    }

    if (loading) {
      return AGENTS.map((agent, index) => ({
        agent,
        status: index < activeAgentIndex ? "Complete" : index === activeAgentIndex ? "Running..." : "Pending"
      }));
    }

    return AGENTS.map((agent) => ({ agent, status: "Pending" }));
  }, [activeAgentIndex, currentJob, loading, result]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveAgentIndex((current) => Math.min(current + 1, AGENTS.length - 1));
    }, 900);

    return () => window.clearInterval(interval);
  }, [loading]);

  async function analyze(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentJob(null);
    setActiveAgentIndex(0);
    setApprovalStatus("pending");

    try {
      const normalizedUrl = url.trim();
      const socialUrls = parseSocialUrls(socialUrlsText);
      if (!normalizedUrl && socialUrls.length === 0) {
        throw new Error("Add a company website URL, at least one social media URL, or both.");
      }
      const response = await fetch("/api/analyze/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl, socialUrls })
      });
      const payload = (await response.json()) as AnalysisJobResponse;
      if (!payload.ok) {
        throw new Error(payload.error);
      }
      setCurrentJob(payload.job);
      const completedJob = await pollAnalysisJob(payload.job.id);
      if (completedJob.status === "failed") {
        throw new Error(completedJob.error ?? "Analysis job failed.");
      }
      if (!completedJob.result) {
        throw new Error("Analysis job completed without a result.");
      }
      setResult(completedJob.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function pollAnalysisJob(jobId: string): Promise<AnalysisJob> {
    for (;;) {
      await wait(900);
      const response = await fetch(`/api/analyze/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const payload = (await response.json()) as AnalysisJobResponse;
      if (!payload.ok) {
        throw new Error(payload.error);
      }
      setCurrentJob(payload.job);
      if (payload.job.status === "completed" || payload.job.status === "failed") {
        return payload.job;
      }
    }
  }

  async function copyReport() {
    if (!result) return;
    await navigator.clipboard.writeText(result.finalReport.markdown);
  }

  function downloadReport() {
    if (!result) return;
    void downloadLeadPilotPdf(result, approvalStatus);
  }

  function addSocialPreset(presetUrl: string) {
    setSocialUrlsText((current) => {
      const urls = parseSocialUrls(current);
      if (urls.includes(presetUrl)) {
        return current;
      }
      return [...urls, presetUrl].join("\n");
    });
  }

  return (
    <main className="app-shell isolate antialiased">
      <section className="workspace w-full">
        <header className="topbar">
          <div className="brand-lockup">
            <img className="brand-mark" src={LEADPILOT_MARK_PATH} alt="" width={72} height={72} aria-hidden="true" />
            <div>
              <p className="eyebrow">Agent Society / Autopilot Agent</p>
              <h1>LeadPilot AI</h1>
            </div>
          </div>
          <div className="provider-pill shadow-sm" aria-label="Qwen Cloud provider active">
            <span className="status-dot" aria-hidden="true" />
            <Bot size={16} />
            Qwen Cloud
          </div>
          <Link className="history-link" href="/history">
            Analysis History
          </Link>
        </header>

        <form className="url-console ring-1 ring-transparent" onSubmit={analyze}>
          <label htmlFor="company-url">Company Website URL</label>
          <p className="field-help">Recommended. You can also analyze social media only when a website is not available.</p>
          <div className="url-row">
            <input
              id="company-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              type="url"
            />
            <button className="primary-button" disabled={loading} type="submit">
              <span className="button-icon-stack" aria-hidden="true">
                <Loader2 className={loading ? "icon-visible spin" : "icon-hidden spin"} size={18} />
                <Sparkles className={loading ? "icon-hidden" : "icon-visible"} size={18} />
              </span>
              Analyze
            </button>
          </div>
          <div className="social-field">
            <label htmlFor="social-urls">Social Media URLs</label>
            <p className="field-help">LinkedIn, X/Twitter, Facebook, Instagram, YouTube, or other public profiles.</p>
            <textarea
              id="social-urls"
              value={socialUrlsText}
              onChange={(event) => setSocialUrlsText(event.target.value)}
              placeholder={SOCIAL_PLACEHOLDER}
              rows={3}
            />
            <div className="social-presets" aria-label="Social media URL templates">
              {SOCIAL_URL_PRESETS.map((preset) => (
                <button
                  className="social-preset"
                  disabled={loading}
                  key={preset.label}
                  onClick={() => addSocialPreset(preset.url)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="error-line">{error}</p> : null}
        </form>

        <AgentStatusStrip statuses={agentStatus} />

        {loading ? (
          <LoadingPanel activeAgentIndex={activeAgentIndex} job={currentJob} />
        ) : result ? (
          <ResultView
            approvalStatus={approvalStatus}
            onApprove={() => setApprovalStatus("approved")}
            onCopy={copyReport}
            onDownload={downloadReport}
            onRegenerate={() => analyze()}
            onRequestRevision={() => setApprovalStatus("revision_requested")}
            result={result}
          />
        ) : (
          <EmptyState />
        )}
      </section>
    </main>
  );
}

function AgentStatusStrip({ statuses }: { statuses: Array<{ agent: string; status: string }> }) {
  return (
    <section className="agent-strip" aria-label="Agent workflow">
      {statuses.map((status) => {
        const meta = AGENT_META[status.agent as keyof typeof AGENT_META];
        const Icon = meta.icon;
        return (
          <div className={`agent-node ${agentStatusClass(status.status)} tone-${meta.tone}`} key={status.agent}>
            <span className="agent-icon" aria-hidden="true">
              {status.status === "Complete" ? <CheckCircle2 size={22} /> : status.status === "Running..." ? <Loader2 className="spin" size={22} /> : <Icon size={22} />}
            </span>
            <span className="agent-copy">
              <strong>{status.agent}</strong>
              <small>
                <i aria-hidden="true" />
                {status.status}
              </small>
            </span>
          </div>
        );
      })}
    </section>
  );
}

function LoadingPanel({ activeAgentIndex, job }: { activeAgentIndex: number; job: AnalysisJob | null }) {
  const visibleMessages = AGENT_LIVE_MESSAGES.slice(0, Math.min(activeAgentIndex + 2, AGENT_LIVE_MESSAGES.length));
  const jobMessages =
    job?.agents
      .filter((agent) => agent.status !== "pending")
      .map((agent) => ({
        agent: `${agent.agent} Agent`,
        message: agent.summary,
        active: agent.status === "running"
      })) ?? [];
  const messages = jobMessages.length ? jobMessages : visibleMessages.map((entry, index) => ({ ...entry, active: index === visibleMessages.length - 1 }));

  return (
    <section className="report-grid">
      <div className="status-panel">
        <Loader2 className="spin" size={24} />
        <h2>Agents running</h2>
        <p>Manager, Research, Opportunity, Competitor, Pricing, Proposal, and Memory are building the report.</p>
        <div className="agent-feed" aria-label="Live agent chat">
          <h3>Live Agent Chat</h3>
          {messages.map((entry) => (
            <div className={entry.active ? "feed-entry active" : "feed-entry"} key={`${entry.agent}-${entry.message}`}>
              <strong>{entry.agent}</strong>
              <span>{entry.message}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="report-grid">
      <div className="status-panel">
        <Sparkles size={24} />
        <h2>Ready</h2>
        <p>Paste a company website, social profile URLs, or both to generate the multi-agent sales report.</p>
        <p className="field-help">Using both sources gives the Research and Opportunity agents stronger context.</p>
      </div>
    </section>
  );
}

function ResultView({
  approvalStatus,
  result,
  onApprove,
  onCopy,
  onDownload,
  onRegenerate,
  onRequestRevision
}: {
  approvalStatus: ApprovalStatus;
  result: LeadPilotAnalysisResult;
  onApprove: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onRegenerate: () => void;
  onRequestRevision: () => void;
}) {
  return (
    <section className="results">
      <div className="report-toolbar">
        <div>
          <p className="eyebrow">Final Analysis Report</p>
          <h2>{result.businessSummary.companyName}</h2>
          <a href={result.finalUrl} rel="noreferrer" target="_blank">
            <ExternalLink size={14} />
            {result.finalUrl}
          </a>
        </div>
        <div className="button-row">
          <button onClick={onRegenerate} type="button">
            <RefreshCw size={16} />
            Regenerate
          </button>
          <button onClick={onCopy} type="button">
            <Copy size={16} />
            Copy
          </button>
          <button onClick={onDownload} type="button">
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="metric-band">
        <ScoreVisual score={result.salesOpportunityScore.score} />
        <Metric label="Enterprise Maturity" value={`${result.enterpriseMaturityFactor.score}/100`} />
        <Metric label="Confidence" value={`${result.analysisConfidence.score}%`} />
        <Metric label="Budget" value={`${result.budgetEstimate.currency} ${formatNumber(result.budgetEstimate.min)}-${formatNumber(result.budgetEstimate.max)}`} />
        <Metric label="Annual Impact" value={`${result.budgetEstimate.currency} ${formatNumber(result.budgetEstimate.estimatedAnnualRevenueImpact)}`} />
        <Metric label="ROI" value={`${result.budgetEstimate.roiPercent}%`} />
        <Metric label="Complexity" value={result.budgetEstimate.complexity} />
      </div>

      <div className="report-grid">
        <ReportPanel title="AI Execution Trace" wide>
          <div className="trace-grid" role="table" aria-label="Agent execution trace">
            <div className="trace-head" role="row">
              <span>Agent</span>
              <span>Provider</span>
              <span>Model</span>
              <span>Format</span>
              <span>Latency</span>
              <span>Validated</span>
            </div>
            {result.agentRuns.map((run) => (
              <div className="trace-row" key={`${run.agent}-${run.startedAt}`} role="row">
                <span data-label="Agent">{run.agent}</span>
                <span data-label="Provider" className={run.provider === "qwen-cloud" ? "provider-real" : ""}>
                  {run.provider}
                </span>
                <span data-label="Model">{run.model}</span>
                <span data-label="Format">{run.responseFormat}</span>
                <span data-label="Latency">{run.latencyMs}ms</span>
                <span data-label="Validated">{run.outputValidated ? "yes" : "no"}</span>
              </div>
            ))}
          </div>
          <p className="trace-note">
            {result.agentRuns.some((run) => run.provider === "qwen-cloud")
              ? "Qwen Cloud calls are active. Token usage appears when the provider returns usage metadata."
              : "Mock fallback is active for this run. Add a Qwen key and disable mocks for live provider calls."}
          </p>
        </ReportPanel>

        <ReportPanel title="Research Sources" wide>
          <ul className="source-list">
            <li>
              <a href={result.finalUrl} rel="noreferrer" target="_blank">
                <ExternalLink size={14} />
                {result.finalUrl}
              </a>
            </li>
            {result.socialUrls.map((socialUrl) => (
              <li key={socialUrl}>
                <a href={socialUrl} rel="noreferrer" target="_blank">
                  <ExternalLink size={14} />
                  {socialUrl}
                </a>
              </li>
            ))}
          </ul>
        </ReportPanel>

        <AskReportPanel result={result} />

        <ReportPanel title="Analysis Confidence" wide>
          <div className="confidence-layout">
            <div className="confidence-score">
              <span>{result.analysisConfidence.level}</span>
              <strong>{result.analysisConfidence.score}%</strong>
              <div className="confidence-bar" aria-label={`Analysis confidence ${result.analysisConfidence.score} percent`}>
                <i style={{ width: `${result.analysisConfidence.score}%` }} />
              </div>
            </div>
            <ul className="dense-list">
              {result.analysisConfidence.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <div className="confidence-evidence">
            <Metric label="Sources" value={`${result.analysisConfidence.evidence.sourceCount}`} />
            <Metric label="Characters" value={formatNumber(result.analysisConfidence.evidence.contentCharacters)} />
            <Metric label="Social Profiles" value={`${result.analysisConfidence.evidence.socialProfilesFound}`} />
            <Metric label="Validated Agents" value={`${result.analysisConfidence.evidence.qwenValidatedAgents}`} />
          </div>
        </ReportPanel>

        <ReportPanel title="Agent Conflict Resolution" wide>
          <div className="conflict-grid">
            <Metric label="Research Agent" value={`${result.conflictResolution.researchScore}/100`} />
            <Metric label="Opportunity Agent" value={`${result.conflictResolution.opportunityScore}/100`} />
            <Metric label="Manager Final Score" value={`${result.conflictResolution.finalScore}/100`} />
          </div>
          <p>{result.conflictResolution.reason}</p>
        </ReportPanel>

        <ReportPanel title="Enterprise Maturity Factor" wide>
          <div className="maturity-summary">
            <div>
              <span>{result.enterpriseMaturityFactor.level.replace("-", " ")}</span>
              <strong>{result.enterpriseMaturityFactor.score}/100</strong>
            </div>
            <p>{result.enterpriseMaturityFactor.summary}</p>
          </div>
          <div className="maturity-list">
            {result.enterpriseMaturityFactor.dimensions.map((dimension) => (
              <div className="maturity-row" key={dimension.name}>
                <strong>{dimension.name}</strong>
                <div className="maturity-bar" aria-label={`${dimension.name} maturity ${dimension.score} out of 100`}>
                  <i style={{ width: `${dimension.score}%` }} />
                </div>
                <span>{dimension.score}/100</span>
                <p>{dimension.rationale}</p>
              </div>
            ))}
          </div>
          <div className="maturity-columns">
            <div>
              <h3>Positive Signals</h3>
              <ul className="dense-list">
                {result.enterpriseMaturityFactor.positiveSignals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Gaps To Validate</h3>
              <ul className="dense-list">
                {result.enterpriseMaturityFactor.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="maturity-motion">{result.enterpriseMaturityFactor.recommendedMotion}</p>
        </ReportPanel>

        <ReportPanel title="Competitor Agent" wide>
          <p>{result.competitorAnalysis.positioningSummary}</p>
          <div className="source-badge">
            <span>Search Provider</span>
            <strong>{result.competitorAnalysis.searchProvider === "exa" ? "Exa live search" : "Directional inference"}</strong>
          </div>
          <div className="competitor-grid">
            {result.competitorAnalysis.competitors.map((competitor) => (
              <div className="competitor-card" key={competitor.name}>
                <strong>{competitor.name}</strong>
                <p>{competitor.positioning}</p>
                <div>
                  <span>{competitor.relevance} relevance</span>
                  <span>{competitor.estimatedThreat} threat</span>
                </div>
              </div>
            ))}
          </div>
          {result.competitorAnalysis.searchSources?.length ? (
            <div className="competitor-sources">
              <h3>Competitor Search Sources</h3>
              {result.competitorAnalysis.searchSources.map((source) => (
                <a href={source.url} key={source.url} rel="noreferrer" target="_blank">
                  <strong>{source.title}</strong>
                  <span>{source.snippet}</span>
                </a>
              ))}
            </div>
          ) : null}
          <div className="maturity-columns">
            <div>
              <h3>Competitive Advantages</h3>
              <ul className="dense-list">
                {result.competitorAnalysis.competitiveAdvantages.map((advantage) => (
                  <li key={advantage}>{advantage}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Market Gaps</h3>
              <ul className="dense-list">
                {result.competitorAnalysis.marketGaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          </div>
        </ReportPanel>

        <ReportPanel title="Industry Benchmarks" wide>
          <p>{result.industryBenchmarks.summary}</p>
          <div className="benchmark-list">
            {result.industryBenchmarks.metrics.map((metric) => (
              <div className="benchmark-row" key={metric.name}>
                <strong>{metric.name}</strong>
                <span>{metric.industryAverage}</span>
                <span>{metric.currentEstimate}</span>
                <b>{metric.gap}</b>
                <p>{metric.interpretation}</p>
              </div>
            ))}
          </div>
        </ReportPanel>

        <ReportPanel title="Opportunity Heatmap" wide>
          <div className="heatmap-list">
            {result.opportunityHeatmap.map((item) => (
              <div className="heatmap-row" key={item.area}>
                <strong>{item.area}</strong>
                <div className="heatmap-bar" aria-label={`${item.area} opportunity ${item.score} out of 100`}>
                  <i style={{ width: `${item.score}%` }} />
                </div>
                <span>{item.score}/100</span>
                <p>{item.rationale}</p>
              </div>
            ))}
          </div>
        </ReportPanel>

        <ReportPanel title="Business Summary">
          <p>{result.businessSummary.valueProposition}</p>
          <dl>
            <dt>Category</dt>
            <dd>{result.businessSummary.category}</dd>
            <dt>Target customer</dt>
            <dd>{result.businessSummary.targetCustomer}</dd>
          </dl>
        </ReportPanel>

        <ReportPanel title="Detected Problems">
          <ul className="dense-list">
            {result.detectedProblems.map((problem) => (
              <li key={problem.title}>
                <strong>{problem.title}</strong>
                <span>{problem.businessImpact}</span>
              </li>
            ))}
          </ul>
        </ReportPanel>

        <ReportPanel title="Sales Opportunity Score">
          <ScoreVisual score={result.salesOpportunityScore.score} compact />
          <p>{result.salesOpportunityScore.recommendedAngle}</p>
          <ul className="dense-list">
            {result.salesOpportunityScore.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </ReportPanel>

        <ReportPanel title="Estimated Budget">
          <p className="budget-line">
            {result.budgetEstimate.currency} {formatNumber(result.budgetEstimate.min)}-
            {formatNumber(result.budgetEstimate.max)}
          </p>
          <p>{result.budgetEstimate.packageRecommendation}</p>
          <ul className="dense-list">
            {result.budgetEstimate.roiAssumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </ReportPanel>

        <ReportPanel title="Cost Breakdown">
          <div className="cost-breakdown">
            {result.costBreakdown.items.map((item) => (
              <div className="cost-row" key={item.item}>
                <div>
                  <strong>{item.item}</strong>
                  <p>{item.rationale}</p>
                </div>
                <span>
                  {result.costBreakdown.currency} {formatNumber(item.cost)}
                </span>
              </div>
            ))}
            <div className="cost-total">
              <strong>Total</strong>
              <span>
                {result.costBreakdown.currency} {formatNumber(result.costBreakdown.total)}
              </span>
            </div>
          </div>
        </ReportPanel>

        <ReportPanel title="ROI Projection">
          <dl>
            <dt>Estimated Project Cost</dt>
            <dd>
              {result.budgetEstimate.currency} {formatNumber(result.budgetEstimate.max)}
            </dd>
            <dt>Estimated Annual Revenue Impact</dt>
            <dd>
              {result.budgetEstimate.currency} {formatNumber(result.budgetEstimate.estimatedAnnualRevenueImpact)}
            </dd>
            <dt>ROI</dt>
            <dd>{result.budgetEstimate.roiPercent}%</dd>
          </dl>
        </ReportPanel>

        <ReportPanel title="ROI Assumptions">
          <ul className="dense-list">
            {result.budgetEstimate.roiAssumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </ReportPanel>

        <ReportPanel title="Visual Risk Matrix" wide>
          <p>{result.riskMatrix.summary}</p>
          <RiskMatrixView result={result} />
        </ReportPanel>

        <ReportPanel title="Memory Agent">
          <p>{result.memoryDigest.summary}</p>
          <h3>Previous Analysis Found</h3>
          <dl>
            <dt>Last Analysis</dt>
            <dd>{result.memoryDigest.lastAnalyzedAt ? formatDate(result.memoryDigest.lastAnalyzedAt) : "No previous match"}</dd>
            <dt>Previous Score</dt>
            <dd>{result.memoryDigest.previousScore ?? "N/A"}</dd>
            <dt>Current Score</dt>
            <dd>{result.memoryDigest.currentScore}</dd>
            <dt>Score Change</dt>
            <dd>{result.memoryDigest.scoreDelta === undefined ? "N/A" : signedNumber(result.memoryDigest.scoreDelta)}</dd>
          </dl>
          <ul className="memory-list">
            {result.memoryDigest.recentRecords.map((record) => (
              <li key={`${record.companyName}-${record.savedAt}`}>
                <div>
                  <strong>{record.companyName}</strong>
                  <small>{record.proposalTitle}</small>
                </div>
                <span>{record.score}/100</span>
              </li>
            ))}
          </ul>
          <dl>
            <dt>Saved</dt>
            <dd>{result.memoryDigest.saved ? "yes" : "no"}</dd>
            <dt>Recent records</dt>
            <dd>{result.memoryDigest.recentCount}</dd>
          </dl>
        </ReportPanel>

        <ReportPanel title="Agent Discussion" wide>
          <div className="discussion-list">
            {result.agentDiscussion.map((entry) => (
              <div className="discussion-entry" key={`${entry.agent}-${entry.message}`}>
                <strong>{entry.agent}</strong>
                <p>{entry.message}</p>
              </div>
            ))}
          </div>
        </ReportPanel>

        <ReportPanel title="Human Approval" wide>
          <div className={`approval-banner ${approvalStatus}`}>
            <strong>{approvalStatus === "approved" ? "Final Proposal Approved" : approvalStatus === "revision_requested" ? "Revision Requested" : "Human Approval Required"}</strong>
            <span>
              {approvalStatus === "approved"
                ? "The proposal is ready to send."
                : approvalStatus === "revision_requested"
                  ? "Manager Agent will use the feedback checkpoint before final delivery."
                  : "Approve the proposal or request revision before final outreach."}
            </span>
          </div>
          <div className="button-row">
            <button onClick={onApprove} type="button">
              <CheckCircle2 size={16} />
              Approve Proposal
            </button>
            <button onClick={onRequestRevision} type="button">
              <RefreshCw size={16} />
              Request Revision
            </button>
          </div>
        </ReportPanel>

        <ReportPanel title="30-Day Action Plan" wide>
          <div className="action-plan-grid">
            {result.actionPlan.weeks.map((week) => (
              <div className="action-week" key={week.week}>
                <span>Week {week.week}</span>
                <h3>{week.title}</h3>
                <ul className="dense-list">
                  {week.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
                <p>{week.successMetric}</p>
              </div>
            ))}
          </div>
        </ReportPanel>

        <ReportPanel title={approvalStatus === "approved" ? "Final Proposal" : "Proposal Draft"} wide>
          <h3>{result.proposalDraft.title}</h3>
          <p>{result.proposalDraft.executiveSummary}</p>
          <ol className="work-plan">
            {result.proposalDraft.workPlan.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </ReportPanel>

        <ReportPanel title="Outreach Email" wide>
          <pre className="email-preview">{result.proposalDraft.emailDraft}</pre>
        </ReportPanel>

        <ReportPanel title="Recommended Next Steps">
          <ul className="dense-list">
            {result.recommendedNextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </ReportPanel>
      </div>
    </section>
  );
}

function RiskMatrixView({ result }: { result: LeadPilotAnalysisResult }) {
  const quadrants = [
    {
      title: "High Impact / Low Effort",
      items: result.riskMatrix.items.filter((item) => item.impact === "high" && item.effort === "low")
    },
    {
      title: "High Impact / High Effort",
      items: result.riskMatrix.items.filter((item) => item.impact === "high" && item.effort !== "low")
    },
    {
      title: "Low Impact / Low Effort",
      items: result.riskMatrix.items.filter((item) => item.impact !== "high" && item.effort === "low")
    },
    {
      title: "Low Impact / High Effort",
      items: result.riskMatrix.items.filter((item) => item.impact !== "high" && item.effort !== "low")
    }
  ];

  return (
    <div className="risk-matrix">
      {quadrants.map((quadrant) => (
        <div className="risk-quadrant" key={quadrant.title}>
          <h3>{quadrant.title}</h3>
          {quadrant.items.length ? (
            quadrant.items.map((item) => (
              <div className="risk-item" key={item.initiative}>
                <strong>{item.initiative}</strong>
                <span>
                  {item.impact} impact / {item.effort} effort
                </span>
                <p>{item.rationale}</p>
              </div>
            ))
          ) : (
            <p className="empty-quadrant">No initiative in this quadrant.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function AskReportPanel({ result }: { result: LeadPilotAnalysisResult }) {
  const [question, setQuestion] = useState("What should we sell first?");
  const [answer, setAnswer] = useState<ReportAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  async function askReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAsking(true);
    setAskError(null);
    try {
      const response = await fetch("/api/ask-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question,
          reportMarkdown: result.finalReport.markdown,
          companyName: result.businessSummary.companyName
        })
      });
      const payload = (await response.json()) as AskReportResponse;
      if (!payload.ok) {
        throw new Error(payload.error);
      }
      setAnswer(payload.answer);
    } catch (caught) {
      setAskError(caught instanceof Error ? caught.message : "Ask this report failed.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <ReportPanel title="Ask This Report" wide>
      <form className="ask-report" onSubmit={askReport}>
        <input
          aria-label="Question about this report"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about score, budget, next step, or proposal angle"
        />
        <button disabled={asking || question.trim().length < 3} type="submit">
          {asking ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
          Ask
        </button>
      </form>
      {askError ? <p className="error-line">{askError}</p> : null}
      {answer ? (
        <div className="ask-answer">
          <p>{answer.answer}</p>
          <div>
            <strong>Citations</strong>
            {answer.citations.map((citation) => (
              <span key={citation}>{citation}</span>
            ))}
          </div>
          <ul className="dense-list">
            {answer.followUpQuestions.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="field-help">Qwen answers questions using the generated report as context.</p>
      )}
    </ReportPanel>
  );
}

function ReportPanel({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <article className={`${wide ? "report-panel wide" : "report-panel"} transition-colors duration-200`}>
      <h2>{title}</h2>
      {children}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric shadow-sm">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScoreVisual({ score, compact = false }: { score: number; compact?: boolean }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className={compact ? "score-visual compact" : "metric score-visual shadow-sm"}>
      <span>Opportunity Score</span>
      <strong>{safeScore}/100</strong>
      <div className="score-bar" aria-label={`Opportunity score ${safeScore} out of 100`}>
        <i style={{ width: `${safeScore}%` }} />
      </div>
    </div>
  );
}

function parseSocialUrls(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ].slice(0, 5);
}

function agentStatusClass(status: string) {
  if (status === "Complete") return "complete";
  if (status === "Running...") return "running";
  if (status === "Failed") return "failed";
  return "pending";
}

function agentStatusLabel(status: AnalysisJobAgent["status"]) {
  if (status === "completed") return "Complete";
  if (status === "running") return "Running...";
  if (status === "failed") return "Failed";
  return "Pending";
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function signedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}
