import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("HistoryPage", () => {
  it("renders a dedicated analysis history and comparison workflow", () => {
    const source = readFileSync(path.join(process.cwd(), "apps/web/src/app/history/page.tsx"), "utf8");

    expect(source).toContain("Analysis History");
    expect(source).toContain("/api/history");
    expect(source).toContain("/api/history/");
    expect(source).toContain("Saved Full Report");
    expect(source).toContain("Complete Report");
    expect(source).toContain("Copy Report");
    expect(source).toContain("Open Report");
    expect(source).toContain("Export Previous PDF");
    expect(source).toContain("Compare Analyses");
    expect(source).toContain("Score Delta");
    expect(source).toContain("downloadLeadPilotPdf");
    expect(source).toContain("finalReport.sections.map");
  });
});
