# Architecture Diagram

```mermaid
flowchart LR
  User["User"] --> Web["Next.js Frontend: website + social URLs"]
  Web --> API["Backend API: POST /api/analyze"]
  API --> Guard["URL Safety Guard"]
  Guard --> Fetcher["Website + Social Fetcher"]
  Fetcher --> Snapshot["Website + Social Snapshots"]
  Snapshot --> Manager["Manager Agent"]
  Manager --> Research["Research Agent"]
  Research --> Opportunity["Opportunity Agent"]
  Opportunity --> Pricing["Pricing Agent"]
  Opportunity --> Heatmap["Opportunity Heatmap"]
  Pricing --> Proposal["Proposal Agent"]
  Pricing --> ROI["ROI Projection"]
  Pricing --> Conflict["Conflict Resolution"]
  Proposal --> Report["Final Report Assembly"]
  Proposal --> Debate["Agent Discussion"]
  Proposal --> Approval["Human Approval"]
  Debate --> Report
  ROI --> Report
  Heatmap --> Report
  Conflict --> Report
  Approval --> Report
  Report --> Memory["Memory Agent"]
  Memory --> Store[("Memory Store")]

  Research --> Qwen["Qwen Cloud / Alibaba DashScope"]
  Opportunity --> Qwen
  Pricing --> Qwen
  Proposal --> Qwen
  Qwen --> Trace["AI Execution Trace"]
  Trace --> Web

  API --> Response["Business Summary + Problems + Score + Heatmap + Approval + Memory + Report"]
  Response --> Web
```

## Notes

- Qwen Cloud is isolated behind `QwenCloudProvider`.
- Qwen calls use structured output with JSON Schema mode when possible.
- Qwen prompts include per-agent personas for research, opportunity detection,
  pricing, and proposal generation.
- Agent trace captures provider, model, response format, latency, fallback, and
  validation state.
- The frontend visualizes agent status, conflict resolution, heatmap, human
  approval, agent discussion, score, ROI, and memory.
- Website and optional social profile fetching are isolated behind a
  safety-checked adapter.
- Memory is local JSONL in the MVP and can move to PostgreSQL or Alibaba Cloud
  storage later.
- The backend can run on Alibaba Cloud ECS, ACK, or Function Compute with the
  same environment variables.
