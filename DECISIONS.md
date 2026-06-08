# Decisions

Status: draft

## ADR-001: Use A TypeScript Monorepo

Decision: Use TypeScript across web, worker, shared domain packages, provider
adapters, and tests.

Reason: The MVP needs shared contracts between UI, API, agents, and database
schemas. A single language reduces integration cost.

## ADR-002: Use Human Approval Before Outbound Send

Decision: All outbound email sends require explicit user approval in the MVP.

Reason: Sales outreach has compliance, brand, deliverability, and consent risks.
The system should prove draft quality before autonomous execution.

## ADR-002A: Make Demo 1 URL-In Proposal-Out

Decision: The first demo starts with a single company URL and produces a
proposal package: Business Summary, Detected Problems, Sales Opportunity Score,
Estimated Budget, Proposal Draft, and Recommended Next Steps.

Reason: This demonstrates the multi-agent value quickly without requiring CRM
setup, email providers, deliverability controls, or lead lists.

## ADR-003: Use PostgreSQL As Source Of Truth And MVP Queue

Decision: Store business data and background jobs in PostgreSQL for MVP.

Reason: This avoids adding Redis or a workflow engine before throughput justifies
it, while preserving retry and audit behavior.

## ADR-004: Isolate Qwen Cloud Behind A Provider Adapter

Decision: Application code calls a local AI provider interface, not Qwen SDK/API
directly.

Reason: Model names, endpoints, regions, protocols, retries, and response
formats can change. The adapter keeps these details contained.

## ADR-004A: Use Qwen Cloud As The AI Provider

Decision: LeadPilot AI uses Qwen Cloud as its AI provider for the MVP.

Reason: The project is positioned as a multi-agent AI sales autopilot powered by
Qwen Cloud, so all agent generation and structured analysis should route through
the Qwen provider adapter.

## ADR-005: Start With Internal CRM State

Decision: Build an internal lead pipeline before native CRM sync.

Reason: External CRM APIs add complexity and irreversible writes. Internal state
lets the product validate workflow semantics first.

## ADR-006: Treat Website Fetching As A Security Boundary

Decision: Website fetching must go through a guarded adapter with SSRF
protection, redirects, content-type checks, timeout limits, and byte limits.

Reason: User-submitted URLs are untrusted input. The demo depends on URL intake,
so network safety must be designed from the start.
