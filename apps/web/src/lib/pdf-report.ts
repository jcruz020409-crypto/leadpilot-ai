import { jsPDF } from "jspdf";
import { LEADPILOT_LOGO_PATH } from "./brand";
import type { LeadPilotAnalysisResult } from "./types";

export type ReportApprovalStatus = "pending" | "approved" | "revision_requested";

type PdfDoc = InstanceType<typeof jsPDF>;
type RGB = [number, number, number];
type LeadPilotPdfOptions = {
  brandLogoDataUrl?: string;
};

const palette = {
  navy: [7, 17, 31] as RGB,
  slate: [47, 60, 76] as RGB,
  muted: [83, 97, 115] as RGB,
  line: [219, 227, 234] as RGB,
  surface: [248, 250, 252] as RGB,
  blue: [3, 105, 161] as RGB,
  teal: [15, 118, 110] as RGB,
  gold: [183, 121, 31] as RGB,
  rose: [180, 35, 24] as RGB,
  white: [255, 255, 255] as RGB
};

const page = {
  margin: 42,
  width: 595.28,
  height: 841.89
};
const brandLogoAspectRatio = 960 / 364;

export async function downloadLeadPilotPdf(result: LeadPilotAnalysisResult, approvalStatus: ReportApprovalStatus) {
  const doc = buildLeadPilotPdf(result, approvalStatus, {
    brandLogoDataUrl: await loadBrandLogoDataUrl()
  });
  doc.save(`${fileBaseName(result.businessSummary.companyName)}-leadpilot-strategy-report.pdf`);
}

export function buildLeadPilotPdf(result: LeadPilotAnalysisResult, approvalStatus: ReportApprovalStatus, options: LeadPilotPdfOptions = {}) {
  const doc = new jsPDF({ format: "a4", unit: "pt" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = page.margin;
  const contentWidth = width - margin * 2;
  let y = margin;

  const setColor = (color: RGB, target: "text" | "fill" | "draw" = "text") => {
    if (target === "text") doc.setTextColor(...color);
    if (target === "fill") doc.setFillColor(...color);
    if (target === "draw") doc.setDrawColor(...color);
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > height - margin - 34) {
      doc.addPage();
      y = margin + 28;
      drawPageChrome(doc, doc.getNumberOfPages(), result.businessSummary.companyName, options.brandLogoDataUrl);
    }
  };

  const addText = (
    text: string,
    options: {
      x?: number;
      width?: number;
      size?: number;
      style?: "normal" | "bold";
      color?: RGB;
      gap?: number;
      lineHeight?: number;
    } = {}
  ) => {
    const size = options.size ?? 10;
    const lineHeight = options.lineHeight ?? size * 1.42;
    const textWidth = options.width ?? contentWidth;
    const lines = doc.splitTextToSize(cleanText(text), textWidth) as string[];

    doc.setFont("helvetica", options.style ?? "normal");
    doc.setFontSize(size);
    setColor(options.color ?? palette.slate);

    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, options.x ?? margin, y);
      y += lineHeight;
    }
    y += options.gap ?? 8;
  };

  const addSectionTitle = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 56 : 34);
    setColor(palette.blue, "fill");
    doc.circle(margin + 3, y - 4, 3.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    setColor(palette.navy);
    doc.text(cleanText(title), margin + 14, y);
    y += 17;
    if (subtitle) {
      addText(subtitle, { x: margin + 14, width: contentWidth - 14, size: 9.5, color: palette.muted, gap: 5 });
    } else {
      y += 7;
    }
  };

  const addInsightCard = (title: string, body: string, options: { accent?: RGB; label?: string } = {}) => {
    const bodyLines = doc.splitTextToSize(cleanText(body), contentWidth - 36) as string[];
    const cardHeight = Math.max(70, 31 + bodyLines.length * 13.5 + (options.label ? 16 : 0));
    ensureSpace(cardHeight + 10);
    setColor(palette.white, "fill");
    setColor(palette.line, "draw");
    doc.roundedRect(margin, y, contentWidth, cardHeight, 6, 6, "FD");
    setColor(options.accent ?? palette.blue, "fill");
    doc.rect(margin, y, 4, cardHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    setColor(palette.navy);
    doc.text(cleanText(title), margin + 18, y + 20);
    if (options.label) {
      drawPill(doc, margin + contentWidth - 104, y + 10, 86, 18, options.label, options.accent ?? palette.blue);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    setColor(palette.slate);
    doc.text(bodyLines, margin + 18, y + 38);
    y += cardHeight + 10;
  };

  doc.setProperties({
    title: `${result.businessSummary.companyName} - LeadPilot AI Strategy Report`,
    subject: "Multi-agent commercial opportunity analysis",
    author: "LeadPilot AI",
    creator: "LeadPilot AI powered by Qwen Cloud"
  });

  drawCover(doc, result, approvalStatus, options.brandLogoDataUrl);
  doc.addPage();
  y = margin + 28;
  drawPageChrome(doc, 2, result.businessSummary.companyName, options.brandLogoDataUrl);

  addSectionTitle("Executive Dashboard", "Page-one board view of commercial upside, investment range, ROI, and confidence.");
  ensureSpace(190);
  drawExecutiveDashboard(doc, y, contentWidth, result);
  y += 176;

  ensureSpace(86);
  drawScoreBar(doc, margin, y, contentWidth, result.salesOpportunityScore.score, result.salesOpportunityScore.recommendedAngle);
  y += 72;

  ensureSpace(224);
  drawRadarChart(doc, y, contentWidth, result);
  y += 210;

  addInsightCard("Commercial Thesis", result.businessSummary.valueProposition, { accent: palette.blue, label: result.budgetEstimate.complexity.toUpperCase() });
  addInsightCard("Recommended Package", result.budgetEstimate.packageRecommendation, { accent: palette.teal });
  addInsightCard("Human Approval Checkpoint", approvalMessage(approvalStatus), { accent: approvalStatus === "approved" ? palette.teal : approvalStatus === "revision_requested" ? palette.gold : palette.blue });

  addSectionTitle("Enterprise Maturity Factor", "A consultative readiness metric that separates raw lead attractiveness from enterprise automation readiness.");
  addInsightCard(`${result.enterpriseMaturityFactor.level.replace("-", " ")} - ${result.enterpriseMaturityFactor.score}/100`, result.enterpriseMaturityFactor.summary, {
    accent: palette.teal
  });
  for (const dimension of result.enterpriseMaturityFactor.dimensions) {
    drawHeatmapRow(doc, dimension.name, dimension.score, dimension.rationale);
  }
  addBulletList("Positive Signals", result.enterpriseMaturityFactor.positiveSignals);
  addBulletList("Gaps To Validate", result.enterpriseMaturityFactor.gaps);
  addInsightCard("Recommended Enterprise Motion", result.enterpriseMaturityFactor.recommendedMotion, { accent: palette.gold });

  addSectionTitle("Competitor Agent", "Directional competitive intelligence for positioning, differentiation, and sales strategy.");
  addInsightCard("Positioning Summary", result.competitorAnalysis.positioningSummary, { accent: palette.blue });
  addInsightCard(
    "Competitor Search Mode",
    result.competitorAnalysis.searchProvider === "exa"
      ? `Exa live search supplied ${result.competitorAnalysis.searchSources?.length ?? 0} public source(s) for competitor grounding.`
      : "No live competitor search key was configured, so the analysis uses directional inference from company category, website evidence, and Qwen synthesis.",
    { accent: result.competitorAnalysis.searchProvider === "exa" ? palette.teal : palette.gold }
  );
  ensureSpace(competitorMatrixHeight(result) + 12);
  drawCompetitorMatrix(doc, y, contentWidth, result);
  y += competitorMatrixHeight(result);
  if (result.competitorAnalysis.searchSources?.length) {
    addBulletList(
      "Competitor Search Sources",
      result.competitorAnalysis.searchSources.map((source) => `${source.title}: ${source.url}`)
    );
  }
  addBulletList("Competitive Advantages", result.competitorAnalysis.competitiveAdvantages);
  addBulletList("Market Gaps", result.competitorAnalysis.marketGaps);

  addSectionTitle("Industry Benchmarks", "Directional benchmark gaps inferred from public signals and validated agent outputs.");
  addInsightCard(result.industryBenchmarks.industry, result.industryBenchmarks.summary, { accent: palette.gold });
  for (const metric of result.industryBenchmarks.metrics) {
    addInsightCard(
      metric.name,
      `Industry benchmark: ${metric.industryAverage}. Current estimate: ${metric.currentEstimate}. Gap: ${metric.gap}. ${metric.interpretation}`,
      { accent: palette.blue, label: metric.gap.toUpperCase() }
    );
  }

  addSectionTitle("Analysis Confidence", "Evidence summary that shows how much signal supported the final analysis.");
  addInsightCard(`${result.analysisConfidence.score}% Confidence`, result.analysisConfidence.reasons.join(" "), {
    accent: result.analysisConfidence.level === "high" ? palette.teal : result.analysisConfidence.level === "medium" ? palette.gold : palette.rose,
    label: result.analysisConfidence.level.toUpperCase()
  });
  addBulletList("Confidence Evidence", [
    `${result.analysisConfidence.evidence.sourceCount} source(s) analyzed.`,
    `${formatNumber(result.analysisConfidence.evidence.contentCharacters)} extracted character(s).`,
    `${result.analysisConfidence.evidence.socialProfilesFound} social profile(s) submitted.`,
    `${result.analysisConfidence.evidence.qwenValidatedAgents} validated agent output(s).`,
    `Structured data found: ${result.analysisConfidence.evidence.structuredDataFound ? "yes" : "no"}.`
  ]);

  addSectionTitle("Agent Society Resolution", "The Manager Agent synthesizes differences between specialized agents instead of hiding disagreement.");
  drawConflictPanel(doc, y, contentWidth, result);
  y += 116;
  addText(result.conflictResolution.reason, { size: 9.8, color: palette.slate, gap: 16 });

  addSectionTitle("Opportunity Heatmap", "Prioritized opportunity areas based on public website evidence and Qwen Cloud agent synthesis.");
  for (const item of result.opportunityHeatmap) {
    drawHeatmapRow(doc, item.area, item.score, item.rationale);
  }

  addSectionTitle("Detected Problems", "Issues the sales team can use as discovery anchors.");
  for (const problem of result.detectedProblems.slice(0, 6)) {
    addInsightCard(problem.title, `${problem.description} Impact: ${problem.businessImpact}`, { accent: palette.blue, label: `${Math.round(problem.confidence * 100)}% conf.` });
  }

  addSectionTitle("Cost Breakdown", "A more realistic investment model than a single budget line.");
  addInsightCard("Estimated Total", `${result.costBreakdown.currency} ${formatNumber(result.costBreakdown.total)}`, { accent: palette.gold, label: result.budgetEstimate.complexity.toUpperCase() });
  for (const item of result.costBreakdown.items) {
    addInsightCard(item.item, `${result.costBreakdown.currency} ${formatNumber(item.cost)}. ${item.rationale}`, { accent: palette.teal });
  }

  addSectionTitle("Visual Risk Matrix", "Prioritize initiatives by impact and effort before proposing implementation order.");
  addInsightCard("Prioritization Rule", result.riskMatrix.summary, { accent: palette.blue });
  for (const item of result.riskMatrix.items) {
    addInsightCard(
      item.initiative,
      `${item.impact} impact / ${item.effort} effort. ${item.rationale}`,
      { accent: item.impact === "high" && item.effort === "low" ? palette.teal : item.effort === "high" ? palette.gold : palette.blue }
    );
  }

  addSectionTitle("30-Day Action Plan", "A month-one operating plan that turns analysis into an executable pilot.");
  ensureSpace(204);
  drawTimelineRoadmap(doc, y, contentWidth, result);
  y += 190;

  addSectionTitle("Proposal Draft", "Client-ready scope, plan, investment positioning, and next step.");
  addInsightCard(result.proposalDraft.title, result.proposalDraft.executiveSummary, { accent: palette.teal });
  addBulletList("Recommended Scope", result.proposalDraft.recommendedScope);
  addBulletList("Work Plan", result.proposalDraft.workPlan);
  addInsightCard("Investment", result.proposalDraft.investment, { accent: palette.gold, label: result.proposalDraft.timeline });
  addInsightCard("Next Step", result.proposalDraft.nextStep, { accent: palette.blue });

  addSectionTitle("Memory Agent", "Persistence layer that compares this analysis with previously analyzed companies.");
  addInsightCard(
    result.memoryDigest.foundPrevious ? "Previous Analysis Found" : "No Previous Match",
    `${result.memoryDigest.summary} Previous score: ${result.memoryDigest.previousScore ?? "N/A"}. Current score: ${result.memoryDigest.currentScore}. Score change: ${
      result.memoryDigest.scoreDelta === undefined ? "N/A" : signedNumber(result.memoryDigest.scoreDelta)
    }.`,
    { accent: palette.teal }
  );
  for (const record of result.memoryDigest.recentRecords.slice(0, 4)) {
    drawSmallRecord(doc, record.companyName, record.proposalTitle, `${record.score}/100`);
  }

  addSectionTitle("Agent Discussion", "Transparent multi-agent reasoning trail for judges and technical reviewers.");
  for (const entry of result.agentDiscussion) {
    addInsightCard(entry.agent, entry.message, { accent: entry.agent.includes("Manager") ? palette.gold : palette.teal });
  }

  addSectionTitle("Outreach Email", "Ready-to-send first-touch message generated by the Proposal Agent.");
  addEmailBlock(result.proposalDraft.emailDraft);

  addSectionTitle("Recommended Next Steps", "Use these as the close-out actions in the demo.");
  addBulletList("Next Actions", result.recommendedNextSteps);

  addSectionTitle("AI Execution Trace", "Evidence that the workflow uses specialized agents, structured outputs, validation, and Qwen Cloud provider calls.");
  drawTraceTable(doc, result);

  drawAllFooters(doc, result.businessSummary.companyName);
  return doc;

  function addBulletList(title: string, items: string[]) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setColor(palette.navy);
    doc.text(cleanText(title), margin, y);
    y += 17;
    for (const item of items.slice(0, 8)) {
      const lines = doc.splitTextToSize(cleanText(item), contentWidth - 18) as string[];
      ensureSpace(lines.length * 13 + 8);
      setColor(palette.blue, "fill");
      doc.circle(margin + 4, y - 4, 2.2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.4);
      setColor(palette.slate);
      doc.text(lines, margin + 14, y);
      y += lines.length * 13 + 7;
    }
    y += 4;
  }

  function addEmailBlock(email: string) {
    const lines = doc.splitTextToSize(cleanText(email), contentWidth - 30) as string[];
    const lineHeight = 12;
    let index = 0;
    while (index < lines.length) {
      const available = Math.floor((height - margin - y - 34) / lineHeight);
      const take = Math.max(6, Math.min(available, lines.length - index));
      const blockHeight = take * lineHeight + 28;
      ensureSpace(blockHeight + 8);
      setColor(palette.navy, "fill");
      doc.roundedRect(margin, y, contentWidth, blockHeight, 6, 6, "F");
      doc.setFont("courier", "normal");
      doc.setFontSize(8.8);
      setColor([238, 247, 255]);
      doc.text(lines.slice(index, index + take), margin + 15, y + 20);
      y += blockHeight + 10;
      index += take;
    }
  }

  function drawHeatmapRow(docRef: PdfDoc, area: string, score: number, rationale: string) {
    const scoreValue = clampScore(score);
    const lines = docRef.splitTextToSize(cleanText(rationale), contentWidth - 186) as string[];
    const rowHeight = Math.max(48, 24 + lines.length * 12);
    ensureSpace(rowHeight + 8);
    setColor(palette.white, "fill");
    setColor(palette.line, "draw");
    docRef.roundedRect(margin, y, contentWidth, rowHeight, 6, 6, "FD");
    docRef.setFont("helvetica", "bold");
    docRef.setFontSize(9.6);
    setColor(palette.navy);
    docRef.text(cleanText(area), margin + 12, y + 19);
    docRef.setFont("helvetica", "bold");
    docRef.setFontSize(9.4);
    docRef.text(`${scoreValue}/100`, margin + contentWidth - 52, y + 19);
    drawBar(docRef, margin + 136, y + 13, contentWidth - 205, 9, scoreValue, palette.teal);
    docRef.setFont("helvetica", "normal");
    docRef.setFontSize(8.8);
    setColor(palette.muted);
    docRef.text(lines, margin + 136, y + 33);
    y += rowHeight + 8;
  }

  function drawSmallRecord(docRef: PdfDoc, name: string, title: string, score: string) {
    ensureSpace(42);
    setColor(palette.surface, "fill");
    setColor(palette.line, "draw");
    docRef.roundedRect(margin, y, contentWidth, 36, 6, 6, "FD");
    docRef.setFont("helvetica", "bold");
    docRef.setFontSize(9.4);
    setColor(palette.navy);
    docRef.text(cleanText(name), margin + 12, y + 15);
    docRef.setFont("helvetica", "normal");
    docRef.setFontSize(8);
    setColor(palette.muted);
    docRef.text(cleanText(oneLine(title, 72)), margin + 12, y + 27);
    docRef.setFont("helvetica", "bold");
    docRef.setFontSize(10);
    setColor(palette.teal);
    docRef.text(score, margin + contentWidth - 52, y + 21);
    y += 42;
  }

  function drawTraceTable(docRef: PdfDoc, report: LeadPilotAnalysisResult) {
    const columns = [90, 80, 84, 76, 60, 58];
    const headers = ["Agent", "Provider", "Model", "Format", "Latency", "Valid"];
    const startX = margin;
    const rowHeight = 24;
    ensureSpace(34 + report.agentRuns.length * rowHeight);
    setColor(palette.navy, "fill");
    docRef.roundedRect(startX, y, contentWidth, rowHeight, 5, 5, "F");
    docRef.setFont("helvetica", "bold");
    docRef.setFontSize(7.8);
    setColor(palette.white);
    let x = startX + 8;
    headers.forEach((header, index) => {
      docRef.text(header, x, y + 15);
      x += columns[index];
    });
    y += rowHeight;

    for (const run of report.agentRuns) {
      ensureSpace(rowHeight);
      setColor(palette.white, "fill");
      setColor(palette.line, "draw");
      docRef.rect(startX, y, contentWidth, rowHeight, "FD");
      docRef.setFont("helvetica", "normal");
      docRef.setFontSize(7.8);
      setColor(palette.slate);
      x = startX + 8;
      [
        run.agent,
        run.provider,
        run.model,
        run.responseFormat,
        `${run.latencyMs}ms`,
        run.outputValidated ? "yes" : "no"
      ].forEach((value, index) => {
        docRef.text(cleanText(oneLine(value, 18)), x, y + 15);
        x += columns[index];
      });
      y += rowHeight;
    }
    y += 10;
  }
}

function drawCover(doc: PdfDoc, result: LeadPilotAnalysisResult, approvalStatus: ReportApprovalStatus, brandLogoDataUrl?: string) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = page.margin;

  doc.setFillColor(...palette.navy);
  doc.rect(0, 0, width, height, "F");
  drawGradientBands(doc, 0, 0, width, 310, [palette.navy, palette.blue, palette.teal]);
  doc.setFillColor(255, 255, 255, 0.05);
  doc.circle(width - 92, 96, 132, "F");
  doc.setFillColor(255, 255, 255, 0.07);
  doc.circle(width - 142, 212, 88, "F");
  doc.setFillColor(...palette.white);
  doc.rect(0, 310, width, height - 310, "F");

  const brandLogoDrawn = drawBrandLogoCard(doc, brandLogoDataUrl, margin, 30, 260, 94);
  if (!brandLogoDrawn) {
    drawLeadPilotLogo(doc, margin, 44, 34);
  }
  drawCompanyMark(doc, width - margin - 56, 44, 56, result.businessSummary.companyName);

  if (!brandLogoDrawn) {
    doc.setTextColor(...palette.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("LeadPilot AI", margin + 44, 58);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("Multi-Agent AI Sales Autopilot powered by Qwen Cloud", margin + 44, 75);
  }

  drawPill(doc, width - margin - 184, 119, 132, 22, "Qwen Cloud live", palette.teal);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("Enterprise Opportunity", margin, 142);
  doc.text("Assessment", margin, 181);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(cleanText(result.businessSummary.companyName), margin, 214);
  doc.setFontSize(9.5);
  doc.text(cleanText(`${result.businessSummary.category} | ${formatReportMonth(result.finalReport.generatedAt)}`), margin, 235);

  doc.setFillColor(...palette.gold);
  doc.rect(margin, 268, width - margin * 2, 3, "F");

  const companyY = 368;
  doc.setTextColor(...palette.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Executive Dashboard", margin, companyY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...palette.muted);
  doc.text(cleanText(`${result.finalUrl} | ${result.businessSummary.targetCustomer}`), margin, companyY + 22);

  drawMetricGrid(doc, companyY + 50, width - margin * 2, [
    { label: "Opportunity Score", value: `${clampScore(result.salesOpportunityScore.score)}/100`, accent: palette.blue },
    { label: "ROI", value: `${result.budgetEstimate.roiPercent}%`, accent: result.budgetEstimate.roiPercent > 0 ? palette.teal : palette.rose },
    { label: "Budget", value: `${result.budgetEstimate.currency} ${formatNumber(averageBudget(result))}`, accent: palette.gold },
    { label: "Confidence", value: `${clampScore(result.analysisConfidence.score)}%`, accent: palette.blue },
    { label: "ROI", value: `${result.budgetEstimate.roiPercent}%`, accent: result.budgetEstimate.roiPercent > 0 ? palette.teal : palette.rose },
    { label: "Approval", value: approvalLabel(approvalStatus), accent: approvalStatus === "approved" ? palette.teal : palette.gold }
  ].slice(0, 4));

  doc.setFillColor(...palette.surface);
  doc.setDrawColor(...palette.line);
  doc.roundedRect(margin, 528, width - margin * 2, 128, 8, 8, "FD");
  doc.setFillColor(...palette.blue);
  doc.rect(margin, 528, 5, 128, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...palette.navy);
  doc.text("Executive Brief", margin + 18, 553);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...palette.slate);
  const brief = doc.splitTextToSize(cleanText(result.businessSummary.valueProposition), width - margin * 2 - 36) as string[];
  doc.text(brief.slice(0, 6), margin + 18, 574);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...palette.navy);
  doc.text("Recommended next move", margin, 706);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.6);
  doc.setTextColor(...palette.slate);
  const nextMove = doc.splitTextToSize(cleanText(result.proposalDraft.nextStep), width - margin * 2) as string[];
  doc.text(nextMove.slice(0, 3), margin, 727);

  doc.setDrawColor(...palette.line);
  doc.line(margin, height - 74, width - margin, height - 74);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...palette.muted);
  doc.text(`Generated ${cleanText(result.finalReport.generatedAt)}`, margin, height - 52);
  doc.text("LeadPilot AI | Agent Society / Autopilot Agent", width - margin - 186, height - 52);
}

function drawMetricGrid(doc: PdfDoc, y: number, totalWidth: number, metrics: Array<{ label: string; value: string; accent: RGB }>) {
  const margin = page.margin;
  const gap = 10;
  const cardWidth = (totalWidth - gap * (metrics.length - 1)) / metrics.length;
  metrics.forEach((metric, index) => {
    const x = margin + index * (cardWidth + gap);
    doc.setFillColor(...palette.white);
    doc.setDrawColor(...palette.line);
    doc.roundedRect(x, y, cardWidth, 82, 7, 7, "FD");
    doc.setFillColor(...metric.accent);
    doc.rect(x, y, cardWidth, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(...palette.muted);
    doc.text(cleanText(metric.label.toUpperCase()), x + 10, y + 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(metric.value.length > 16 ? 12 : 16);
    doc.setTextColor(...palette.navy);
    doc.text(cleanText(metric.value), x + 10, y + 52, { maxWidth: cardWidth - 18 });
  });
}

function drawExecutiveDashboard(doc: PdfDoc, y: number, contentWidth: number, result: LeadPilotAnalysisResult) {
  const x = page.margin;
  const gap = 12;
  const cardWidth = (contentWidth - gap * 3) / 4;
  const metrics = [
    { label: "Opportunity Score", value: String(clampScore(result.salesOpportunityScore.score)), suffix: "/100", color: palette.blue },
    { label: "Budget", value: `${result.budgetEstimate.currency} ${formatNumber(averageBudget(result))}`, suffix: "", color: palette.gold },
    { label: "ROI", value: `${result.budgetEstimate.roiPercent}%`, suffix: "", color: result.budgetEstimate.roiPercent > 0 ? palette.teal : palette.rose },
    { label: "Confidence", value: `${clampScore(result.analysisConfidence.score)}%`, suffix: "", color: palette.teal }
  ];

  doc.setFillColor(...palette.navy);
  doc.roundedRect(x, y, contentWidth, 152, 8, 8, "F");
  drawGradientBands(doc, x, y, contentWidth, 152, [palette.navy, palette.blue, palette.teal]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...palette.white);
  doc.text("EXECUTIVE DASHBOARD", x + 18, y + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Commercial case, implementation appetite, and AI-generated confidence signals.", x + 18, y + 39);

  metrics.forEach((metric, index) => {
    const cardX = x + 18 + index * (cardWidth + gap);
    const cardY = y + 58;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, cardY, cardWidth - 9, 78, 7, 7, "F");
    doc.setFillColor(...metric.color);
    doc.rect(cardX, cardY, cardWidth - 9, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    doc.setTextColor(...palette.muted);
    doc.text(metric.label.toUpperCase(), cardX + 10, cardY + 21);
    doc.setFontSize(metric.value.length > 12 ? 13 : 22);
    doc.setTextColor(...palette.navy);
    doc.text(cleanText(metric.value), cardX + 10, cardY + 52, { maxWidth: cardWidth - 25 });
    if (metric.suffix) {
      doc.setFontSize(9);
      doc.setTextColor(...palette.muted);
      doc.text(metric.suffix, cardX + cardWidth - 44, cardY + 52);
    }
  });
}

function drawRadarChart(doc: PdfDoc, y: number, contentWidth: number, result: LeadPilotAnalysisResult) {
  const x = page.margin;
  const centerX = x + 112;
  const centerY = y + 102;
  const radius = 68;
  const axes = radarDimensions(result);

  doc.setFillColor(...palette.surface);
  doc.setDrawColor(...palette.line);
  doc.roundedRect(x, y, contentWidth, 188, 8, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...palette.navy);
  doc.text("Enterprise Maturity Radar", x + 18, y + 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(...palette.muted);
  doc.text("Readiness profile synthesized from website evidence, agent outputs, and Qwen validation.", x + 18, y + 41);

  for (let ring = 1; ring <= 4; ring += 1) {
    const ringRadius = (radius * ring) / 4;
    const points = radarPoints(centerX, centerY, ringRadius, axes.map(() => 100));
    drawPolygon(doc, points, palette.line);
  }
  axes.forEach((_axis, index) => {
    const [endX, endY] = radarPoint(centerX, centerY, radius, index, axes.length, 100);
    doc.setDrawColor(...palette.line);
    doc.line(centerX, centerY, endX, endY);
  });

  const valuePoints = radarPoints(
    centerX,
    centerY,
    radius,
    axes.map((axis) => axis.score)
  );
  doc.setFillColor(3, 105, 161);
  doc.setDrawColor(...palette.blue);
  drawPolygon(doc, valuePoints, palette.blue);
  valuePoints.forEach(([pointX, pointY]) => {
    doc.setFillColor(...palette.teal);
    doc.circle(pointX, pointY, 3, "F");
  });

  const legendX = x + 242;
  axes.forEach((axis, index) => {
    const rowY = y + 58 + index * 25;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.7);
    doc.setTextColor(...palette.navy);
    doc.text(axis.label, legendX, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(axis.score >= 70 ? palette.teal : axis.score >= 45 ? palette.gold : palette.rose));
    doc.text(`${axis.score}/100`, legendX + 156, rowY);
    drawBar(doc, legendX, rowY + 7, contentWidth - 270, 6, axis.score, axis.score >= 70 ? palette.teal : axis.score >= 45 ? palette.gold : palette.rose);
  });
}

function drawCompetitorMatrix(doc: PdfDoc, y: number, contentWidth: number, result: LeadPilotAnalysisResult) {
  const x = page.margin;
  const tableY = y + 20;
  const rows = result.competitorAnalysis.competitors.slice(0, 5);
  const rowHeight = 34;
  const headerHeight = 28;
  const tableHeight = headerHeight + rows.length * rowHeight;
  const columns = [contentWidth * 0.4, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.2];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...palette.navy);
  doc.text("Competitor Matrix", x, y + 9);
  doc.setFillColor(...palette.navy);
  doc.roundedRect(x, tableY, contentWidth, headerHeight, 7, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.3);
  doc.setTextColor(...palette.white);
  let cursorX = x + 12;
  ["Competitor", "Threat", "Relevance", "Positioning"].forEach((header, index) => {
    doc.text(header.toUpperCase(), cursorX, tableY + 18);
    cursorX += columns[index];
  });

  rows.forEach((competitor, index) => {
    const rowY = tableY + headerHeight + index * rowHeight;
    doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
    doc.setDrawColor(...palette.line);
    doc.rect(x, rowY, contentWidth, rowHeight, "FD");
    cursorX = x + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.7);
    doc.setTextColor(...palette.navy);
    doc.text(cleanText(oneLine(competitor.name, 28)), cursorX, rowY + 20);
    cursorX += columns[0];
    drawLevelPill(doc, cursorX, rowY + 8, competitor.estimatedThreat);
    cursorX += columns[1];
    drawLevelPill(doc, cursorX, rowY + 8, competitor.relevance);
    cursorX += columns[2];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.7);
    doc.setTextColor(...palette.slate);
    doc.text(cleanText(oneLine(competitor.positioning, 42)), cursorX, rowY + 20, { maxWidth: columns[3] - 10 });
  });

  doc.setDrawColor(...palette.line);
  doc.roundedRect(x, tableY, contentWidth, tableHeight, 7, 7, "S");
}

function drawTimelineRoadmap(doc: PdfDoc, y: number, contentWidth: number, result: LeadPilotAnalysisResult) {
  const x = page.margin;
  const weeks = result.actionPlan.weeks.slice(0, 4);
  const gap = 10;
  const cardWidth = (contentWidth - gap * (weeks.length - 1)) / weeks.length;

  doc.setFillColor(...palette.surface);
  doc.setDrawColor(...palette.line);
  doc.roundedRect(x, y, contentWidth, 150, 8, 8, "FD");
  doc.setDrawColor(...palette.line);
  doc.line(x + 24, y + 56, x + contentWidth - 24, y + 56);

  weeks.forEach((week, index) => {
    const cardX = x + index * (cardWidth + gap);
    const color = index < 2 ? palette.blue : palette.teal;
    doc.setFillColor(...color);
    doc.circle(cardX + 20, y + 56, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...palette.white);
    doc.text(String(week.week), cardX + 17.5, y + 59);

    doc.setFillColor(...palette.white);
    doc.setDrawColor(...palette.line);
    doc.roundedRect(cardX + 2, y + 74, cardWidth - 4, 100, 7, 7, "FD");
    doc.setFillColor(...color);
    doc.rect(cardX + 2, y + 74, cardWidth - 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.7);
    doc.setTextColor(...palette.navy);
    doc.text(`Week ${week.week}`, cardX + 12, y + 94);
    doc.setFontSize(8.3);
    doc.text(cleanText(oneLine(week.title, 18)), cardX + 12, y + 109, { maxWidth: cardWidth - 24 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...palette.slate);
    const actions = doc.splitTextToSize(cleanText(week.actions.join(" ")), cardWidth - 24) as string[];
    doc.text(actions.slice(0, 3), cardX + 12, y + 124);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...palette.muted);
    doc.text(cleanText(oneLine(week.successMetric, 22)), cardX + 12, y + 164, { maxWidth: cardWidth - 24 });
  });
}

function drawScoreBar(doc: PdfDoc, x: number, y: number, width: number, score: number, caption: string) {
  const scoreValue = clampScore(score);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...palette.navy);
  doc.text("Sales Opportunity Score", x, y);
  doc.setFontSize(20);
  doc.text(`${scoreValue}/100`, x, y + 29);
  drawBar(doc, x + 92, y + 18, width - 92, 12, scoreValue, scoreValue >= 70 ? palette.teal : scoreValue >= 40 ? palette.gold : palette.rose);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...palette.muted);
  const lines = doc.splitTextToSize(cleanText(caption), width) as string[];
  doc.text(lines.slice(0, 2), x, y + 52);
}

function drawConflictPanel(doc: PdfDoc, y: number, contentWidth: number, result: LeadPilotAnalysisResult) {
  const gap = 10;
  const width = (contentWidth - gap * 2) / 3;
  const items = [
    { label: "Research Agent", value: `${result.conflictResolution.researchScore}/100`, color: palette.blue },
    { label: "Opportunity Agent", value: `${result.conflictResolution.opportunityScore}/100`, color: palette.teal },
    { label: "Manager Final", value: `${result.conflictResolution.finalScore}/100`, color: palette.gold }
  ];
  items.forEach((item, index) => {
    const x = page.margin + index * (width + gap);
    doc.setFillColor(...palette.surface);
    doc.setDrawColor(...palette.line);
    doc.roundedRect(x, y, width, 80, 7, 7, "FD");
    doc.setFillColor(...item.color);
    doc.circle(x + 14, y + 18, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...palette.muted);
    doc.text(item.label.toUpperCase(), x + 24, y + 20);
    doc.setFontSize(18);
    doc.setTextColor(...palette.navy);
    doc.text(item.value, x + 14, y + 52);
  });
}

function drawBar(doc: PdfDoc, x: number, y: number, width: number, height: number, score: number, color: RGB) {
  doc.setFillColor(232, 238, 244);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");
  doc.setFillColor(...color);
  doc.roundedRect(x, y, Math.max(4, (width * clampScore(score)) / 100), height, height / 2, height / 2, "F");
}

function drawPill(doc: PdfDoc, x: number, y: number, width: number, height: number, label: string, color: RGB) {
  doc.setFillColor(...tint(color, 0.86));
  doc.setDrawColor(...color);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(...color);
  doc.text(cleanText(label), x + 10, y + height / 2 + 3);
}

function drawLevelPill(doc: PdfDoc, x: number, y: number, level: "low" | "medium" | "high") {
  const color = level === "high" ? palette.rose : level === "medium" ? palette.gold : palette.teal;
  drawPill(doc, x, y, 58, 18, level.toUpperCase(), color);
}

function drawGradientBands(doc: PdfDoc, x: number, y: number, width: number, height: number, colors: RGB[]) {
  const bands = 28;
  for (let index = 0; index < bands; index += 1) {
    const progress = index / Math.max(1, bands - 1);
    const colorA = colors[Math.min(colors.length - 1, Math.floor(progress * (colors.length - 1)))];
    const colorB = colors[Math.min(colors.length - 1, Math.ceil(progress * (colors.length - 1)))];
    const mixed = mix(colorA, colorB, progress * (colors.length - 1) - Math.floor(progress * (colors.length - 1)));
    doc.setFillColor(...mixed);
    doc.rect(x + (width * index) / bands, y, width / bands + 1, height, "F");
  }
}

function drawLeadPilotLogo(doc: PdfDoc, x: number, y: number, size: number) {
  doc.setFillColor(...palette.white);
  doc.roundedRect(x, y, size, size, 7, 7, "F");
  doc.setDrawColor(...palette.teal);
  doc.setLineWidth(1.4);
  doc.line(x + 9, y + 22, x + 16, y + 13);
  doc.line(x + 16, y + 13, x + 22, y + 19);
  doc.line(x + 22, y + 19, x + 28, y + 10);
  doc.setFillColor(...palette.blue);
  doc.circle(x + 9, y + 22, 2.4, "F");
  doc.circle(x + 16, y + 13, 2.4, "F");
  doc.circle(x + 22, y + 19, 2.4, "F");
  doc.circle(x + 28, y + 10, 2.4, "F");
  doc.setLineWidth(1);
}

function drawBrandLogoCard(doc: PdfDoc, dataUrl: string | undefined, x: number, y: number, width: number, height: number) {
  if (!dataUrl) {
    return false;
  }

  doc.setFillColor(...palette.white);
  doc.roundedRect(x, y, width, height, 8, 8, "F");
  return drawBrandLogoImage(doc, dataUrl, x + 8, y + 9, width - 16, height - 18);
}

function drawBrandLogoImage(doc: PdfDoc, dataUrl: string | undefined, x: number, y: number, width: number, height: number) {
  if (!dataUrl) {
    return false;
  }

  try {
    const renderedWidth = Math.min(width, height * brandLogoAspectRatio);
    const renderedHeight = renderedWidth / brandLogoAspectRatio;
    const renderedX = x + (width - renderedWidth) / 2;
    const renderedY = y + (height - renderedHeight) / 2;
    doc.addImage(dataUrl, "PNG", renderedX, renderedY, renderedWidth, renderedHeight, "leadpilot-logo", "FAST");
    return true;
  } catch {
    return false;
  }
}

function drawCompanyMark(doc: PdfDoc, x: number, y: number, size: number, companyName: string) {
  const initials = cleanText(companyName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  doc.setFillColor(255, 255, 255);
  doc.circle(x + size / 2, y + size / 2, size / 2, "F");
  doc.setDrawColor(...palette.gold);
  doc.circle(x + size / 2, y + size / 2, size / 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(initials.length > 1 ? 15 : 18);
  doc.setTextColor(...palette.navy);
  doc.text(initials || "LP", x + size / 2, y + size / 2 + 5, { align: "center" });
}

function drawPolygon(doc: PdfDoc, points: Array<[number, number]>, color: RGB) {
  doc.setDrawColor(...color);
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    doc.line(x1, y1, x2, y2);
  }
}

function radarDimensions(result: LeadPilotAnalysisResult) {
  const dimensionScore = (name: string, fallback: number) =>
    clampScore(result.enterpriseMaturityFactor.dimensions.find((dimension) => dimension.name.toLowerCase().includes(name))?.score ?? fallback);

  return [
    { label: "Process Clarity", score: dimensionScore("process", result.enterpriseMaturityFactor.score) },
    { label: "Data & Reporting", score: dimensionScore("data", Math.round((result.analysisConfidence.score + result.enterpriseMaturityFactor.score) / 2)) },
    { label: "Integration Readiness", score: dimensionScore("integration", Math.round((result.enterpriseMaturityFactor.score + result.salesOpportunityScore.score) / 2)) },
    { label: "Growth Readiness", score: dimensionScore("growth", result.salesOpportunityScore.score) },
    { label: "Buying Readiness", score: clampScore(Math.round((result.salesOpportunityScore.score + result.analysisConfidence.score) / 2)) }
  ];
}

function radarPoints(centerX: number, centerY: number, radius: number, scores: number[]) {
  return scores.map((score, index) => radarPoint(centerX, centerY, radius, index, scores.length, score));
}

function radarPoint(centerX: number, centerY: number, radius: number, index: number, total: number, score: number): [number, number] {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  const scaledRadius = (radius * clampScore(score)) / 100;
  return [centerX + Math.cos(angle) * scaledRadius, centerY + Math.sin(angle) * scaledRadius];
}

function competitorMatrixHeight(result: LeadPilotAnalysisResult) {
  return 48 + result.competitorAnalysis.competitors.slice(0, 5).length * 34 + 14;
}

function averageBudget(result: LeadPilotAnalysisResult) {
  return Math.round((result.budgetEstimate.min + result.budgetEstimate.max) / 2);
}

function formatReportMonth(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "June 2026";
  }
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date);
}

function mix(a: RGB, b: RGB, amount: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount)
  ];
}

function tint(color: RGB, amount: number): RGB {
  return [
    Math.round(color[0] + (255 - color[0]) * amount),
    Math.round(color[1] + (255 - color[1]) * amount),
    Math.round(color[2] + (255 - color[2]) * amount)
  ];
}

function drawPageChrome(doc: PdfDoc, pageNumber: number, companyName: string, brandLogoDataUrl?: string) {
  const width = doc.internal.pageSize.getWidth();
  const margin = page.margin;
  doc.setDrawColor(...palette.line);
  doc.line(margin, 34, width - margin, 34);
  if (!drawBrandLogoImage(doc, brandLogoDataUrl, margin, 9, 70, 26)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...palette.muted);
    doc.text("LeadPilot AI", margin, 24);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...palette.muted);
  doc.text(cleanText(oneLine(companyName, 48)), width - margin - 160, 24);
  doc.setFont("helvetica", "normal");
  doc.text(String(pageNumber), width - margin + 3, 24);
}

function drawAllFooters(doc: PdfDoc, companyName: string) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let pageIndex = 1; pageIndex <= pages; pageIndex += 1) {
    doc.setPage(pageIndex);
    doc.setDrawColor(...palette.line);
    doc.line(page.margin, height - 36, width - page.margin, height - 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...palette.muted);
    doc.text("LeadPilot AI strategy report. No affiliation with external consulting firms.", page.margin, height - 20);
    doc.text(`${cleanText(oneLine(companyName, 34))} | ${pageIndex}/${pages}`, width - page.margin - 120, height - 20);
  }
}

function approvalLabel(status: ReportApprovalStatus) {
  if (status === "approved") return "Approved";
  if (status === "revision_requested") return "Revision";
  return "Pending";
}

function approvalMessage(status: ReportApprovalStatus) {
  if (status === "approved") return "The proposal has passed the human-in-the-loop checkpoint and is ready for final outreach.";
  if (status === "revision_requested") return "The proposal requires another agent revision cycle before final outreach.";
  return "The proposal should be reviewed by a human before any customer-facing outreach.";
}

function cleanText(value: string) {
  return value
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function oneLine(value: string, maxLength: number) {
  const cleaned = cleanText(value).replace(/\s+/g, " ");
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}...` : cleaned;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function signedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function fileBaseName(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase() || "leadpilot";
}

async function loadBrandLogoDataUrl() {
  if (typeof window === "undefined" || typeof fetch === "undefined" || typeof FileReader === "undefined") {
    return undefined;
  }

  try {
    const response = await fetch(LEADPILOT_LOGO_PATH, { cache: "force-cache" });
    if (!response.ok) {
      return undefined;
    }
    const blob = await response.blob();
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
