# Architecture Diagram

![LeadPilot AI Architecture](assets/leadpilot-architecture.png)

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
- Memory uses Postgres when `DATABASE_URL` is configured, with local JSONL as
  a demo fallback.
- The backend deployment proof targets Alibaba Cloud ECS Docker, with an ACK
  Kubernetes manifest included as an alternative runtime.
