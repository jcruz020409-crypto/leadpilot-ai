import { NextResponse } from "next/server";
import { getAnalysisJob } from "../../../../../lib/analysis-job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = getAnalysisJob(id);
  if (!job) {
    return NextResponse.json({ ok: false, error: "Analysis job not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, job });
}
