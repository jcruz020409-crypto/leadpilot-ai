# Tasks

Status: draft

## Foundation

- [ ] Create package manager workspace.
- [ ] Scaffold `apps/web`.
- [ ] Scaffold `apps/worker`.
- [ ] Scaffold shared packages.
- [ ] Configure TypeScript, lint, format, and tests.
- [ ] Add CI checks.

## Database

- [ ] Define analysis, website snapshot, company memory, detected problem,
      score, budget estimate, proposal, report, agent run, job, and audit
      schemas.
- [ ] Add migration workflow.
- [ ] Add seed data for local development.

## URL Analysis

- [ ] Build URL intake form.
- [ ] Add URL validation and SSRF protection.
- [ ] Add website fetch adapter.
- [ ] Add content extraction.
- [ ] Add analysis progress states.
- [ ] Add result page sections.
- [ ] Add Final Analysis Report view.

## AI

- [ ] Implement Qwen provider adapter.
- [ ] Define structured generation contracts.
- [ ] Create prompt templates for Manager, Research, Opportunity, Pricing,
      Proposal, and Memory agents.
- [ ] Add report assembly contract.
- [ ] Add schema validation for agent outputs.
- [ ] Add agent run persistence and redaction.

## Product

- [ ] Build proposal preview.
- [ ] Add copy proposal action.
- [ ] Add regenerate proposal action.
- [ ] Add analysis history.
- [ ] Add export action.

## Providers

- [ ] Implement website fetch provider interface.
- [ ] Add mock Qwen provider for local tests.
- [ ] Add Qwen Cloud provider implementation.

## Verification

- [ ] Unit-test URL safety rules.
- [ ] Integration-test job processing.
- [ ] Integration-test provider adapters with mocked network calls.
- [ ] E2E-test URL input to proposal output.
- [ ] Security review before deployment.
