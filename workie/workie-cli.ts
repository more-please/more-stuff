#!/usr/bin/env node

/**
 * Entry point for the `workie` command. Locates `workie.config.ts` (walking
 * up from the current directory), loads it, and generates the workflow files.
 */

import { dirname } from "node:path";
import { argv, cwd, exit } from "node:process";
import { generate } from "./src/generate.ts";
import { findConfig, loadConfig } from "./src/loadConfig.ts";

async function main(args: string[]): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(
      [
        "Usage: workie",
        "",
        "Generates GitHub Actions workflows from a workie.config.ts file.",
        "The config file is located by walking up from the current directory.",
        "",
      ].join("\n"),
    );
    return 0;
  }

  const configPath = findConfig(cwd());
  if (!configPath) {
    console.error(
      "workie: no workie.config.ts found in the current directory or any parent.",
    );
    return 1;
  }
  const config = await loadConfig(configPath);
  await generate(config, { cwd: dirname(configPath) });
  return 0;
}

try {
  exit(await main(argv.slice(2)));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  exit(1);
}
