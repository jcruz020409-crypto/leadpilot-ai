import { NextResponse } from "next/server";
import { createDefaultMemoryStore } from "../../../../lib/memory-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const store = createDefaultMemoryStore();
    const record = store.getById ? await store.getById(id) : undefined;
    if (!record) {
      return NextResponse.json({ ok: false, error: "Analysis not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "History lookup failed." },
      { status: 500 }
    );
  }
}
