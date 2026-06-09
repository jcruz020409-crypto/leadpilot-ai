import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("HomePage loading button", () => {
  it("keeps Analyze button icons mounted to avoid DOM insertBefore errors", () => {
    const source = readFileSync(path.join(process.cwd(), "apps/web/src/app/page.tsx"), "utf8");

    expect(source).toContain('className="button-icon-stack"');
    expect(source).toContain('className={loading ? "icon-visible spin" : "icon-hidden spin"}');
    expect(source).toContain('className={loading ? "icon-hidden" : "icon-visible"}');
    expect(source).not.toContain("loading ? <Loader2");
  });

  it("exports the report as a PDF instead of Markdown", () => {
    const pageSource = readFileSync(path.join(process.cwd(), "apps/web/src/app/page.tsx"), "utf8");
    const pdfSource = readFileSync(path.join(process.cwd(), "apps/web/src/lib/pdf-report.ts"), "utf8");

    expect(pageSource).toContain('import { downloadLeadPilotPdf } from "../lib/pdf-report";');
    expect(pageSource).toContain("downloadLeadPilotPdf(result, approvalStatus)");
    expect(pdfSource).toContain('import { jsPDF } from "jspdf";');
    expect(pdfSource).toContain("Enterprise Opportunity");
    expect(pdfSource).toContain("Assessment");
    expect(pdfSource).toContain("Executive Dashboard");
    expect(pdfSource).toContain("drawMetricGrid");
    expect(pdfSource).toContain("drawExecutiveDashboard");
    expect(pdfSource).toContain("drawRadarChart");
    expect(pdfSource).toContain("Enterprise Maturity Radar");
    expect(pdfSource).toContain("drawCompetitorMatrix");
    expect(pdfSource).toContain("Competitor Matrix");
    expect(pdfSource).toContain("drawTimelineRoadmap");
    expect(pdfSource).toContain("Opportunity Heatmap");
    expect(pdfSource).toContain("Enterprise Maturity Factor");
    expect(pdfSource).toContain("Recommended Enterprise Motion");
    expect(pdfSource).toContain("Competitor Agent");
    expect(pdfSource).toContain("Industry Benchmarks");
    expect(pdfSource).toContain("Analysis Confidence");
    expect(pdfSource).toContain("Cost Breakdown");
    expect(pdfSource).toContain("Visual Risk Matrix");
    expect(pdfSource).toContain("30-Day Action Plan");
    expect(pdfSource).toContain("No affiliation with external consulting firms.");
    expect(pageSource).not.toContain('type: "text/markdown;charset=utf-8"');
    expect(pdfSource).not.toContain("-leadpilot-report.md");
  });

  it("keeps the intake form in English and includes optional social URLs", () => {
    const source = readFileSync(path.join(process.cwd(), "apps/web/src/app/page.tsx"), "utf8");

    expect(source).toContain('useState("")');
    expect(source).toContain("Social Media URLs");
    expect(source).toContain("LinkedIn, X/Twitter, Facebook, Instagram, YouTube, or other public profiles.");
    expect(source).toContain("SOCIAL_URL_PRESETS");
    expect(source).toContain("SOCIAL_PLACEHOLDER");
    expect(source).toContain("https://www.linkedin.com/company/example");
    expect(source).toContain("https://x.com/example");
    expect(source).toContain("https://www.instagram.com/example");
    expect(source).toContain("X / Twitter");
    expect(source).toContain("social-presets");
    expect(source).toContain("parseSocialUrls(socialUrlsText)");
    expect(source).toContain('placeholder="https://example.com"');
    expect(source).toContain("Add a company website URL, at least one social media URL, or both.");
    expect(source).toContain("You can also analyze social media only when a website is not available.");
    expect(source).not.toContain("placeholder=\"https://example.com\"\n              required");
  });

  it("shows agent society, visual score, ROI, and memory panels", () => {
    const source = readFileSync(path.join(process.cwd(), "apps/web/src/app/page.tsx"), "utf8");

    expect(source).toContain("AgentStatusStrip");
    expect(source).toContain("Running...");
    expect(source).toContain("Pending");
    expect(source).toContain("Complete");
    expect(source).toContain("Failed");
    expect(source).toContain("Agent Discussion");
    expect(source).toContain("ScoreVisual");
    expect(source).toContain("Estimated Annual Revenue Impact");
    expect(source).toContain("ROI");
    expect(source).toContain("Previous Analysis Found");
    expect(source).toContain("recentRecords");
    expect(source).toContain("Human Approval");
    expect(source).toContain("Approve Proposal");
    expect(source).toContain("Request Revision");
    expect(source).toContain("Final Proposal");
    expect(source).toContain("Agent Conflict Resolution");
    expect(source).toContain("Opportunity Heatmap");
    expect(source).toContain("heatmap-list");
    expect(source).toContain("Enterprise Maturity Factor");
    expect(source).toContain("maturity-list");
    expect(source).toContain("recommendedMotion");
    expect(source).toContain("Competitor Agent");
    expect(source).toContain("competitor-grid");
    expect(source).toContain("Industry Benchmarks");
    expect(source).toContain("benchmark-list");
    expect(source).toContain("Analysis Confidence");
    expect(source).toContain("confidence-evidence");
    expect(source).toContain("Cost Breakdown");
    expect(source).toContain("cost-breakdown");
    expect(source).toContain("Visual Risk Matrix");
    expect(source).toContain("risk-matrix");
    expect(source).toContain("30-Day Action Plan");
    expect(source).toContain("action-plan-grid");
    expect(source).toContain("Live Agent Chat");
    expect(source).toContain("Competitor");
    expect(source).toContain("Analysis History");
    expect(source).toContain('href="/history"');
    expect(source).not.toContain("HistoryStrip");
    expect(source).not.toContain("history-strip");
    expect(source).not.toContain('fetch("/api/history"');
    expect(source).toContain("/api/analyze/jobs");
    expect(source).toContain("pollAnalysisJob");
    expect(source).toContain("currentJob");
    expect(source).toContain("Ask This Report");
    expect(source).toContain("/api/ask-report");
    expect(source).toContain("Search Provider");
    expect(source).toContain("Exa live search");
    expect(source).toContain("AGENT_META");
    expect(source).toContain("agent-icon");
    expect(source).toContain('tone: "sky"');
    expect(source).toContain("tone-${meta.tone}");
  });
});
