import { NextResponse } from "next/server";

export const runtime = "nodejs";

function configured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  const deploymentProvider = process.env.DEPLOYMENT_PROVIDER ?? "local";
  const runtimeTarget = process.env.ALIBABA_CLOUD_RUNTIME ?? "not-configured";
  const region = process.env.ALIBABA_CLOUD_REGION ?? "not-configured";

  return NextResponse.json({
    service: "LeadPilot AI Backend",
    status: "running",
    deploymentProvider,
    runtimeTarget,
    region,
    qwenCloud: {
      provider: "Alibaba Cloud Model Studio / DashScope",
      endpoint: process.env.QWEN_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      model: process.env.QWEN_TEXT_MODEL ?? "qwen-plus",
      apiKeyConfigured: configured(process.env.DASHSCOPE_API_KEY)
    },
    memory: {
      databaseUrlConfigured: configured(process.env.DATABASE_URL),
      ssl: process.env.DATABASE_SSL ?? "true"
    },
    proof: {
      repositoryFile: "deploy/alibaba-cloud/Dockerfile",
      healthEndpoint: "/api/provider-status",
      deploymentProofEndpoint: "/api/deployment-proof"
    }
  });
}
