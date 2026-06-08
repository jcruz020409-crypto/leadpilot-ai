# Tech Stack

Status: draft

## Recommended MVP Stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Language | TypeScript | Shared types across UI, API, agents, and workers. |
| Web app | Next.js App Router | Fast MVP dashboard, server actions/API routes, deployable on Vercel. |
| UI | React + Tailwind CSS + shadcn/ui | Practical dashboard components with consistent accessibility patterns. |
| Database | PostgreSQL | Durable analysis, memory, proposal, audit, and job state. |
| Database host | Supabase Postgres | Fast hosted MVP with auth and admin tooling. |
| ORM | Drizzle ORM | Typed SQL, explicit migrations, low runtime overhead. |
| Auth | Supabase Auth | Reduces MVP auth surface area. |
| Queue | PostgreSQL-backed jobs table | Avoids Redis in MVP while preserving durable retries and auditability. |
| Worker | Node.js worker process | Handles website analysis, agent runs, pricing, proposal generation, and memory writes. |
| AI provider | Qwen Cloud via provider adapter | Keeps model and region configurable. |
| Website fetch | Guarded fetch adapter | Keeps user-submitted URL access behind SSRF, timeout, and byte limits. |
| Memory | PostgreSQL-backed memory tables | Stores analyzed companies, decisions, and preferences for the Memory Agent. |
| Email | Future provider adapter | Keeps outbound pluggable after Demo 1. |
| Observability | Structured logs + agent run tables | Captures prompts metadata, tokens, cost, errors, and decisions. |
| Deployment | Vercel for web, PaaS worker for jobs | Clear separation between request path and background execution. |

## Repository Layout

```text
apps/
  web/                 # Next.js dashboard and API routes
  worker/              # Background job processor
packages/
  core/                # Domain types, policies, scoring contracts
  db/                  # Drizzle schema, migrations, query helpers
  qwen/                # Qwen Cloud provider adapter
  providers/           # Website, email, enrichment, CRM provider interfaces
  memory/              # Company memory, decisions, and preferences
  observability/       # Logger, trace helpers, agent run capture
ai/
  prompts/             # Versioned prompt templates
agents/                # Manager, Research, Opportunity, Pricing, Proposal, Memory
database/
  migrations/          # SQL or Drizzle-generated migrations
tests/
  unit/
  integration/
  e2e/
```

## Qwen Cloud Integration

Use an internal provider interface instead of calling Qwen directly throughout
the app. The adapter should support:

- Configurable base URL and model names.
- OpenAI-compatible chat completions for text generation when available.
- JSON-mode or schema-validated structured outputs.
- Timeout, retry, and circuit-breaker controls.
- Prompt and response metadata capture without storing secrets.

Current Alibaba Cloud Model Studio docs describe Qwen access through both an
OpenAI-compatible protocol and the DashScope API. Keep endpoint and model names
environment-configured so the implementation can switch region or model without
code changes.
