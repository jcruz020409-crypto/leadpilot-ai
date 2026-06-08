# Acceptance Criteria

Status: draft

## Demo 1 Acceptance

- A user can enter `https://empresa.com` or another valid public company URL.
- The system rejects invalid URLs and unsafe network targets.
- The system fetches public website content within configured limits.
- Manager Agent coordinates the analysis state from URL submission to final
  output.
- Research Agent produces a Business Summary from website, allowed public
  social, and sector context.
- Opportunity Agent produces Detected Problems with evidence and rationale.
- Pricing Agent produces a Sales Opportunity Score from 0 to 100 with reasons and
  confidence.
- Pricing Agent produces an Estimated Budget with complexity and ROI
  assumptions.
- Proposal Agent produces a Proposal Draft, outreach email, plan of work, and
  Recommended Next Steps.
- Manager Agent assembles a Final Analysis Report containing all major sections.
- Memory Agent saves the analyzed company, decisions, and preferences without
  storing secrets.
- A user can copy the proposal output.
- A user can copy or export the full report.
- A user can regenerate the proposal without refetching the website.
- Every agent run records agent name, prompt version, status, and output
  metadata.
- Every analysis records source URL, final URL, timestamp, and fetch status.

## Demo Acceptance

- Local demo can run with one web process, one worker process, and one database.
- Demo can use a mocked website/Qwen response if external keys are not
  configured.
- Demo can use a real Qwen Cloud key only through environment variables.
- No secrets are committed.
