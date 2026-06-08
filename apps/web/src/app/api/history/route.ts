import { NextResponse } from "next/server";
import { createDefaultMemoryStore } from "../../../lib/memory-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const records = await createDefaultMemoryStore().listRecent(25);
    return NextResponse.json({
      ok: true,
      storage: process.env.DATABASE_URL ? "postgres" : "jsonl",
      records: records.map(({ result: _result, ...record }) => record)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "History failed." },
      { status: 500 }
    );
  }
}
