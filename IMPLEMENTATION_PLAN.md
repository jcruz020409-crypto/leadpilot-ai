# Implementation Plan

Status: draft

## Phase 0: Project Foundation

- Create monorepo structure.
- Add TypeScript, linting, formatting, test runner, and CI basics.
- Add `.env.example` and secret handling rules.
- Add database schema and migration workflow.

## Phase 1: Demo 1 Workbench

- Build a URL intake screen.
- Build analysis progress states.
- Build results view with Business Summary, Detected Problems, Sales
  Opportunity Score, Estimated Budget, Proposal Draft, and Recommended Next
  Steps.
- Build Final Analysis Report view.
- Add copy and regenerate actions.

## Phase 2: Website Analysis Pipeline

- Implement URL validation and SSRF protection.
- Implement website fetch adapter with timeout, redirect, content-type, and byte
  limits.
- Implement HTML/text extraction.
- Add PostgreSQL-backed jobs table.
- Add worker process with job claiming and retries.

## Phase 3: Agent MVP

- Implement Qwen provider adapter.
- Define structured generation contracts.
- Implement Manager, Research, Opportunity, Pricing, Proposal, and Memory
  agents.
- Implement report assembly in the Manager Agent.
- Persist agent runs and surface reasoning in the UI.

## Phase 4: Saved Analyses

- Store website snapshots and generated outputs.
- Add analysis history.
- Add proposal versioning.
- Add report versioning.
- Add company memory, decisions, and user preference memory.
- Add audit log coverage.

## Phase 5: Sales Autopilot Expansion

- Build auth and workspace shell.
- Build ICP editor.
- Build lead import, validation, and lead list.
- Add PostgreSQL-backed jobs table.
- Add worker process with job claiming and retries.
- Build approval queue.
- Implement email provider adapter.
- Add suppression checks and rate limits.
- Add send job and outbound message timeline.
- Add inbound webhook endpoint.
- Verify provider signatures.
- Classify replies and update lead state.
- Add operator override.

## Phase 6: Hardening

- Add integration tests for URL fetching, jobs, agents, approvals, and webhooks.
- Add audit log coverage.
- Add production deployment guide.
- Review security checklist before first public demo.
