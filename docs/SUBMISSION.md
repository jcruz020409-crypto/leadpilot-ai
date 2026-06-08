# Submission

## Submitter Checklist

- [x] Public repository URL: `https://github.com/jcruz020409-crypto/leadpilot-ai`
- [x] Open-source license file: [LICENSE](../LICENSE)
- [x] Code evidence for Alibaba Cloud / Qwen Cloud:
  [apps/web/src/lib/qwen-provider.ts](../apps/web/src/lib/qwen-provider.ts)
- [x] Architecture diagram: [docs/ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)
- [x] Text project description included below.
- [x] Submission category included below.
- [ ] Confirm GitHub detects the MIT license in the repository About section.
- [ ] Add public Alibaba Cloud backend proof video URL.
- [ ] Add public 3-minute demo video URL.
- [ ] Optional: add blog or social post URL about building with QwenCloud.

## Repository URL

```text
https://github.com/jcruz020409-crypto/leadpilot-ai
```

## Category

- Primary category: Agent Society.
- Secondary category: Autopilot Agent.

## Project Description

LeadPilot AI is a multi-agent AI sales autopilot for software agencies and
freelancers. The user pastes a company URL such as `https://example.com` and can add optional social profile URLs.
LeadPilot AI analyzes the site and social context through multiple agents, summarizes the business,
detects sales problems, calculates commercial opportunity, estimates budget,
generates a proposal draft, recommends next steps, and produces a final report.

## Key Functionality

- Manager Agent coordinates the full workflow.
- Research Agent investigates the website, optional social profiles, and sector context.
- Opportunity Agent detects business problems and possible automations.
- Pricing Agent calculates opportunity score, complexity, ROI assumptions, and
  estimated budget.
- Proposal Agent generates a proposal, outreach email, and work plan.
- Memory Agent stores analyzed companies, prior decisions, and preferences.
- Qwen Cloud powers structured generation through the DashScope
  OpenAI-compatible API.

## Open Source License

MIT License: [LICENSE](../LICENSE)

## Architecture Diagram

See:

- [README.md#architecture](../README.md#architecture)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [docs/ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)

## Alibaba Cloud / Qwen Cloud Evidence

Code-level evidence:

- [apps/web/src/lib/qwen-provider.ts](../apps/web/src/lib/qwen-provider.ts)
- [apps/web/src/app/api/analyze/route.ts](../apps/web/src/app/api/analyze/route.ts)
- [docs/ALIBABA_CLOUD_PROOF.md](ALIBABA_CLOUD_PROOF.md)

Backend deployment proof video:

```text
TODO_ALIBABA_BACKEND_PROOF_VIDEO_URL
```

## Demo Video

```text
TODO_PUBLIC_DEMO_VIDEO_URL
```

## Optional Blog Or Social Post

```text
TODO_OPTIONAL_BLOG_OR_SOCIAL_POST_URL
```

## Run Locally

```bash
npm install
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Open:

```text
http://127.0.0.1:3001
```

## Verification

```bash
npm test
npm run test:coverage
npm run typecheck
npm run build
```

Current local verification:

- 24 tests passing across 9 test files.
- 90.35% statement coverage and 91.48% line coverage.
- TypeScript check passing.
- Next.js build passing.
