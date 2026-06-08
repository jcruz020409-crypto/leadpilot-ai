import type { WebsiteSnapshot } from "../../../lib/types";
import type { WebsiteFetcher } from "../../../lib/website-fetcher";

export function createAnalyzeFetcher(): WebsiteFetcher | undefined {
  if (process.env.LEADPILOT_MOCK_WEBSITE !== "true") {
    return undefined;
  }

  return new MockWebsiteContextFetcher();
}

class MockWebsiteContextFetcher implements WebsiteFetcher {
  async fetch(url: string): Promise<WebsiteSnapshot> {
    const hostname = safeHostname(url);
    const isSocialProfile = isSocialHostname(hostname);
    return {
      sourceUrl: url,
      finalUrl: url,
      title: isSocialProfile ? `${hostname} Social Profile` : `${hostname} Growth Operations`,
      text: isSocialProfile
        ? [
            `${hostname} social profile mentions customer conversations, market positioning, hiring signals, and recent activity.`,
            "The profile adds context about audience, brand tone, growth stage, and possible outreach angles."
          ].join(" ")
        : [
            `${hostname} sells B2B services and manages leads through manual processes.`,
            "The website suggests opportunities around CRM automation, customer response speed, reporting, and proposal workflows.",
            "The company appears to serve growing teams that need clearer sales operations and faster follow-up."
          ].join(" "),
      status: 200,
      fetchedAt: new Date().toISOString()
    };
  }
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "example.com";
  }
}

function isSocialHostname(hostname: string): boolean {
  return ["linkedin.com", "x.com", "twitter.com", "facebook.com", "instagram.com", "youtube.com", "tiktok.com"].some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}
