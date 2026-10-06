import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { WorkieConfig } from "./types.ts";

const CONFIG_FILENAMES = [
  "workie.config.ts",
  "workie.config.mts",
  "workie.config.js",
  "workie.config.mjs",
];

/** Locate the config file, starting from `cwd` and walking up to the repo root. */
export function findConfig(cwd: string): string | null {
  let current = resolve(cwd);
  while (true) {
    for (const name of CONFIG_FILENAMES) {
      const candidate = join(current, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    const parent = resolve(current, "..");
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

/** Load a config module and return its default export. */
export async function loadConfig(path: string): Promise<WorkieConfig> {
  const url = pathToFileURL(path).href;
  const mod = (await import(url)) as { default?: unknown };
  const config = mod.default;
  if (!config || typeof config !== "object") {
    throw new Error(
      `workie: config file ${path} must have a default export (use defineConfig).`,
    );
  }
  return config as WorkieConfig;
}
