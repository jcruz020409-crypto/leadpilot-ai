import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { loadLeadPilotEnv } from "./env-loader";
import type { LeadPilotAnalysisResult, MemoryRecordSummary } from "./types";

export interface MemoryRecord extends MemoryRecordSummary {
  id?: string;
  finalUrl: string;
  recommendedAngle: string;
  nextSteps: string[];
  result?: LeadPilotAnalysisResult;
}

export interface MemoryStore {
  save(result: LeadPilotAnalysisResult): Promise<void>;
  listRecent(limit: number): Promise<MemoryRecord[]>;
  getById?(id: string): Promise<MemoryRecord | undefined>;
}

export class NoopMemoryStore implements MemoryStore {
  async save(_result: LeadPilotAnalysisResult): Promise<void> {
    return;
  }

  async listRecent(_limit: number): Promise<MemoryRecord[]> {
    return [];
  }
}

export class JsonlMemoryStore implements MemoryStore {
  constructor(private readonly filePath = path.join(process.cwd(), ".data", "leadpilot-memory.jsonl")) {}

  async save(result: LeadPilotAnalysisResult): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const savedAt = new Date().toISOString();
    const record: MemoryRecord = {
      id: memoryId(result.sourceUrl, savedAt),
      savedAt,
      sourceUrl: result.sourceUrl,
      finalUrl: result.finalUrl,
      companyName: result.businessSummary.companyName,
      score: result.salesOpportunityScore.score,
      proposalTitle: result.proposalDraft.title,
      proposalSummary: result.proposalDraft.executiveSummary,
      recommendedAngle: result.salesOpportunityScore.recommendedAngle,
      nextSteps: result.recommendedNextSteps,
      result
    };
    await appendFile(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
  }

  async listRecent(limit: number): Promise<MemoryRecord[]> {
    try {
      const { readFile } = await import("node:fs/promises");
      const content = await readFile(this.filePath, "utf8");
      return content
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as MemoryRecord)
        .reverse()
        .slice(0, Math.max(0, limit));
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<MemoryRecord | undefined> {
    const records = await this.listRecent(500);
    return records.find((record) => record.id === id);
  }
}

export class PostgresMemoryStore implements MemoryStore {
  private readonly pool: pg.Pool;
  private ready = false;

  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for PostgresMemoryStore.");
    }
    this.pool = new pg.Pool({
      connectionString,
      max: 4,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }

  async save(result: LeadPilotAnalysisResult): Promise<void> {
    await this.ensureSchema();
    const savedAt = new Date().toISOString();
    await this.pool.query(
      `
        insert into leadpilot_analysis_memory (
          id,
          saved_at,
          source_url,
          final_url,
          company_name,
          score,
          proposal_title,
          proposal_summary,
          recommended_angle,
          next_steps,
          result_json
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
      `,
      [
        memoryId(result.sourceUrl, savedAt),
        savedAt,
        result.sourceUrl,
        result.finalUrl,
        result.businessSummary.companyName,
        result.salesOpportunityScore.score,
        result.proposalDraft.title,
        result.proposalDraft.executiveSummary,
        result.salesOpportunityScore.recommendedAngle,
        JSON.stringify(result.recommendedNextSteps),
        JSON.stringify(result)
      ]
    );
  }

  async listRecent(limit: number): Promise<MemoryRecord[]> {
    await this.ensureSchema();
    const response = await this.pool.query(
      `
        select id, saved_at, source_url, final_url, company_name, score, proposal_title,
               proposal_summary, recommended_angle, next_steps, result_json
        from leadpilot_analysis_memory
        order by saved_at desc
        limit $1
      `,
      [Math.max(0, limit)]
    );
    return response.rows.map(rowToMemoryRecord);
  }

  async getById(id: string): Promise<MemoryRecord | undefined> {
    await this.ensureSchema();
    const response = await this.pool.query(
      `
        select id, saved_at, source_url, final_url, company_name, score, proposal_title,
               proposal_summary, recommended_angle, next_steps, result_json
        from leadpilot_analysis_memory
        where id = $1
        limit 1
      `,
      [id]
    );
    return response.rows[0] ? rowToMemoryRecord(response.rows[0]) : undefined;
  }

  private async ensureSchema() {
    if (this.ready) return;
    await this.pool.query(`
      create table if not exists leadpilot_analysis_memory (
        id text primary key,
        saved_at timestamptz not null,
        source_url text not null,
        final_url text not null,
        company_name text not null,
        score integer not null,
        proposal_title text not null,
        proposal_summary text not null,
        recommended_angle text not null,
        next_steps jsonb not null,
        result_json jsonb not null
      );
      create index if not exists leadpilot_analysis_memory_saved_at_idx
        on leadpilot_analysis_memory (saved_at desc);
      create index if not exists leadpilot_analysis_memory_company_idx
        on leadpilot_analysis_memory (lower(company_name));
    `);
    this.ready = true;
  }
}

export function createDefaultMemoryStore(): MemoryStore {
  loadLeadPilotEnv();
  if (process.env.DATABASE_URL) {
    return new PostgresMemoryStore();
  }
  return new JsonlMemoryStore();
}

function rowToMemoryRecord(row: {
  id: string;
  saved_at: Date | string;
  source_url: string;
  final_url: string;
  company_name: string;
  score: number;
  proposal_title: string;
  proposal_summary: string;
  recommended_angle: string;
  next_steps: string[] | string;
  result_json: LeadPilotAnalysisResult | string;
}): MemoryRecord {
  return {
    id: row.id,
    savedAt: new Date(row.saved_at).toISOString(),
    sourceUrl: row.source_url,
    finalUrl: row.final_url,
    companyName: row.company_name,
    score: Number(row.score),
    proposalTitle: row.proposal_title,
    proposalSummary: row.proposal_summary,
    recommendedAngle: row.recommended_angle,
    nextSteps: typeof row.next_steps === "string" ? (JSON.parse(row.next_steps) as string[]) : row.next_steps,
    result: typeof row.result_json === "string" ? (JSON.parse(row.result_json) as LeadPilotAnalysisResult) : row.result_json
  };
}

function memoryId(sourceUrl: string, savedAt: string) {
  return `${safeId(sourceUrl)}-${Date.parse(savedAt).toString(36)}`;
}

function safeId(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").slice(0, 60).toLowerCase() || "analysis";
}
