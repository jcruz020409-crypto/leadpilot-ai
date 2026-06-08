import { lookup } from "node:dns/promises";
import net from "node:net";
import type { SafeUrlResult } from "./types";

const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain"]);

export interface UrlSafetyOptions {
  resolveDns?: boolean;
}

export async function assertSafeHttpUrl(
  rawUrl: string,
  options: UrlSafetyOptions = {}
): Promise<SafeUrlResult> {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return {
      allowed: false,
      reason: "invalid_url",
      message: "Enter a valid public website URL."
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      allowed: false,
      reason: "unsupported_scheme",
      message: "Only http and https URLs are supported."
    };
  }

  parsed.hash = "";
  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".localhost")) {
    return {
      allowed: false,
      reason: "blocked_host",
      message: "Localhost URLs are blocked."
    };
  }

  if (isPrivateOrLocalAddress(hostname)) {
    return {
      allowed: false,
      reason: "blocked_private_network",
      message: "Private network URLs are blocked."
    };
  }

  if (options.resolveDns) {
    try {
      const addresses = await lookup(hostname, { all: true, verbatim: true });
      if (addresses.some((address) => isPrivateOrLocalAddress(address.address))) {
        return {
          allowed: false,
          reason: "blocked_private_network",
          message: "This hostname resolves to a private network address."
        };
      }
    } catch {
      return {
        allowed: false,
        reason: "dns_lookup_failed",
        message: "The hostname could not be resolved."
      };
    }
  }

  return {
    allowed: true,
    normalizedUrl: parsed.toString(),
    hostname
  };
}

export function isPrivateOrLocalAddress(value: string): boolean {
  const ipVersion = net.isIP(value);
  if (ipVersion === 4) {
    return isPrivateIpv4(value);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(value);
  }

  return false;
}

function isPrivateIpv4(value: string): boolean {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

