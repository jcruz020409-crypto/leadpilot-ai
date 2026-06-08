import { load } from "cheerio";
import { assertSafeHttpUrl } from "./url-safety";
import type { WebsiteSnapshot } from "./types";

export interface WebsiteFetcher {
  fetch(url: string): Promise<WebsiteSnapshot>;
}

export interface StaticWebsiteSnapshotInput {
  finalUrl: string;
  title: string;
  text: string;
  description?: string;
  status?: number;
}

export class StaticWebsiteFetcher implements WebsiteFetcher {
  constructor(private readonly snapshot: StaticWebsiteSnapshotInput) {}

  async fetch(url: string): Promise<WebsiteSnapshot> {
    return {
      sourceUrl: url,
      finalUrl: this.snapshot.finalUrl,
      title: this.snapshot.title,
      description: this.snapshot.description,
      text: this.snapshot.text,
      status: this.snapshot.status ?? 200,
      fetchedAt: new Date().toISOString()
    };
  }
}

export interface LiveWebsiteFetcherOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

export class LiveWebsiteFetcher implements WebsiteFetcher {
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly maxRedirects: number;

  constructor(options: LiveWebsiteFetcherOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 12000;
    this.maxBytes = options.maxBytes ?? 900_000;
    this.maxRedirects = options.maxRedirects ?? 4;
  }

  async fetch(url: string): Promise<WebsiteSnapshot> {
    const sourceSafety = await assertSafeHttpUrl(url, { resolveDns: true });
    if (!sourceSafety.allowed) {
      throw new Error(sourceSafety.message);
    }

    let currentUrl = sourceSafety.normalizedUrl;
    let response: Response | undefined;

    for (let redirect = 0; redirect <= this.maxRedirects; redirect += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        response = await fetch(currentUrl, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "user-agent": "LeadPilotAI/0.1 (+https://github.com/jcruz020409-crypto/leadpilot-ai)",
            accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1"
          }
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!isRedirect(response.status)) {
        break;
      }

      const location = response.headers.get("location");
      if (!location) {
        break;
      }

      const nextUrl = new URL(location, currentUrl).toString();
      const redirectSafety = await assertSafeHttpUrl(nextUrl, { resolveDns: true });
      if (!redirectSafety.allowed) {
        throw new Error(redirectSafety.message);
      }

      currentUrl = redirectSafety.normalizedUrl;
    }

    if (!response) {
      throw new Error("No response received from website.");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error("The URL did not return readable website content.");
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > this.maxBytes) {
      throw new Error("The website response is too large for the demo analysis.");
    }

    const html = await response.text();
    if (html.length > this.maxBytes) {
      throw new Error("The website content is too large for the demo analysis.");
    }

    const extracted = extractReadableWebsiteText(html);
    return {
      sourceUrl: url,
      finalUrl: response.url || currentUrl,
      title: extracted.title || new URL(currentUrl).hostname,
      description: extracted.description,
      text: extracted.text,
      status: response.status,
      fetchedAt: new Date().toISOString()
    };
  }
}

export function extractReadableWebsiteText(html: string): {
  title: string;
  description?: string;
  text: string;
} {
  const $ = load(html);
  $("script, style, noscript, svg, iframe, nav, footer").remove();

  const title = $("title").first().text().trim() || $("h1").first().text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim();
  const chunks = [
    title,
    description,
    $("h1, h2, h3, p, li, a").toArray().map((element) => $(element).text().trim()).join(" ")
  ];

  return {
    title,
    description,
    text: compactText(chunks.filter(Boolean).join(" ")).slice(0, 12_000)
  };
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

function compactText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

