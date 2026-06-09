"use client";

import { Copy, Download, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LEADPILOT_MARK_PATH } from "../../lib/brand";
import { downloadLeadPilotPdf } from "../../lib/pdf-report";
import type { LeadPilotAnalysisResult } from "../../lib/types";

type HistoryRecord = {
  id?: string;
  companyName: string;
  score: number;
  sourceUrl: string;
  finalUrl: string;
  savedAt: string;
  proposalTitle: string;
  proposalSummary: string;
  result?: LeadPilotAnalysisResult;
};

type HistoryResponse =
  | { ok: true; storage: "postgres" | "jsonl"; records: HistoryRecord[] }
  | { ok: false; error: string };

type HistoryDetailResponse =
  | { ok: true; record: HistoryRecord & { result?: LeadPilotAnalysisResult } }
  | { ok: false; error: string };

export default function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [storage, setStorage] = useState<"postgres" | "jsonl">("jsonl");
  const [selected, setSelected] = useState<HistoryRecord | null>(null);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  const selectedA = useMemo(() => records.find((record) => record.id === compareA), [compareA, records]);
  const selectedB = useMemo(() => records.find((record) => record.id === compareB), [compareB, records]);

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/history", { cache: "no-store" });
      const payload = (await response.json()) as HistoryResponse;
      if (!payload.ok) throw new Error(payload.error);
      setRecords(payload.records);
      setStorage(payload.storage);
      setCompareA(payload.records.find((record) => record.id)?.id ?? "");
      setCompareB(payload.records.filter((record) => record.id)[1]?.id ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  }

  async function openRecord(record: HistoryRecord) {
    if (!record.id) {
      setSelected(record);
      setCopiedReport(false);
      return;
    }
    setError(null);
    const response = await fetch(`/api/history/${encodeURIComponent(record.id)}`, { cache: "no-store" });
    const payload = (await response.json()) as HistoryDetailResponse;
    if (!payload.ok) {
      setError(payload.error);
      setSelected(record);
      setCopiedReport(false);
      return;
    }
    setSelected(payload.record);
    setCopiedReport(false);
  }

  function exportSelectedPdf() {
    if (selected?.result) {
      void downloadLeadPilotPdf(selected.result, "pending");
    }
  }

  async function copySelectedReport() {
    if (!selected?.result) return;
    try {
      await navigator.clipboard.writeText(selected.result.finalReport.markdown);
      setCopiedReport(true);
    } catch {
      setError("Could not copy the saved report.");
    }
  }

  return (
    <main className="app-shell history-page">
      <section className="workspace">
        <header className="topbar">
          <div className="brand-lockup">
            <Link className="brand-home-link" href="/" aria-label="Go to LeadPilot AI home">
              <img className="brand-mark" src={LEADPILOT_MARK_PATH} alt="" width={72} height={72} aria-hidden="true" />
            </Link>
            <div>
              <p className="eyebrow">LeadPilot AI Memory</p>
              <h1>Analysis History</h1>
            </div>
          </div>
          <Link className="provider-pill" href="/">
            Back to Analyzer
          </Link>
        </header>

        <section className="history-dashboard">
          <div className="history-summary-card">
            <span>Storage</span>
            <strong>{storage === "postgres" ? "Cloud Postgres" : "Local JSONL"}</strong>
          </div>
          <div className="history-summary-card">
            <span>Saved Analyses</span>
            <strong>{records.length}</strong>
          </div>
          <div className="history-summary-card">
            <span>Average Score</span>
            <strong>{records.length ? Math.round(records.reduce((sum, record) => sum + record.score, 0) / records.length) : 0}/100</strong>
          </div>
          <button disabled={loading} onClick={loadHistory} type="button">
            <RefreshCw className={loading ? "spin" : ""} size={16} />
            Refresh
          </button>
        </section>

        {error ? <p className="error-line">{error}</p> : null}

        <section className="history-layout">
          <article className="report-panel history-table-panel">
            <h2>Companies Analyzed</h2>
            <div className="history-table">
              <div className="history-table-head">
                <span>Company</span>
                <span>Score</span>
                <span>Date</span>
                <span>Action</span>
              </div>
              {records.map((record) => (
                <div className="history-table-row" key={`${record.companyName}-${record.savedAt}`}>
                  <div>
                    <strong>{record.companyName}</strong>
                    <small>{record.proposalTitle || record.sourceUrl}</small>
                  </div>
                  <span>{record.score}/100</span>
                  <span>{formatDate(record.savedAt)}</span>
                  <button onClick={() => openRecord(record)} type="button">
                    Open Report
                  </button>
                </div>
              ))}
            </div>
          </article>

          <aside className="report-panel history-detail-panel">
            <h2>Saved Report</h2>
            {selected ? (
              <>
                <h3>{selected.companyName}</h3>
                <p>{selected.proposalSummary || "Older local memory record does not include a full proposal summary."}</p>
                <dl>
                  <dt>Score</dt>
                  <dd>{selected.score}/100</dd>
                  <dt>Saved</dt>
                  <dd>{formatDate(selected.savedAt)}</dd>
                  <dt>Source</dt>
                  <dd>
                    <a href={selected.finalUrl || selected.sourceUrl} rel="noreferrer" target="_blank">
                      <ExternalLink size={14} />
                      {selected.finalUrl || selected.sourceUrl}
                    </a>
                  </dd>
                </dl>
                <div className="history-action-row">
                  <button disabled={!selected.result} onClick={copySelectedReport} type="button">
                    <Copy size={16} />
                    {copiedReport ? "Copied" : "Copy Report"}
                  </button>
                  <button disabled={!selected.result} onClick={exportSelectedPdf} type="button">
                    <Download size={16} />
                    Export Previous PDF
                  </button>
                </div>
                {!selected.result ? <p className="field-help">Older memory records may not include the full report payload.</p> : null}
              </>
            ) : (
              <p>Select an analysis to inspect its saved report.</p>
            )}
          </aside>
        </section>

        <section className="report-panel history-compare-panel">
          <h2>Compare Analyses</h2>
          <div className="compare-controls">
            <select value={compareA} onChange={(event) => setCompareA(event.target.value)}>
              <option value="">Select first analysis</option>
              {records
                .filter((record) => record.id)
                .map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.companyName} - {record.score}/100
                  </option>
                ))}
            </select>
            <select value={compareB} onChange={(event) => setCompareB(event.target.value)}>
              <option value="">Select second analysis</option>
              {records
                .filter((record) => record.id)
                .map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.companyName} - {record.score}/100
                  </option>
                ))}
            </select>
          </div>
          {selectedA && selectedB ? (
            <div className="compare-grid">
              <CompareCard record={selectedA} />
              <CompareCard record={selectedB} />
              <div className="compare-delta">
                <span>Score Delta</span>
                <strong>{signedNumber(selectedB.score - selectedA.score)}</strong>
              </div>
            </div>
          ) : (
            <p className="field-help">Choose two saved analyses with IDs to compare score movement.</p>
          )}
        </section>

        {selected?.result ? <SavedReportExplorer result={selected.result} /> : null}
      </section>
    </main>
  );
}

function SavedReportExplorer({ result }: { result: LeadPilotAnalysisResult }) {
  return (
    <section className="report-panel history-report-panel">
      <div className="history-report-head">
        <div>
          <p className="eyebrow">Saved Full Report</p>
          <h2>{result.finalReport.title}</h2>
          <span>{formatDate(result.finalReport.generatedAt)}</span>
        </div>
        <a href={result.finalUrl || result.sourceUrl} rel="noreferrer" target="_blank">
          <ExternalLink size={14} />
          Open Source
        </a>
      </div>

      <div className="history-info-grid">
        <InfoCard label="Company" value={result.businessSummary.companyName} detail={result.businessSummary.category} />
        <InfoCard label="Opportunity Score" value={`${result.salesOpportunityScore.score}/100`} detail={result.salesOpportunityScore.recommendedAngle} />
        <InfoCard
          label="Budget"
          value={`${result.budgetEstimate.currency} ${formatNumber(result.budgetEstimate.min)}-${formatNumber(result.budgetEstimate.max)}`}
          detail={`${result.budgetEstimate.roiPercent}% projected ROI`}
        />
        <InfoCard label="Confidence" value={`${result.analysisConfidence.score}%`} detail={result.analysisConfidence.level} />
      </div>

      <div className="history-report-grid">
        <article>
          <h3>Business Information</h3>
          <dl className="history-report-dl">
            <dt>Target Customer</dt>
            <dd>{result.businessSummary.targetCustomer}</dd>
            <dt>Value Proposition</dt>
            <dd>{result.businessSummary.valueProposition}</dd>
            <dt>Final URL</dt>
            <dd>{result.finalUrl}</dd>
          </dl>
          {result.socialUrls.length ? (
            <>
              <h3>Social Sources</h3>
              <ul className="source-list">
                {result.socialUrls.map((socialUrl) => (
                  <li key={socialUrl}>
                    <a href={socialUrl} rel="noreferrer" target="_blank">
                      <ExternalLink size={14} />
                      {socialUrl}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </article>

        <article>
          <h3>Detected Problems</h3>
          <ul className="dense-list">
            {result.detectedProblems.map((problem) => (
              <li key={problem.title}>
                <strong>{problem.title}</strong>
                {problem.description}
              </li>
            ))}
          </ul>
        </article>

        <article>
          <h3>Proposal</h3>
          <p>{result.proposalDraft.executiveSummary}</p>
          <ul className="dense-list">
            {result.proposalDraft.recommendedScope.map((scope) => (
              <li key={scope}>{scope}</li>
            ))}
          </ul>
        </article>

        <article>
          <h3>Next Steps</h3>
          <ul className="dense-list">
            {result.recommendedNextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="history-markdown-report">
        <h3>Complete Report</h3>
        <div>
          {result.finalReport.sections.map((section, index) => (
            <section key={`${section.heading}-${index}`}>
              <h4>{section.heading}</h4>
              <p>{section.content}</p>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfoCard({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="history-info-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function CompareCard({ record }: { record: HistoryRecord }) {
  return (
    <div className="compare-card">
      <strong>{record.companyName}</strong>
      <span>{record.score}/100</span>
      <small>{formatDate(record.savedAt)}</small>
      <p>{record.proposalTitle || record.sourceUrl}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function signedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}
