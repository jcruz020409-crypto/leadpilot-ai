import { loadLeadPilotEnv } from "./env-loader";
import type { BusinessSummary, CompetitorSearchSource } from "./types";

export interface CompetitorSearchProvider {
  search(summary: BusinessSummary): Promise<CompetitorSearchSource[]>;
}

export class NoopCompetitorSearchProvider implements CompetitorSearchProvider {
  async search(_summary: BusinessSummary): Promise<CompetitorSearchSource[]> {
    return [];
  }
}

export class ExaCompetitorSearchProvider implements CompetitorSearchProvider {
  private readonly apiKey = process.env.EXA_API_KEY;
  private readonly baseUrl = process.env.EXA_BASE_URL ?? "https://api.exa.ai";

  async search(summary: BusinessSummary): Promise<CompetitorSearchSource[]> {
    if (!this.apiKey) {
      return [];
    }

    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey
      },
      body: JSON.stringify({
        query: `direct competitors and market alternatives for ${summary.companyName} in ${summary.category}. Target customer: ${summary.targetCustomer}.`,
        type: "auto",
        numResults: 5,
        contents: {
          text: {
            maxCharacters: 600
          }
        }
      })
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        text?: string;
        highlights?: string[];
      }>;
    };

    return (data.results ?? [])
      .filter((result) => result.title && result.url)
      .map((result) => ({
        title: result.title ?? "Competitor source",
        url: result.url ?? "",
        snippet: compactSnippet(result.text ?? result.highlights?.join(" ") ?? "")
      }));
  }
}

export function createDefaultCompetitorSearchProvider(): CompetitorSearchProvider {
  loadLeadPilotEnv();
  if (process.env.EXA_API_KEY) {
    return new ExaCompetitorSearchProvider();
  }
  return new NoopCompetitorSearchProvider();
}

function compactSnippet(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}
