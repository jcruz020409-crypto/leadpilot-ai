# Spec

Status: draft

## MVP Product Spec

LeadPilot AI turns a company website URL into a sales-ready company analysis
and proposal for software agencies and freelancers. The first demo focuses on
one input and one output journey: `https://empresa.com` in, proposal package
out.

## Tracks

- Primary track: Agent Society.
- Secondary track: Autopilot Agent.

## First Demo Output

For a submitted company URL, the app must return:

- Business Summary.
- Detected Problems.
- Sales Opportunity Score.
- Estimated Budget.
- Proposal Draft.
- Recommended Next Steps.
- Final Analysis Report.

## User Stories

- As a user, I can enter a company URL so the system can analyze a prospect.
- As a user, I can see a concise summary of what the company does.
- As a user, I can see detected problems and improvement areas.
- As a user, I can see a sales opportunity score with reasons and confidence.
- As a user, I can see an estimated project budget with assumptions.
- As a user, I can get a proposal draft, email draft, and work plan tailored to
  the analyzed company.
- As a user, I can see recommended next steps.
- As a user, I can receive the full analysis as one report.
- As a user, I can copy or regenerate the proposal output.

## Screens

- URL analysis landing/workbench.
- Loading state with analysis stages.
- Report page with Business Summary, Detected Problems, Sales Opportunity
  Score, Estimated Budget, Proposal Draft, Recommended Next Steps, and a Final
  Analysis Report.
- Proposal editor or read-only preview with copy/export actions.
- Analysis history for recent URLs.

## State Machine

```text
url_submitted
  -> manager_planned
  -> website_fetched
  -> public_context_researched
  -> business_summarized
  -> problems_detected
  -> sales_opportunity_scored
  -> budget_estimated
  -> proposal_generated
  -> report_generated
  -> memory_saved
  -> ready_for_review
```

Failure states:

```text
rejected
invalid_url
fetch_failed
insufficient_content
agent_failed
needs_manual_review
```
