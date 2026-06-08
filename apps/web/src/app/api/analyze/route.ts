import { NextResponse } from "next/server";
import { z } from "zod";
import { runLeadPilotAnalysis } from "../../../lib/analysis-pipeline";
import { createDefaultMemoryStore } from "../../../lib/memory-store";
import { createDefaultQwenProvider } from "../../../lib/qwen-provider";
import { createAnalyzeFetcher } from "./shared";

const AnalyzeRequestSchema = z.object({
  url: z.string().min(4).max(2048),
  socialUrls: z.array(z.string().min(4).max(2048)).max(5).optional().default([])
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = AnalyzeRequestSchema.parse(await request.json());
    const result = await runLeadPilotAnalysis({
      url: body.url,
      socialUrls: body.socialUrls,
      fetcher: createAnalyzeFetcher(),
      qwen: createDefaultQwenProvider(),
      memory: createDefaultMemoryStore()
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
