import { NextResponse } from "next/server";
import { AnalyzeRequestSchema, normalizeAnalyzeUrl } from "../../../../lib/analyze-request";
import { createAnalysisJob, markJobCompleted, markJobFailed, markJobRunning, updateJobAgent } from "../../../../lib/analysis-job-store";
import { runLeadPilotAnalysis } from "../../../../lib/analysis-pipeline";
import { createDefaultMemoryStore } from "../../../../lib/memory-store";
import { createDefaultQwenProvider } from "../../../../lib/qwen-provider";
import { createAnalyzeFetcher } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = AnalyzeRequestSchema.parse(await request.json());
    const normalizedUrl = normalizeAnalyzeUrl(body.url, body.socialUrls);
    const job = createAnalysisJob({ url: normalizedUrl, socialUrls: body.socialUrls });

    void runJob(job.id, normalizedUrl, body.socialUrls);

    return NextResponse.json({ ok: true, job }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not create analysis job." },
      { status: 400 }
    );
  }
}

async function runJob(jobId: string, url: string, socialUrls: string[]) {
  markJobRunning(jobId);
  try {
    const result = await runLeadPilotAnalysis({
      url,
      socialUrls,
      fetcher: createAnalyzeFetcher(),
      qwen: createDefaultQwenProvider(),
      memory: createDefaultMemoryStore(),
      onAgentStatus: (event) => updateJobAgent(jobId, event)
    });
    markJobCompleted(jobId, result);
  } catch (error) {
    markJobFailed(jobId, error instanceof Error ? error.message : "Analysis job failed.");
  }
}
