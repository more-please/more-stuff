#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  formatDiagnostic,
  type Shader,
  stageOf,
  type Target,
  validate,
} from "./glslang.ts";

const USAGE = `Usage: glslang [--target webgl1|webgl2] FILE...

Validates GLSL ES shaders for WebGL. Each file's stage is its extension's:
.vert or .vs for a vertex shader, .frag or .fs for a fragment shader. Files
with the same name but for the extension are linked as one program, and the
program is checked against the target's limits (webgl2 by default).`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    target: { type: "string", default: "webgl2" },
    help: { type: "boolean", short: "h" },
  },
});

const target = values.target as Target;
if (values.help || positionals.length === 0) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 2);
}
if (target !== "webgl1" && target !== "webgl2") {
  console.error(`glslang: unknown target ${target}\n\n${USAGE}`);
  process.exit(2);
}

const programs = new Map<string, Shader[]>();
for (const path of positionals) {
  if (!stageOf(path)) {
    console.error(`glslang: ${path}: no stage from its extension`);
    process.exit(2);
  }
  const key = path.replace(/\.[^./]+$/, "");
  const shader = { name: path, source: readFileSync(path, "utf8") };
  programs.set(key, [...(programs.get(key) ?? []), shader]);
}

let failed = false;
for (const [program, shaders] of programs) {
  const result = await validate(shaders, { target });
  for (const diagnostic of result.diagnostics) {
    // A diagnostic about the program as a whole is named for it.
    console.error(
      formatDiagnostic({ ...diagnostic, name: diagnostic.name ?? program }),
    );
  }
  failed ||= !result.ok;
}
process.exit(failed ? 1 : 0);
