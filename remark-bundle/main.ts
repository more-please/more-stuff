#!/usr/bin/env node

import { createWriteStream } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { bundleMarkdownFile } from "./remark-bundle.ts";

const usage = `Usage: remark-bundle <input.md> [--output <output.md>]

Bundle linked markdown files into a single document.
Local markdown links are replaced with internal anchors,

Options:
  -o, --output  Output file (default: stdout)
  -h, --help    Show this help message
`;

function fail(message: string): never {
  console.error(message);
  console.error(usage);
  process.exit(1);
}

export async function main(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      help: {
        type: "boolean",
        short: "h",
      },
      output: {
        type: "string",
        short: "o",
      },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(usage);
    process.exit(0);
  }

  const input = positionals[0] ?? fail("No input file provided");
  const output = values.output
    ? createWriteStream(values.output, "utf-8")
    : process.stdout;
  const url = pathToFileURL(input);
  const result = await bundleMarkdownFile(url);
  output.write(result);
}

if (import.meta.main) {
  main(process.argv.slice(2));
}
