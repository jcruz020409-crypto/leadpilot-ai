# Deployment Guide

Status: draft

## Local Demo

```bash
npm install
npm run dev -- --hostname 127.0.0.1 --port 3001
```

For a deterministic demo without external calls:

```env
LEADPILOT_FORCE_MOCK=true
LEADPILOT_MOCK_WEBSITE=true
```

## Qwen Cloud Configuration

Create `.env.local`:

```env
DASHSCOPE_API_KEY=your_key_here
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_TEXT_MODEL=qwen-plus
QWEN_TIMEOUT_MS=60000
LEADPILOT_FORCE_MOCK=false
LEADPILOT_MOCK_WEBSITE=false
```

Never commit `.env.local`.

## Alibaba Cloud Proof Requirement

The submission requires proof that the backend runs on Alibaba Cloud. The repo
contains the code-level proof of Alibaba Cloud / Qwen API usage in:

- [apps/web/src/lib/qwen-provider.ts](apps/web/src/lib/qwen-provider.ts)
- [apps/web/src/app/api/analyze/route.ts](apps/web/src/app/api/analyze/route.ts)
- [docs/ALIBABA_CLOUD_PROOF.md](docs/ALIBABA_CLOUD_PROOF.md)

Still required outside this repo:

1. Deploy the backend to an Alibaba Cloud runtime.
2. Record a short independent proof video showing the backend running there.
3. Add the video URL to [docs/SUBMISSION.md](docs/SUBMISSION.md).

## Suggested Alibaba Cloud Runtime

Any of these is acceptable for the demo backend:

- Alibaba Cloud ECS running Node.js.
- Alibaba Cloud Container Service for Kubernetes.
- Alibaba Cloud Function Compute if adapted to a serverless deployment.

Minimum runtime requirements:

- Node.js 22 or compatible runtime.
- Environment variables from `.env.example`.
- Public HTTPS endpoint for the Next.js backend.

