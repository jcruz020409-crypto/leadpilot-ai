import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface LeadPilotEnvLoadResult {
  loaded: boolean;
  path?: string;
}

const ENV_FILES = [".env.local", ".env"];

export function loadLeadPilotEnv(startDir = process.cwd()): LeadPilotEnvLoadResult {
  const envPath = findEnvFile(startDir);
  if (!envPath) {
    return { loaded: false };
  }

  const parsed = parseEnvFile(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return { loaded: true, path: envPath };
}

function findEnvFile(startDir: string): string | undefined {
  let current = path.resolve(startDir);

  for (let depth = 0; depth < 5; depth += 1) {
    for (const file of ENV_FILES) {
      const candidate = path.join(current, file);
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }

  return undefined;
}

function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    values[key] = unquote(rawValue);
  }

  return values;
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
