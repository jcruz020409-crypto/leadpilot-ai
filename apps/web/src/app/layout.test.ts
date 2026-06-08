import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("RootLayout translation guard", () => {
  it("prevents browser auto-translation from mutating SSR text before hydration", () => {
    const source = readFileSync(path.join(process.cwd(), "apps/web/src/app/layout.tsx"), "utf8");

    expect(source).toContain('translate="no"');
    expect(source).toContain('className="notranslate"');
    expect(source).toContain('google: "notranslate"');
  });
});
