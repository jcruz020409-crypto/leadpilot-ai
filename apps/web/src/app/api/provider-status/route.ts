import { NextResponse } from "next/server";
import { loadLeadPilotEnv } from "../../../lib/env-loader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = loadLeadPilotEnv();
  const forceMock = process.env.LEADPILOT_FORCE_MOCK === "true";
  const keyConfigured = Boolean(process.env.DASHSCOPE_API_KEY);
  const websiteMock = process.env.LEADPILOT_MOCK_WEBSITE === "true";

  return NextResponse.json({
    provider: "qwen-cloud",
    keyConfigured,
    forceMock,
    websiteMock,
    liveReady: keyConfigured && !forceMock,
    memoryStorage: process.env.DATABASE_URL ? "postgres" : "jsonl",
    cloudMemoryReady: Boolean(process.env.DATABASE_URL),
    competitorSearchProvider: process.env.EXA_API_KEY ? "exa" : "none",
    competitorSearchReady: Boolean(process.env.EXA_API_KEY),
    envFileLoaded: env.loaded,
    envFileScope: env.path ? "local" : "runtime"
  });
}
