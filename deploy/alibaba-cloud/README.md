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

## ECS Console Checklist

Use this when creating the Alibaba Cloud ECS instance from the console.

- Billing method: pay-as-you-go is acceptable for the proof deployment.
- Region: choose the region you will record in the proof video. If you select
  Singapore in the console, set `ALIBABA_CLOUD_REGION=ap-southeast-1`.
- Network: create or select a VPC and vSwitch in the same region and zone as
  the instance.
- Instance type: `ecs.e-c1m1.large` with 2 vCPU and 2 GiB memory is enough for
  a small proof run if the Docker image is built elsewhere and only pulled on
  the instance. Use at least 4 GiB memory if you plan to build the Next.js app
  directly on the ECS instance.
- Image: use a Linux image such as Ubuntu LTS or Alibaba Cloud Linux. The
  Dockerfile already provides the Node.js 22 runtime inside the container.
- System disk: 40 GiB is sufficient for a demo container host. Enable snapshots
  if the instance will be kept after the proof video.
- Public IP: assign a public IPv4 address or use an EIP so the proof endpoints
  can be reached from the browser.
- Bandwidth: 5 Mbps is enough for a short demo and API proof flow.
- Security group: allow HTTP `80` and HTTPS `443` from the internet. Restrict
  SSH `22` to your own trusted IP address, and keep RDP `3389` closed for Linux
  instances. ICMP is optional.
- Logon credential: prefer a key pair and `ecs-user`. Avoid password login and
  avoid using `root` for routine access.
- Backups: automatic file backup is optional for a short proof deployment. If
  you leave it enabled, verify the billing terms first.

The default Compose file exposes the app on port `3000`. For a public proof URL,
either temporarily allow TCP `3000` from your IP while testing, or place Nginx,
Caddy, or an Alibaba Cloud load balancer in front of the app on ports `80` and
`443`.

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
