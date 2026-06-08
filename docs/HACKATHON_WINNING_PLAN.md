# Hackathon Winning Plan

Status: active improvement plan

## What Was Improved

These improvements target the judging criteria directly:

- Added Qwen Cloud execution trace per agent.
- Added JSON Schema structured output mode for Qwen calls.
- Added provider metadata: model, response format, latency, fallback status,
  validation status, and token usage when returned.
- Added Memory Agent digest and recent memory count.
- Enriched the Final Analysis Report with ROI assumptions and outreach email.
- Added browser-side PDF export for polished sales report handoff.
- Added optional social profile URLs as extra Research Agent context.
- Added explicit English-only generation instructions for Qwen outputs.
- Added live agent status UI, Agent Discussion, visual score, ROI projection,
  and visible Memory Agent history.
- Added per-agent Qwen personas for Research, Opportunity, Pricing, and
  Proposal agents.
- Added root `.env.local` loading and `/api/provider-status` so live Qwen mode
  can be verified without exposing secrets.
- Added human-in-the-loop approval controls, agent conflict resolution,
  opportunity heatmap, and memory score comparison.
- Added submission docs, Alibaba Cloud proof docs, architecture diagram, and MIT
  license.

## Why This Helps

### Technical Depth And Engineering

Qwen is not treated as a black-box text generator. The backend isolates Qwen
behind a provider adapter, asks for structured JSON Schema output, applies
per-agent personas, records call metadata, and falls back safely when the
provider is unavailable.

### Innovation And Creativity In AI

The agent society is visible. Manager, Research, Opportunity, Pricing, Proposal,
and Memory agents each produce traceable outputs, visible discussion, and a
final manager-approved report. The UI also shows conflict resolution and a
human approval checkpoint before final proposal delivery.

### Value And Impact

The workflow solves a real agency/freelancer problem: prospect analysis and
proposal creation. The report includes business summary, detected problems,
score, opportunity heatmap, budget, ROI projection, ROI assumptions, proposal,
email, and next steps.

### Presentation And Documentation

The repo now includes a submission checklist, architecture diagram, Alibaba
Cloud proof file, and clear run instructions.

## Remaining Highest-Impact Work

1. Deploy backend on Alibaba Cloud and record proof video.
2. Record a 3-minute public demo video.
3. Add real Qwen call evidence in the demo while hiding secrets.
4. Add a public live demo URL if deployment budget allows.

## Official References Used

- Alibaba Cloud Model Studio Qwen API supports OpenAI-compatible
  `/chat/completions` endpoints and region-specific base URLs:
  https://www.alibabacloud.com/help/en/model-studio/use-qwen-by-calling-api
- Alibaba Cloud Model Studio structured output supports JSON Object and JSON
  Schema modes:
  https://www.alibabacloud.com/help/doc-detail/2862209.html
- Alibaba Cloud Model Studio provides Qwen APIs and OpenAI-compatible APIs:
  https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio
- Alibaba Cloud Function Compute supports Node.js code packages:
  https://www.alibabacloud.com/help/en/functioncompute/code-development-overview
