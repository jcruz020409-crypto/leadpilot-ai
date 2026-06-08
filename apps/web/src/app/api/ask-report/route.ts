import { NextResponse } from "next/server";
import { z } from "zod";
import { createDefaultQwenProvider } from "../../../lib/qwen-provider";

const AskReportSchema = z.object({
  question: z.string().min(3).max(500),
  reportMarkdown: z.string().min(20).max(30000),
  companyName: z.string().min(1).max(200)
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = AskReportSchema.parse(await request.json());
    const fallback = {
      answer:
        "The report indicates that the strongest next step is to validate the highest-impact opportunity with a discovery call, then scope a focused automation pilot.",
      citations: ["Business Summary", "Sales Opportunity Score", "Recommended Next Steps"],
      followUpQuestions: ["What budget range should we propose?", "Which opportunity should be prioritized first?"]
    };
    const response = await createDefaultQwenProvider().generateStructured({
      agent: "Report Advisor Agent",
      prompt: [
        "Always write in English.",
        "Answer the user's question using only this LeadPilot AI report.",
        "Be concise, executive, and sales-practical. If the report does not contain enough evidence, say what should be validated.",
        `Company: ${body.companyName}`,
        `Question: ${body.question}`,
        `Report:\n${body.reportMarkdown.slice(0, 30000)}`
      ].join("\n\n"),
      fallback,
      jsonSchema: {
        name: "report_answer",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            answer: { type: "string" },
            citations: { type: "array", items: { type: "string" } },
            followUpQuestions: { type: "array", items: { type: "string" } }
          },
          required: ["answer", "citations", "followUpQuestions"]
        }
      }
    });

    return NextResponse.json({ ok: true, answer: response.data, metadata: response.metadata });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Ask report failed." },
      { status: 400 }
    );
  }
}
