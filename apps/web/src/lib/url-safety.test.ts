import { describe, expect, it } from "vitest";
import { assertSafeHttpUrl } from "./url-safety";

describe("assertSafeHttpUrl", () => {
  it("allows public http and https company URLs", async () => {
    const result = await assertSafeHttpUrl("https://example.com/path");

    expect(result.allowed).toBe(true);
    if (!result.allowed) throw new Error("Expected URL to be allowed.");
    expect(result.normalizedUrl).toBe("https://example.com/path");
  });

  it("rejects localhost and private network targets", async () => {
    await expect(assertSafeHttpUrl("http://localhost:3000")).resolves.toMatchObject({
      allowed: false,
      reason: "blocked_host"
    });

    await expect(assertSafeHttpUrl("https://192.168.1.10")).resolves.toMatchObject({
      allowed: false,
      reason: "blocked_private_network"
    });
  });

  it("rejects unsupported schemes and malformed URLs", async () => {
    await expect(assertSafeHttpUrl("file:///etc/passwd")).resolves.toMatchObject({
      allowed: false,
      reason: "unsupported_scheme"
    });

    await expect(assertSafeHttpUrl("not a url")).resolves.toMatchObject({
      allowed: false,
      reason: "invalid_url"
    });
  });
});
