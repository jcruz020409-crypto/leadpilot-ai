# Requirements

Status: draft

## Functional Requirements

- FR-001: Users can enter a valid company website URL.
- FR-002: The system validates URL format and blocks private, localhost, and
  unsafe network targets.
- FR-003: The system fetches allowed public website content with timeouts,
  redirects, and size limits.
- FR-004: The system extracts useful text and metadata from the website.
- FR-005: The system researches allowed public social and sector context when
  available.
- FR-006: The system summarizes the target business.
- FR-007: The system detects problems, automation opportunities, and possible
  improvements.
- FR-008: The system generates a Sales Opportunity Score with reasons and
  confidence.
- FR-009: The system estimates a budget range with complexity and ROI
  assumptions.
- FR-010: The system generates a tailored proposal draft, email draft, and work
  plan from the analysis.
- FR-011: The system generates recommended next steps.
- FR-012: The system produces a Final Analysis Report that packages the full
  multi-agent result.
- FR-013: The system saves analyzed companies, decisions, and user preferences
  through the Memory Agent.
- FR-014: Users can copy the proposal output or full report.
- FR-015: Users can regenerate an analysis, proposal, or report.
- FR-016: Users can review source URL, timestamp, prompt version, and agent run
  metadata.

## Non-Functional Requirements

- NFR-001: Website analysis jobs must be retryable and auditable.
- NFR-002: AI outputs must be schema-validated before persistence.
- NFR-003: URL fetching must protect against SSRF and excessive content size.
- NFR-004: Tenant data must be isolated by workspace when auth is enabled.
- NFR-005: Secrets must never be committed or logged.
- NFR-006: MVP should run locally with one web process, one worker, and one
  PostgreSQL database.
- NFR-007: Provider-specific code must stay behind adapters.
- NFR-008: A normal website analysis should complete in under 90 seconds.

## Compliance Requirements

- Fetch only public pages that the user intentionally submits.
- Do not bypass authentication, paywalls, robots restrictions, or rate limits.
- Do not infer private facts about a company without source support.
- Preserve audit logs for generated analysis and proposal outputs.
- Memory records must not store secrets or unnecessary personal data.
