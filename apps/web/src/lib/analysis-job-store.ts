import type { AgentRun, LeadPilotAnalysisResult } from "./types";

export const JOB_AGENTS = ["Manager", "Research", "Opportunity", "Competitor", "Pricing", "Proposal", "Memory"] as const;

export type AnalysisJobStatus = "queued" | "running" | "completed" | "failed";
export type AnalysisJobAgentStatus = "pending" | "running" | "completed" | "failed";

export interface AnalysisJobAgent {
  agent: string;
  status: AnalysisJobAgentStatus;
  summary: string;
  startedAt?: string;
  completedAt?: string;
  run?: AgentRun;
}

export interface AnalysisJob {
  id: string;
  url: string;
  socialUrls: string[];
  status: AnalysisJobStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  agents: AnalysisJobAgent[];
  result?: LeadPilotAnalysisResult;
  error?: string;
}

const globalJobs = globalThis as typeof globalThis & {
  __leadPilotJobs?: Map<string, AnalysisJob>;
};

const jobs = globalJobs.__leadPilotJobs ?? new Map<string, AnalysisJob>();
globalJobs.__leadPilotJobs = jobs;

export function createAnalysisJob(input: { url: string; socialUrls: string[] }) {
  const now = new Date().toISOString();
  const job: AnalysisJob = {
    id: crypto.randomUUID(),
    url: input.url,
    socialUrls: input.socialUrls,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    agents: JOB_AGENTS.map((agent) => ({
      agent,
      status: "pending",
      summary: `${agent} Agent pending.`
    }))
  };
  jobs.set(job.id, job);
  pruneJobs();
  return job;
}

export function getAnalysisJob(id: string) {
  return jobs.get(id);
}

export function markJobRunning(id: string) {
  updateJob(id, { status: "running" });
}

export function markJobCompleted(id: string, result: LeadPilotAnalysisResult) {
  updateJob(id, {
    status: "completed",
    result,
    completedAt: new Date().toISOString(),
    agents: syncCompletedAgents(getAnalysisJob(id)?.agents ?? [], result.agentRuns)
  });
}

export function markJobFailed(id: string, error: string) {
  updateJob(id, { status: "failed", error, completedAt: new Date().toISOString() });
}

export function updateJobAgent(id: string, event: { agent: string; status: "running" | "completed" | "failed"; summary?: string; run?: AgentRun }) {
  const job = jobs.get(id);
  if (!job) return;
  const baseAgent = event.agent.replace(/\s+Agent$/, "");
  job.status = job.status === "queued" ? "running" : job.status;
  job.updatedAt = new Date().toISOString();
  job.agents = job.agents.map((agent) => {
    if (agent.agent !== baseAgent) return agent;
    return {
      ...agent,
      status: event.status,
      summary: event.summary ?? agent.summary,
      startedAt: event.status === "running" ? job.updatedAt : agent.startedAt,
      completedAt: event.status === "completed" || event.status === "failed" ? job.updatedAt : agent.completedAt,
      run: event.run ?? agent.run
    };
  });
}

function updateJob(id: string, patch: Partial<AnalysisJob>) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString()
  });
}

function syncCompletedAgents(agents: AnalysisJobAgent[], runs: AgentRun[]) {
  return agents.map((agent) => {
    const run = runs.find((item) => item.agent.startsWith(agent.agent));
    return run
      ? {
          ...agent,
          status: run.status,
          summary: run.summary,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          run
        }
      : agent;
  });
}

function pruneJobs() {
  const maxJobs = 50;
  if (jobs.size <= maxJobs) return;
  const sorted = [...jobs.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const job of sorted.slice(0, jobs.size - maxJobs)) {
    jobs.delete(job.id);
  }
}
