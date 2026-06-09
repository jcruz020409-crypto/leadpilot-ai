# Alibaba Cloud Proof

Status: Alibaba Cloud deployment files ready, deployment video pending.

## What This Proves

LeadPilot AI's backend is packaged for Alibaba Cloud runtime deployment and
integrates with Alibaba Cloud Model Studio / Qwen Cloud through the
OpenAI-compatible DashScope API. It also uses structured JSON output with JSON
Schema mode so each agent can request machine-validated output shapes.

The production code path is:

```text
Frontend
  -> POST /api/analyze
  -> runLeadPilotAnalysis()
  -> QwenCloudProvider.generateStructured()
  -> POST ${QWEN_BASE_URL}/chat/completions
  -> response_format: json_schema
```

## Code Links

- Alibaba Cloud deployment folder: [deploy/alibaba-cloud](../deploy/alibaba-cloud)
- Alibaba Cloud runtime container: [deploy/alibaba-cloud/Dockerfile](../deploy/alibaba-cloud/Dockerfile)
- ECS Docker deployment: [deploy/alibaba-cloud/docker-compose.ecs.yml](../deploy/alibaba-cloud/docker-compose.ecs.yml)
- ACK Kubernetes deployment: [deploy/alibaba-cloud/ack-deployment.yaml](../deploy/alibaba-cloud/ack-deployment.yaml)
- Backend deployment proof endpoint: [apps/web/src/app/api/deployment-proof/route.ts](../apps/web/src/app/api/deployment-proof/route.ts)
- API route: [apps/web/src/app/api/analyze/route.ts](../apps/web/src/app/api/analyze/route.ts)
- Provider status route: [apps/web/src/app/api/provider-status/route.ts](../apps/web/src/app/api/provider-status/route.ts)
- Qwen Cloud provider: [apps/web/src/lib/qwen-provider.ts](../apps/web/src/lib/qwen-provider.ts)
- Root env loader: [apps/web/src/lib/env-loader.ts](../apps/web/src/lib/env-loader.ts)
- Agent pipeline: [apps/web/src/lib/analysis-pipeline.ts](../apps/web/src/lib/analysis-pipeline.ts)
- Environment variables: [.env.example](../.env.example)
- Execution trace UI: [apps/web/src/app/page.tsx](../apps/web/src/app/page.tsx)

## Alibaba Cloud Environment Variables

```env
DEPLOYMENT_PROVIDER=Alibaba Cloud
ALIBABA_CLOUD_RUNTIME=ECS Docker
ALIBABA_CLOUD_REGION=your-region
DASHSCOPE_API_KEY=your_key_here
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_TEXT_MODEL=qwen-plus
QWEN_REASONING_MODEL=qwen-plus
QWEN_TIMEOUT_MS=60000
LEADPILOT_FORCE_MOCK=false
```

## Backend Runtime Proof To Record

Record a short independent video showing:

1. The backend running on Alibaba Cloud runtime infrastructure.
2. Environment variables configured without exposing secret values.
3. A request to the deployed `/api/deployment-proof` endpoint showing
   `deploymentProvider="Alibaba Cloud"` and runtime metadata.
4. A request to the deployed `/api/provider-status` endpoint showing
   `keyConfigured=true`, `forceMock=false`, and `liveReady=true`.
5. A request to the deployed `/api/analyze` endpoint.
6. A successful response containing `Business Summary`, `Detected Problems`,
   `Sales Opportunity Score`, `Estimated Budget`, `Proposal Draft`, and
   `Final Analysis Report`.
7. The AI Execution Trace showing provider, model, response format, latency, and
   validation status.
8. The code file `deploy/alibaba-cloud/Dockerfile` showing the backend runtime
   package for Alibaba Cloud.
9. The code file `apps/web/src/lib/qwen-provider.ts` showing the DashScope
   OpenAI-compatible API call and JSON Schema response format.

## Example API Test

```bash
curl "https://YOUR_ALIBABA_BACKEND_URL/api/deployment-proof"

curl -X POST "https://YOUR_ALIBABA_BACKEND_URL/api/analyze" \
  -H "content-type: application/json" \
  -d "{\"url\":\"https://example.com\",\"socialUrls\":[\"https://www.linkedin.com/company/example\",\"https://x.com/example\"]}"
```

Expected shape:

```json
{
  "ok": true,
  "result": {
    "businessSummary": {},
    "detectedProblems": [],
    "salesOpportunityScore": {},
    "budgetEstimate": {},
    "proposalDraft": {},
    "recommendedNextSteps": [],
    "finalReport": {},
    "agentRuns": []
  }
}
```
