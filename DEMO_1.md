# Demo 1

Status: draft

## Objective

The user enters:

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

## Input

Required:

- Public company website URL.

Optional later:

- Target service category.
- Preferred language.
- Proposal tone.
- Currency.
- Budget package presets.

## Output Contract

```json
{
  "businessSummary": {
    "companyName": "string",
    "category": "string",
    "targetCustomer": "string",
    "valueProposition": "string",
    "confidence": 0.0
  },
  "detectedProblems": [
    {
      "title": "string",
      "description": "string",
      "evidence": "string",
      "businessImpact": "string",
      "automationPotential": "string",
      "confidence": 0.0
    }
  ],
  "salesOpportunityScore": {
    "score": 0,
    "reasons": ["string"],
    "risks": ["string"],
    "recommendedAngle": "string",
    "confidence": 0.0
  },
  "budgetEstimate": {
    "currency": "USD",
    "min": 0,
    "max": 0,
    "complexity": "low | medium | high",
    "roiAssumptions": ["string"],
    "packageRecommendation": "string",
    "assumptions": ["string"],
    "confidence": 0.0
  },
  "proposalDraft": {
    "title": "string",
    "executiveSummary": "string",
    "recommendedScope": ["string"],
    "emailDraft": "string",
    "workPlan": ["string"],
    "timeline": "string",
    "investment": "string",
    "nextStep": "string"
  },
  "recommendedNextSteps": ["string"],
  "finalReport": {
    "title": "string",
    "sections": [
      {
        "heading": "string",
        "content": "string"
      }
    ],
    "markdown": "string",
    "generatedAt": "ISO-8601 timestamp"
  }
}
```

## Demo Flow

1. Validate the submitted URL.
2. Manager Agent creates the analysis plan.
3. Research Agent investigates website, public social signals, and sector.
4. Opportunity Agent detects problems, automations, and improvements.
5. Pricing Agent estimates complexity, ROI, and budget.
6. Proposal Agent generates the proposal, email, and work plan.
7. Manager Agent assembles the Final Analysis Report.
8. Memory Agent records the analyzed company, decisions, and preferences.
9. Render report page with copy/regenerate/export actions.

## Non-Negotiables

- Do not fetch localhost, private network, or unsupported schemes.
- Do not require email sending for Demo 1.
- Do not invent unsupported facts.
- Do not commit API keys.
- Keep the first screen focused on the actual URL analysis experience.
