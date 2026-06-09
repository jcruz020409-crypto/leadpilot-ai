# Alibaba Cloud Backend Deployment

This folder is the code-level proof that LeadPilot AI can run its backend on
Alibaba Cloud infrastructure while using Alibaba Cloud Model Studio / Qwen Cloud
through DashScope.

## Proof Links for Submission

- Runtime container: `deploy/alibaba-cloud/Dockerfile`
- ECS Docker runtime: `deploy/alibaba-cloud/docker-compose.ecs.yml`
- ACK Kubernetes runtime: `deploy/alibaba-cloud/ack-deployment.yaml`
- Backend proof endpoint: `apps/web/src/app/api/deployment-proof/route.ts`
- Qwen Cloud provider: `apps/web/src/lib/qwen-provider.ts`

## Required Environment Variables

Set these in Alibaba Cloud ECS, ACK, or your container runtime. Do not commit
real values.

```env
DEPLOYMENT_PROVIDER=Alibaba Cloud
ALIBABA_CLOUD_RUNTIME=ECS Docker
ALIBABA_CLOUD_REGION=us-east-1
DASHSCOPE_API_KEY=your_qwen_cloud_key
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_TEXT_MODEL=qwen-plus
QWEN_REASONING_MODEL=qwen-plus
LEADPILOT_FORCE_MOCK=false
LEADPILOT_MOCK_WEBSITE=false
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

## ECS Deployment Path

1. Build the image:

```bash
docker build -f deploy/alibaba-cloud/Dockerfile -t leadpilot-ai:latest .
```

2. Push the image to Alibaba Cloud Container Registry:

```bash
docker tag leadpilot-ai:latest registry-intl.${ALIBABA_CLOUD_REGION}.aliyuncs.com/${ALIBABA_NAMESPACE}/leadpilot-ai:latest
docker push registry-intl.${ALIBABA_CLOUD_REGION}.aliyuncs.com/${ALIBABA_NAMESPACE}/leadpilot-ai:latest
```

3. On the ECS instance, pull and run with Compose:

```bash
export ALIBABA_REGISTRY_IMAGE=registry-intl.${ALIBABA_CLOUD_REGION}.aliyuncs.com/${ALIBABA_NAMESPACE}/leadpilot-ai:latest
docker compose -f deploy/alibaba-cloud/docker-compose.ecs.yml up -d
```

4. Verify:

```bash
curl https://your-alibaba-cloud-domain.com/api/deployment-proof
curl https://your-alibaba-cloud-domain.com/api/provider-status
```

The proof endpoint should return `deploymentProvider: "Alibaba Cloud"` and
`qwenCloud.apiKeyConfigured: true` when the Alibaba Cloud environment variables
are configured.

## ACK Deployment Path

Use `ack-deployment.yaml` when deploying to Alibaba Cloud Container Service for
Kubernetes. Create secrets before applying the manifest:

```bash
kubectl create secret generic leadpilot-ai-secrets \
  --from-literal=DASHSCOPE_API_KEY="$DASHSCOPE_API_KEY" \
  --from-literal=DATABASE_URL="$DATABASE_URL"

kubectl create configmap leadpilot-ai-config \
  --from-literal=ALIBABA_CLOUD_REGION="$ALIBABA_CLOUD_REGION"

kubectl apply -f deploy/alibaba-cloud/ack-deployment.yaml
```

## Hackathon Video Checklist

Record a short independent proof video showing:

1. Alibaba Cloud console with the ECS/ACK resource running.
2. The public backend URL.
3. `/api/deployment-proof` returning Alibaba Cloud runtime metadata.
4. `/api/provider-status` showing Qwen Cloud ready without exposing secrets.
5. A short `/api/analyze/jobs` run from the deployed URL.
