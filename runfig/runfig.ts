#!/usr/bin/env tsx

import * as TOML from "smol-toml";
import * as YAML from "yaml";
import JSON5 from "json5";
import { parseArgs } from "node:util";
import { dirname, join } from "node:path";
import walkSync from "walk-sync";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "import-meta-resolve";
import { pathToFileURL } from "node:url";

const CONFIGS = ["json", "toml", "yaml", "yml"] as const;
type Config = (typeof CONFIGS)[number];

const CONFIG_GLOB = `{${CONFIGS.join(",")}}`;
const SCRIPT_GLOB = "{js,ts}";

type Formatter = (props: { module: string; obj: unknown }) => string;
type Parser = (data: string) => any;

type Args = {
  indir: string;
  outdir: string;
  recursive: boolean;
  list: boolean;
  print: boolean;
  files?: string[];
};

// --------------------------------------------------------------------
// Command-line parsing

try {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      indir: { type: "string", short: "i", default: "." },
      outdir: { type: "string", short: "o", default: "." },
      recursive: { type: "boolean", short: "r", default: false },
      list: { type: "boolean", short: "l", default: false },
      print: { type: "boolean", short: "p", default: false },
      unfig: { type: "boolean", short: "u", default: false },
    },
  });
  const args: Args = {
    ...(values as Args),
  };
  if (positionals.length > 0) {
    args.files = positionals;
  }
  if (values.unfig) {
    await unfig(args);
  } else {
    await runfig(args);
  }
} catch (e) {
  process.stderr.write(`*** ${e}\n`);
  process.exit(1);
}

// --------------------------------------------------------------------
// runfig(): generate configs from .ts modules

async function runfig(args: Args) {
  const toml: Formatter = ({ module, obj }) =>
    `# Auto-generated from ${module}\n\n${TOML.stringify(obj)}\n`;
  const yaml: Formatter = ({ module, obj }) =>
    `# Auto-generated from ${module}\n\n${YAML.stringify(obj)}`;
  const json: Formatter = ({ obj }) => JSON.stringify(obj, undefined, 2);
  const formatters: Record<Config, Formatter> = {
    json,
    toml,
    yaml,
    yml: yaml,
  };

  const modules =
    args.files ??
    walkSync(args.indir, {
      globs: [`${args.recursive ? "**/*" : "*"}.${CONFIG_GLOB}.${SCRIPT_GLOB}`],
    });
  if (modules.length === 0) {
    throw new Error("No input files found");
  }

  for await (const module of modules) {
    const config = module.substring(0, module.lastIndexOf("."));
    const ext = config.substring(config.lastIndexOf(".") + 1);
    const converter = formatters[ext as Config];
    if (!converter) {
      throw new Error(`Invalid filename (expected base.ext.ts): ${module}`);
    }
    const path = join(args.indir, module);
    const root = pathToFileURL(process.cwd()).href + "/";
    const resolved = resolve(`./${path}`, root);
    const { default: obj } = await import(resolved);
    const output = converter({ module, obj });
    const outputPath = join(args.outdir, config);
    writeOutput({ ...args, path, outputPath, output });
  }
}

// --------------------------------------------------------------------
// unfig(): generate .ts modules from configs

async function unfig(args: Args) {
  const toml: Parser = TOML.parse;
  const yaml: Parser = YAML.parse;
  const json: Parser = JSON.parse;
  const parsers: Record<Config, Parser> = {
    json,
    toml,
    yaml,
    yml: yaml,
  };
  const ts: Formatter = ({ module, obj }) =>
    `// Auto-generated from ${module}\n\nexport default ${JSON5.stringify(obj, null, 2)}\n`;

  const modules =
    args.files ??
    walkSync(args.indir, {
      globs: [`${args.recursive ? "**/*" : "*"}.${CONFIG_GLOB}`],
    });
  if (modules.length === 0) {
    throw new Error("No input files found");
  }

  for (const module of modules) {
    const ext = module.substring(module.lastIndexOf(".") + 1);
    const parser = parsers[ext as Config];
    if (!parser) {
      throw new Error(`Invalid filename (expected base.ext): ${module}`);
    }
    const path = join(args.indir, module);
    const input = readFileSync(path, { encoding: "utf-8" });
    const obj = parser(input);
    const output = ts({ module, obj });
    const outputPath = join(args.outdir, `${module}.ts`);
    writeOutput({ ...args, path, outputPath, output });
  }
}

// --------------------------------------------------------------------

function writeOutput(
  args: Args & { path: string; outputPath: string; output: string },
) {
  if (args.list) {
    process.stdout.write(`${args.outputPath}\n`);
  }
  if (args.print) {
    process.stdout.write(args.output);
  } else if (!args.list) {
    process.stderr.write(`${args.path} → ${args.outputPath}\n`);
    mkdirSync(dirname(args.outputPath), { recursive: true });
    writeFileSync(args.outputPath, args.output);
  }
}
