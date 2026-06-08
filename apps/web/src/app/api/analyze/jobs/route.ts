import { NextResponse } from "next/server";
import { z } from "zod";
import { createAnalysisJob, markJobCompleted, markJobFailed, markJobRunning, updateJobAgent } from "../../../../lib/analysis-job-store";
import { runLeadPilotAnalysis } from "../../../../lib/analysis-pipeline";
import { createDefaultMemoryStore } from "../../../../lib/memory-store";
import { createDefaultQwenProvider } from "../../../../lib/qwen-provider";
import { createAnalyzeFetcher } from "../shared";

const AnalyzeJobRequestSchema = z.object({
  url: z.string().min(4).max(2048),
  socialUrls: z.array(z.string().min(4).max(2048)).max(5).optional().default([])
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = AnalyzeJobRequestSchema.parse(await request.json());
    const job = createAnalysisJob({ url: body.url, socialUrls: body.socialUrls });

    void runJob(job.id, body.url, body.socialUrls);

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
