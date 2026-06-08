export interface StructuredGenerationRequest<T> {
  agent: string;
  prompt: string;
  fallback: T;
  model?: string;
  jsonSchema?: {
    name: string;
    description?: string;
    schema: Record<string, unknown>;
  };
}

export interface StructuredGenerationMetadata {
  provider: "mock" | "qwen-cloud" | "memory-store";
  model: string;
  responseFormat: "none" | "json_object" | "json_schema";
  usedFallback: boolean;
  latencyMs: number;
  status?: number;
  baseUrl?: string;
  error?: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface StructuredGenerationResult<T> {
  data: T;
  metadata: StructuredGenerationMetadata;
}

export interface QwenProvider {
  generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<StructuredGenerationResult<T>>;
}

export class MockQwenProvider implements QwenProvider {
  async generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<StructuredGenerationResult<T>> {
    const startedAt = Date.now();
    return {
      data: request.fallback,
      metadata: {
        provider: "mock",
        model: request.model ?? "mock-qwen",
        responseFormat: request.jsonSchema ? "json_schema" : "json_object",
        usedFallback: true,
        latencyMs: Date.now() - startedAt
      }
    };
  }
}

export class QwenCloudProvider implements QwenProvider {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;

  constructor() {
    loadLeadPilotEnv();
    this.apiKey = process.env.DASHSCOPE_API_KEY;
    this.baseUrl = process.env.QWEN_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
    this.defaultModel = process.env.QWEN_TEXT_MODEL ?? "qwen-plus";
    this.timeoutMs = Number(process.env.QWEN_TIMEOUT_MS ?? "60000");
  }

  async generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<StructuredGenerationResult<T>> {
    const startedAt = Date.now();
    const model = request.model ?? this.defaultModel;
    const responseFormat = request.jsonSchema ? "json_schema" : "json_object";

    if (!this.apiKey || process.env.LEADPILOT_FORCE_MOCK === "true") {
      return {
        data: request.fallback,
        metadata: {
          provider: "mock",
          model,
          responseFormat,
          usedFallback: true,
          latencyMs: Date.now() - startedAt,
          baseUrl: this.baseUrl
        }
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          response_format: request.jsonSchema
            ? {
                type: "json_schema",
                json_schema: {
                  name: request.jsonSchema.name,
                  description: request.jsonSchema.description,
                  strict: true,
                  schema: request.jsonSchema.schema
                }
              }
            : { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are LeadPilot AI running as ${request.agent}. ${agentPersona(request.agent)} Always write in English, even when the source material is in another language. Return only valid JSON matching the requested structure. Do not include markdown fences.`
            },
            {
              role: "user",
              content: request.prompt
            }
          ]
        })
      });

      if (!response.ok) {
        return {
          data: request.fallback,
          metadata: {
            provider: "qwen-cloud",
            model,
            responseFormat,
            usedFallback: true,
            latencyMs: Date.now() - startedAt,
            status: response.status,
            baseUrl: this.baseUrl,
            error: `Qwen Cloud returned HTTP ${response.status}`
          }
        };
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return {
          data: request.fallback,
          metadata: {
            provider: "qwen-cloud",
            model,
            responseFormat,
            usedFallback: true,
            latencyMs: Date.now() - startedAt,
            status: response.status,
            baseUrl: this.baseUrl,
            error: "Qwen Cloud response did not include message content."
          }
        };
      }

      return {
        data: JSON.parse(stripJsonFence(content)) as T,
        metadata: {
          provider: "qwen-cloud",
          model,
          responseFormat,
          usedFallback: false,
          latencyMs: Date.now() - startedAt,
          status: response.status,
          baseUrl: this.baseUrl,
          tokenUsage: {
            promptTokens: data.usage?.prompt_tokens,
            completionTokens: data.usage?.completion_tokens,
            totalTokens: data.usage?.total_tokens
          }
        }
      };
    } catch (error) {
      return {
        data: request.fallback,
        metadata: {
          provider: "qwen-cloud",
          model,
          responseFormat,
          usedFallback: true,
          latencyMs: Date.now() - startedAt,
          baseUrl: this.baseUrl,
          error: error instanceof Error ? error.message : "Qwen Cloud request failed."
        }
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createDefaultQwenProvider(): QwenProvider {
  return new QwenCloudProvider();
}

function stripJsonFence(content: string): string {
  return content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function agentPersona(agent: string): string {
  if (agent.includes("Research")) {
    return "Act like a market researcher: extract factual business context, audience, positioning, and public evidence.";
  }
  if (agent.includes("Opportunity")) {
    return "Act like a sales engineer: identify operational pain, automation opportunities, and evidence-backed business impact.";
  }
  if (agent.includes("Competitor")) {
    return "Act like a competitive intelligence analyst: map likely competitors, positioning, differentiators, and market gaps from public evidence.";
  }
  if (agent.includes("Pricing")) {
    return "Act like a commercial strategist: estimate complexity, project value, ROI, and risk-adjusted budget ranges.";
  }
  if (agent.includes("Proposal")) {
    return "Act like a senior agency closer: write a practical scope, outreach email, and next-step plan.";
  }
  return "Act like a multi-agent coordinator: keep outputs precise, useful, and grounded in the provided evidence.";
}
import { loadLeadPilotEnv } from "./env-loader";
