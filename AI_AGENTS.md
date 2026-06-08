# AI Agents

Status: draft

## Agent Operating Model

Agents are deterministic workflow steps backed by Qwen Cloud calls and local
policy logic. They are not independent autonomous services in the first demo.
The worker orchestrates them through jobs, state transitions, and
schema-validated outputs.

## Shared Agent Rules

- Accept only scoped input from the orchestrator.
- Return structured output matching the agent schema.
- Include confidence and reason fields where decisions affect users.
- Never send messages, mutate provider state, or bypass user review.
- Never invent unsupported facts, private company details, contact details, or
  source citations.
- Store prompt version and input hash for every run.

## Demo 1 Agents

### Manager Agent

Coordinates the full analysis. It creates the plan, calls the right agents in
order, checks whether outputs are complete, assembles the Final Analysis Report,
and decides when a result is ready for review.

### URL Safety Guard

Validates the submitted URL before network access. It blocks unsupported
schemes, localhost, private IP ranges, link-local addresses, and excessive
redirects.

### Website Fetcher

Fetches allowed public pages with timeout, byte, and content-type limits. It
returns a website snapshot, status code, final URL, title, metadata, and raw text
candidate.

### Research Agent

Investigates the company using the submitted website, allowed public social
signals, and sector context. It extracts business-relevant text, removes
navigation noise, keeps useful metadata, and flags insufficient content.

It produces the Business Summary:

- What the business sells.
- Target customer.
- Primary value proposition.
- Market/category.
- Notable trust signals.
- Missing or uncertain information.

### Opportunity Agent

Detects problems, automations, and improvements that LeadPilot AI, a software
agency, or a freelancer could pitch:

- AI automation.
- Sales process improvement.
- CRM or lead management.
- Website conversion.
- Customer support automation.
- Reporting and analytics.
- Operations workflow automation.

It produces Detected Problems with evidence, impact, recommended solution, and
confidence.

### Pricing Agent

Calculates Sales Opportunity Score, complexity, estimated budget, and ROI
assumptions using:

- Positive signals.
- Negative signals.
- Urgency.
- Estimated ability to pay.
- Fit for automation or AI services.
- Ease of proposal.
- Implementation complexity.
- Expected ROI.
- Confidence.

### Proposal Agent

Creates a tailored proposal draft with:

- Executive summary.
- Detected problems.
- Recommended solution.
- Scope.
- Timeline.
- Estimated budget.
- Outreach email.
- Plan of work.
- Next step.

The report assembly step packages the Proposal Agent output with the Business
Summary, Detected Problems, Sales Opportunity Score, Estimated Budget, and
Recommended Next Steps.

### Memory Agent

Stores analyzed companies, previous decisions, proposal preferences, scoring
signals, and regenerated-output feedback. It must not store secrets, raw API
keys, or unnecessary personal data.

## Future Agents

### Compliance Agent

Checks drafts against workspace policy, suppression state, blocked terms, consent
status, and quality rules. It can recommend edits but cannot approve sends.

### Reply Classifier Agent

Classifies replies into buckets:

- Interested.
- Not now.
- Objection.
- Referral.
- Unsubscribe.
- Out of office.
- Wrong person.
- Needs manual review.

### CRM Scribe Agent

Writes concise timeline notes and updates lead status after approved events.
