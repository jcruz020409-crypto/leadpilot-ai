# Project Final

Status: draft

## Name

LeadPilot AI

## Tracks

- Primary track: Agent Society.
- Secondary track: Autopilot Agent.

## AI

Qwen Cloud.

## Problem

Software agencies and freelancers lose hours:

- Searching for clients.
- Analyzing companies.
- Writing proposals.
- Qualifying opportunities.

## Solution

LeadPilot AI is a multi-agent system where several agents collaborate to analyze
a company, generate a commercial proposal, and produce a complete sales report.

## Agents

### 1. Manager Agent

Coordinates the full workflow, assigns tasks to the other agents, checks output
quality, assembles the final report, and decides when the proposal package is
ready.

### 2. Research Agent

Investigates:

- Website.
- Public social signals.
- Sector.

### 3. Opportunity Agent

Detects:

- Problems.
- Possible automations.
- Improvements.

### 4. Pricing Agent

Calculates:

- Estimated cost.
- Complexity.
- ROI assumptions.

### 5. Proposal Agent

Generates:

- Proposal.
- Email.
- Plan of work.
- Recommended next steps.

### 6. Memory Agent

Stores:

- Analyzed companies.
- Previous decisions.
- User preferences.

## MVP

The user pastes:

```text
https://empresa.com
```

The system returns:

- Business Summary.
- Detected Problems.
- Sales Opportunity Score.
- Estimated Budget.
- Proposal Draft.
- Recommended Next Steps.
- Final Analysis Report.

## System Flow

1. The user pastes `https://empresa.com`.
2. The system analyzes the site.
3. The system summarizes the business.
4. The system finds problems.
5. The system calculates the opportunity.
6. The system generates a proposal.
7. The system produces a report.
8. Multiple agents collaborate across the full flow.
