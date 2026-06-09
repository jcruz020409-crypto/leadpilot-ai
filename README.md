# LeadPilot AI

Multi-Agent AI Sales Autopilot powered by Qwen Cloud.

LeadPilot AI helps software agencies and freelancers qualify prospects faster.
The user pastes a company website URL plus optional social profile URLs, and a multi-agent pipeline analyzes the
site and social context, summarizes the business, detects problems, calculates commercial
opportunity, estimates budget, generates a proposal, and produces a final sales
report.

## Submission

- Repository: `https://github.com/jcruz020409-crypto/leadpilot-ai`
- Primary category: Agent Society
- Secondary category: Autopilot Agent
- AI provider: Qwen Cloud / Alibaba Cloud Model Studio
- License: MIT

## Features

- URL intake for `https://example.com` style company websites.
- Optional social media profile URLs for richer research context.
- SSRF-aware URL safety guard for user-submitted URLs.
- Website fetch and text extraction.
- Multi-agent workflow:
  - Manager Agent.
  - Research Agent.
  - Opportunity Agent.
  - Competitor Agent.
  - Pricing Agent.
  - Proposal Agent.
  - Memory Agent.
- Qwen Cloud adapter using the OpenAI-compatible DashScope endpoint.
- Root `.env.local` loader for the backend, so `next dev apps/web` can still
  find `DASHSCOPE_API_KEY` from the repository root.
- Provider status endpoint at `/api/provider-status` that reports Qwen readiness
  without exposing secrets.
- Qwen structured output support with JSON Schema mode.
- AI Execution Trace showing provider, model, response format, latency,
  fallback status, and validation status per agent.
- Live agent status strip with running, pending, and completed states.
- Agent Discussion panel that exposes each agent's contribution before the
  Manager Agent approves the proposal.
- Agent Conflict Resolution showing divergent agent scores and manager rationale.
- Opportunity Heatmap for Lead Capture, WhatsApp, CRM, Export Sales, and SEO.
- Competitor Agent with optional Exa live search grounding through `EXA_API_KEY`.
- Human Approval checkpoint with approve/revision controls before final proposal.
- Visual opportunity score, estimated annual revenue impact, and ROI projection.
- Visible Memory Agent panel with previous score, current score, score delta,
  proposal title, and recent analyzed companies.
- Analysis History panel backed by `DATABASE_URL` Postgres when configured, with
  local JSONL fallback for demos.
- Dedicated `/history` page with saved companies, score comparison, previous
  report detail, and PDF export for saved full reports.
- Real backend job progress through `/api/analyze/jobs` and
  `/api/analyze/jobs/[id]`, including per-agent running/completed/failed status.
- Ask This Report chatbot that answers questions against the generated report
  using Qwen Cloud.
- Deterministic mock mode for local demos without secrets.
- Final Analysis Report with:
  - Business Summary.
  - Detected Problems.
  - Sales Opportunity Score.
  - Agent Conflict Resolution.
  - Opportunity Heatmap.
  - Competitor Matrix.
  - Executive Dashboard.
  - Enterprise Maturity Radar.
  - Estimated Budget.
  - ROI Projection.
  - Proposal Draft.
  - Human Approval.
  - Agent Discussion.
  - Recommended Next Steps.
- Copy and PDF export actions.

## Architecture

![LeadPilot AI Architecture](docs/assets/leadpilot-architecture.png)

More detail: [ARCHITECTURE.md](ARCHITECTURE.md)

Standalone diagram: [docs/ARCHITECTURE_DIAGRAM.md](docs/ARCHITECTURE_DIAGRAM.md)

## Alibaba Cloud / Qwen Evidence

The backend deployment proof and Alibaba Cloud Model Studio / Qwen Cloud
integration are in:

- [deploy/alibaba-cloud/Dockerfile](deploy/alibaba-cloud/Dockerfile)
- [deploy/alibaba-cloud/docker-compose.ecs.yml](deploy/alibaba-cloud/docker-compose.ecs.yml)
- [deploy/alibaba-cloud/ack-deployment.yaml](deploy/alibaba-cloud/ack-deployment.yaml)
- [apps/web/src/app/api/deployment-proof/route.ts](apps/web/src/app/api/deployment-proof/route.ts)
- [apps/web/src/lib/qwen-provider.ts](apps/web/src/lib/qwen-provider.ts)
- [apps/web/src/lib/env-loader.ts](apps/web/src/lib/env-loader.ts)
- [apps/web/src/app/api/analyze/route.ts](apps/web/src/app/api/analyze/route.ts)
- [apps/web/src/app/api/provider-status/route.ts](apps/web/src/app/api/provider-status/route.ts)
- [docs/ALIBABA_CLOUD_PROOF.md](docs/ALIBABA_CLOUD_PROOF.md)

`QwenCloudProvider` calls the OpenAI-compatible DashScope endpoint:

```text
POST ${QWEN_BASE_URL}/chat/completions
Authorization: Bearer ${DASHSCOPE_API_KEY}
```

The Alibaba Cloud deployment proof endpoint is:

```text
GET /api/deployment-proof
```

When deployed on Alibaba Cloud, configure:

```env
DEPLOYMENT_PROVIDER=Alibaba Cloud
ALIBABA_CLOUD_RUNTIME=ECS Docker
ALIBABA_CLOUD_REGION=your-region
```

The provider uses structured output with:

```json
{
  "response_format": {
    "type": "json_schema"
  }
}
```

## Quickstart

```bash
npm install
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Open:

```text
http://127.0.0.1:3001
```

## Environment

Create `.env.local` from `.env.example`.

For a local deterministic demo:

```env
LEADPILOT_FORCE_MOCK=true
LEADPILOT_MOCK_WEBSITE=true
```

For Qwen Cloud:

```env
DASHSCOPE_API_KEY=your_key_here
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_TEXT_MODEL=qwen-plus
LEADPILOT_FORCE_MOCK=false
LEADPILOT_MOCK_WEBSITE=false
```

For cloud memory and live competitor search:

```env
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@aws-0-your-region.pooler.supabase.com:5432/postgres
DATABASE_SSL=true
EXA_API_KEY=your_exa_key_here
EXA_BASE_URL=https://api.exa.ai
```

`DATABASE_URL` enables the Memory Agent cloud database and the Analysis History
panel. Supabase setup details and the migration are in
[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). Without `DATABASE_URL`, the
app falls back to local JSONL memory. `EXA_API_KEY` enables live competitor
search before the Competitor Agent synthesizes the matrix.

Do not commit `.env.local` or API keys.

## Commands

```bash
npm test
npm run test:coverage
npm run typecheck
npm run build
```

Current local verification on 2026-06-08:

- Unit/integration tests: 24 passing across 9 test files.
- Coverage: 90.35% statement coverage and 91.48% line coverage.
- TypeScript: passing.
- Production build: passing.

## Demo Video

Submission video placeholder:

```text
TODO: Add public YouTube/Vimeo/Facebook video URL here.
```

Suggested 3-minute structure:

1. Problem and category.
2. Paste a company URL.
3. Add optional LinkedIn, X/Twitter, or other public social profile URLs.
4. Show live agent statuses moving from pending to running to complete.
5. Show Business Summary, conflict resolution, heatmap, visual Score, Budget, ROI, Ask This Report, Human Approval, Proposal, Analysis History, and Memory.
6. Show Qwen Cloud code path with per-agent prompts and architecture diagram.

## Documentation

- [PROJECT_FINAL.md](PROJECT_FINAL.md)
- [DEMO_1.md](DEMO_1.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [AI_AGENTS.md](AI_AGENTS.md)
- [TECH_STACK.md](TECH_STACK.md)
- [REQUIREMENTS.md](REQUIREMENTS.md)
- [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md)
- [docs/SUBMISSION.md](docs/SUBMISSION.md)
- [docs/ALIBABA_CLOUD_PROOF.md](docs/ALIBABA_CLOUD_PROOF.md)
- [docs/ARCHITECTURE_DIAGRAM.md](docs/ARCHITECTURE_DIAGRAM.md)
- [docs/HACKATHON_WINNING_PLAN.md](docs/HACKATHON_WINNING_PLAN.md)
