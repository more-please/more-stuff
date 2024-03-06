#!/usr/bin/env tsx

import * as TOML from "smol-toml";
import * as YAML from "yaml";
import { parseArgs } from "node:util";
import { join } from "node:path";
import walkSync from "walk-sync";
import { writeFileSync } from "node:fs";
import { resolve } from "import-meta-resolve";
import { pathToFileURL } from "node:url";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    dir: { type: "string", short: "d" },
    out: { type: "string", short: "o" },
    recursive: { type: "boolean", short: "r" },
  },
});

const dir = values.dir ?? ".";
const out = values.out ?? dir;

type Converter = (props: { module: string; obj: unknown }) => string;

const toml: Converter = ({ module, obj }) =>
  `# Auto-generated from ${module}\n\n${TOML.stringify(obj)}\n`;

const yaml: Converter = ({ module, obj }) =>
  `# Auto-generated from ${module}\n\n${YAML.stringify(obj)}`;

const json: Converter = ({ obj }) => JSON.stringify(obj, undefined, 2);

const CONVERTERS: Record<string, Converter> = {
  json,
  toml,
  yaml,
  yml: yaml,
};

const GLOB = `${values.recursive ? "**/*" : "*"}.{json,toml,yaml,yml}.{js,ts}`;

const ROOT = pathToFileURL(process.cwd()).href + "/";

for await (const module of walkSync(dir, { globs: [GLOB] })) {
  const config = module.substring(0, module.lastIndexOf("."));
  const ext = config.substring(config.lastIndexOf(".") + 1);
  const converter = CONVERTERS[ext];
  if (!converter) {
    continue;
  }
  const path = join(dir, module);
  const resolved = resolve(`./${path}`, ROOT);
  const { default: obj } = await import(resolved);
  const output = converter({ module, obj });
  const outputPath = join(out, config);
  writeFileSync(outputPath, output);
  console.log(outputPath);
}
